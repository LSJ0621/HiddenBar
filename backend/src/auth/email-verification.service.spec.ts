import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../common/config/configuration.js';
import { EmailVerificationService } from './email-verification.service.js';
import { EmailNotificationService } from './email-notification.service.js';
import { EmailVerification } from '../entities/email-verification.entity.js';
import { User } from '../entities/user.entity.js';
import { EmailVerificationPurpose } from './constants/email-verification.constants.js';

jest.mock('bcrypt');

const mockEmailVerificationRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  count: jest.fn().mockResolvedValue(0),
});

const mockUserRepository = () => ({
  findOne: jest.fn(),
});

const mockEmailNotificationService = () => ({
  sendVerificationCode: jest.fn().mockResolvedValue(undefined),
});

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let repo: ReturnType<typeof mockEmailVerificationRepository>;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let notificationService: ReturnType<typeof mockEmailNotificationService>;
  let jwtService: { sign: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        {
          provide: getRepositoryToken(EmailVerification),
          useFactory: mockEmailVerificationRepository,
        },
        {
          provide: getRepositoryToken(User),
          useFactory: mockUserRepository,
        },
        {
          provide: EmailNotificationService,
          useFactory: mockEmailNotificationService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('verification-jwt'),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
    repo = module.get(getRepositoryToken(EmailVerification));
    userRepo = module.get(getRepositoryToken(User));
    notificationService = module.get(EmailNotificationService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── sendCode ─────────────────────────────────────────

  describe('sendCode', () => {
    it('should delete existing records and create new one', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');

      await service.sendCode(
        'test@example.com',
        EmailVerificationPurpose.SIGNUP,
      );

      expect(repo.delete).toHaveBeenCalledWith({
        email: 'test@example.com',
        purpose: EmailVerificationPurpose.SIGNUP,
      });
      expect(repo.save).toHaveBeenCalled();
    });

    it('should send verification email with generated code', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');

      await service.sendCode(
        'test@example.com',
        EmailVerificationPurpose.SIGNUP,
      );

      expect(notificationService.sendVerificationCode).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringMatching(/^\d{6}$/),
        EmailVerificationPurpose.SIGNUP,
      );
    });

    it('should throw BadRequestException when daily limit exceeded', async () => {
      repo.count.mockResolvedValue(5);

      await expect(
        service.sendCode('test@example.com', EmailVerificationPurpose.SIGNUP),
      ).rejects.toThrow(BadRequestException);
    });

    it('should hash the generated code with bcrypt', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');

      await service.sendCode(
        'test@example.com',
        EmailVerificationPurpose.SIGNUP,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{6}$/),
        BCRYPT_SALT_ROUNDS,
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ codeHash: 'hashed-code' }),
      );
    });

    it('should silently return when RESET_PASSWORD and user does not exist (account enumeration prevention)', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await service.sendCode(
        'nonexistent@example.com',
        EmailVerificationPurpose.RESET_PASSWORD,
      );

      expect(repo.delete).not.toHaveBeenCalled();
      expect(notificationService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('should silently return when RESET_PASSWORD and user has no passwordHash (social login, account enumeration prevention)', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1,
        email: 'social@example.com',
        passwordHash: null,
      });

      await service.sendCode(
        'social@example.com',
        EmailVerificationPurpose.RESET_PASSWORD,
      );

      expect(repo.delete).not.toHaveBeenCalled();
      expect(notificationService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('should send code when RESET_PASSWORD and user exists', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, email: 'test@example.com', passwordHash: 'existing-hash' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');

      await service.sendCode(
        'test@example.com',
        EmailVerificationPurpose.RESET_PASSWORD,
      );

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(repo.save).toHaveBeenCalled();
      expect(notificationService.sendVerificationCode).toHaveBeenCalled();
    });

    it('should not check user existence for SIGNUP purpose', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');

      await service.sendCode(
        'new@example.com',
        EmailVerificationPurpose.SIGNUP,
      );

      expect(userRepo.findOne).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
    });

    it('should set expiresAt to 3 minutes from now', async () => {
      jest.useFakeTimers();
      try {
        const now = new Date('2026-04-06T00:00:00.000Z');
        jest.setSystemTime(now);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');

        await service.sendCode(
          'test@example.com',
          EmailVerificationPurpose.SIGNUP,
        );

        const savedEntity = repo.create.mock.calls[0][0];
        const expectedExpiresAt = new Date(now.getTime() + 3 * 60 * 1000);
        expect(savedEntity.expiresAt).toEqual(expectedExpiresAt);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // ─── verifyCode ───────────────────────────────────────

  describe('verifyCode', () => {
    const futureDate = new Date(Date.now() + 3 * 60 * 1000);

    it('should return verificationToken on valid code', async () => {
      repo.findOne.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        codeHash: 'hashed-code',
        purpose: EmailVerificationPurpose.SIGNUP,
        expiresAt: futureDate,
        isUsed: false,
        failCount: 0,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyCode(
        'test@example.com',
        '123456',
        EmailVerificationPurpose.SIGNUP,
      );

      expect(result.verificationToken).toBe('verification-jwt');
      expect(repo.update).toHaveBeenCalledWith(1, { isUsed: true });
    });

    it('should throw BadRequestException when no record found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyCode(
          'test@example.com',
          '123456',
          EmailVerificationPurpose.SIGNUP,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when code is expired', async () => {
      const pastDate = new Date(Date.now() - 1000);
      repo.findOne.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        codeHash: 'hashed-code',
        expiresAt: pastDate,
        isUsed: false,
        failCount: 0,
      });

      await expect(
        service.verifyCode(
          'test@example.com',
          '123456',
          EmailVerificationPurpose.SIGNUP,
        ),
      ).rejects.toThrow('Verification code has expired.');
    });

    it('should throw BadRequestException when fail count exceeded', async () => {
      repo.findOne.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        codeHash: 'hashed-code',
        expiresAt: futureDate,
        isUsed: false,
        failCount: 5,
      });

      await expect(
        service.verifyCode(
          'test@example.com',
          '123456',
          EmailVerificationPurpose.SIGNUP,
        ),
      ).rejects.toThrow('Too many failed attempts. Please request a new code.');
    });

    it('should increment failCount on wrong code', async () => {
      repo.findOne.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        codeHash: 'hashed-code',
        expiresAt: futureDate,
        isUsed: false,
        failCount: 2,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.verifyCode(
          'test@example.com',
          '000000',
          EmailVerificationPurpose.SIGNUP,
        ),
      ).rejects.toThrow('Invalid verification code.');

      expect(repo.update).toHaveBeenCalledWith(1, { failCount: 3 });
    });

    it('should sign JWT with email, purpose, and type', async () => {
      repo.findOne.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        codeHash: 'hashed-code',
        purpose: EmailVerificationPurpose.SIGNUP,
        expiresAt: futureDate,
        isUsed: false,
        failCount: 0,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.verifyCode(
        'test@example.com',
        '123456',
        EmailVerificationPurpose.SIGNUP,
      );

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          purpose: EmailVerificationPurpose.SIGNUP,
          type: 'email-verification',
        },
        { expiresIn: '10m' },
      );
    });
  });

  // ─── validateVerificationToken ────────────────────────

  describe('validateVerificationToken', () => {
    it('should return email and purpose for valid token', () => {
      jwtService.verify.mockReturnValue({
        email: 'test@example.com',
        purpose: EmailVerificationPurpose.SIGNUP,
        type: 'email-verification',
      });

      const result = service.validateVerificationToken('valid-token');

      expect(result.email).toBe('test@example.com');
      expect(result.purpose).toBe(EmailVerificationPurpose.SIGNUP);
    });

    it('should throw UnauthorizedException for invalid token', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      expect(() =>
        service.validateVerificationToken('invalid-token'),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when type is not email-verification', () => {
      jwtService.verify.mockReturnValue({
        email: 'test@example.com',
        purpose: EmailVerificationPurpose.SIGNUP,
        type: 'other',
      });

      expect(() =>
        service.validateVerificationToken('wrong-type-token'),
      ).toThrow(UnauthorizedException);
    });
  });
});
