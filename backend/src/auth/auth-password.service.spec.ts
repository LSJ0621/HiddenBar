import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../common/config/configuration.js';
import { AuthPasswordService } from './auth-password.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { User } from '../entities/user.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { EmailVerificationPurpose } from './constants/email-verification.constants.js';

jest.mock('bcrypt');

const mockUserRepository = () => ({
  findOne: jest.fn(),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
});

const mockRefreshTokenRepository = () => ({
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
});

const mockEmailVerificationService = () => ({
  validateVerificationToken: jest.fn(),
});

describe('AuthPasswordService', () => {
  let service: AuthPasswordService;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let refreshTokenRepo: ReturnType<typeof mockRefreshTokenRepository>;
  let emailVerificationService: ReturnType<
    typeof mockEmailVerificationService
  >;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPasswordService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        {
          provide: getRepositoryToken(RefreshToken),
          useFactory: mockRefreshTokenRepository,
        },
        {
          provide: EmailVerificationService,
          useFactory: mockEmailVerificationService,
        },
      ],
    }).compile();

    service = module.get<AuthPasswordService>(AuthPasswordService);
    userRepo = module.get(getRepositoryToken(User));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
    emailVerificationService = module.get(EmailVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resetPassword', () => {
    const mockUser = { id: 1, email: 'test@example.com', passwordHash: 'existing-hash' };

    it('should reset password and delete all refresh tokens', async () => {
      emailVerificationService.validateVerificationToken.mockReturnValue({
        email: 'test@example.com',
        purpose: EmailVerificationPurpose.RESET_PASSWORD,
      });
      userRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-pw');

      await service.resetPassword('valid-token', 'newPassword1');

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword1', BCRYPT_SALT_ROUNDS);
      expect(userRepo.update).toHaveBeenCalledWith(1, {
        passwordHash: 'new-hashed-pw',
      });
      expect(refreshTokenRepo.delete).toHaveBeenCalledWith({ userId: 1 });
    });

    it('should throw UnauthorizedException when purpose is not RESET_PASSWORD', async () => {
      emailVerificationService.validateVerificationToken.mockReturnValue({
        email: 'test@example.com',
        purpose: EmailVerificationPurpose.SIGNUP,
      });

      await expect(
        service.resetPassword('wrong-purpose-token', 'newPassword1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException when user not found', async () => {
      emailVerificationService.validateVerificationToken.mockReturnValue({
        email: 'nonexistent@example.com',
        purpose: EmailVerificationPurpose.RESET_PASSWORD,
      });
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword('valid-token', 'newPassword1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is a social login account (passwordHash is null)', async () => {
      emailVerificationService.validateVerificationToken.mockReturnValue({
        email: 'social@example.com',
        purpose: EmailVerificationPurpose.RESET_PASSWORD,
      });
      userRepo.findOne.mockResolvedValue({
        id: 2,
        email: 'social@example.com',
        passwordHash: null,
      });

      await expect(
        service.resetPassword('valid-token', 'newPassword1'),
      ).rejects.toThrow(ForbiddenException);

      expect(userRepo.update).not.toHaveBeenCalled();
      expect(refreshTokenRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      emailVerificationService.validateVerificationToken.mockImplementation(
        () => {
          throw new UnauthorizedException('Invalid authentication token.');
        },
      );

      await expect(
        service.resetPassword('invalid-token', 'newPassword1'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
