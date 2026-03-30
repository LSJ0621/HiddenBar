import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { User } from '../entities/user.entity.js';
import { Account } from '../entities/account.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { Role, AuthProvider } from '@my-project/shared';
import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../common/config/configuration.js';
import { GoogleOAuthClient } from './clients/google-oauth.client.js';
import { EmailVerificationService } from './email-verification.service.js';
import { EmailVerificationPurpose } from './constants/email-verification.constants.js';

jest.mock('bcrypt');

const mockGoogleOAuthClient = () => ({
  getAccessToken: jest.fn(),
  getUserProfile: jest.fn(),
});

const mockEmailVerificationService = () => ({
  validateVerificationToken: jest.fn().mockReturnValue({
    email: 'test@example.com',
    purpose: EmailVerificationPurpose.SIGNUP,
  }),
  sendCode: jest.fn(),
  verifyCode: jest.fn(),
});

const mockUserRepository = () => ({
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
});

const mockAccountRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
});

const mockRefreshTokenRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn((dto) => dto),
  save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof mockUserRepository>;
  let accountRepo: ReturnType<typeof mockAccountRepository>;
  let refreshTokenRepo: ReturnType<typeof mockRefreshTokenRepository>;
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let googleOAuthClient: ReturnType<typeof mockGoogleOAuthClient>;
  let emailVerificationService: ReturnType<
    typeof mockEmailVerificationService
  >;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        {
          provide: getRepositoryToken(Account),
          useFactory: mockAccountRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useFactory: mockRefreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'jwt.secret': 'test-secret',
                'jwt.accessExpiration': '15m',
                'jwt.refreshExpiration': '7d',
              };
              return map[key];
            }),
          },
        },
        { provide: GoogleOAuthClient, useFactory: mockGoogleOAuthClient },
        {
          provide: EmailVerificationService,
          useFactory: mockEmailVerificationService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    accountRepo = module.get(getRepositoryToken(Account));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    googleOAuthClient = module.get(GoogleOAuthClient);
    emailVerificationService = module.get(EmailVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── signup ─────────────────────────────────────────────

  describe('signup', () => {
    const signupDto = {
      email: 'test@example.com',
      password: 'password1',
      name: 'Test',
      verificationToken: 'valid-verification-token',
    };

    it('should create user with hashed password and return tokens', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      userRepo.save.mockResolvedValue({
        id: 1,
        email: signupDto.email,
        passwordHash: 'hashed-pw',
        name: signupDto.name,
        profileImage: null,
        role: Role.USER,
      });

      const result = await service.signup(signupDto);

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user.email).toBe(signupDto.email);
    });

    it('should throw ConflictException when email already exists', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, email: signupDto.email });

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash password with bcrypt saltRounds 12', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      userRepo.save.mockResolvedValue({
        id: 1,
        email: signupDto.email,
        passwordHash: 'hashed-pw',
        name: signupDto.name,
        profileImage: null,
        role: Role.USER,
      });

      await service.signup(signupDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(signupDto.password, BCRYPT_SALT_ROUNDS);
    });

    it('should create RefreshToken record in database', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      userRepo.save.mockResolvedValue({
        id: 1,
        email: signupDto.email,
        passwordHash: 'hashed-pw',
        name: signupDto.name,
        profileImage: null,
        role: Role.USER,
      });

      await service.signup(signupDto);

      expect(refreshTokenRepo.save).toHaveBeenCalled();
    });

    it('should create Account record with EMAIL provider', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      userRepo.save.mockResolvedValue({
        id: 1,
        email: signupDto.email,
        passwordHash: 'hashed-pw',
        name: signupDto.name,
        profileImage: null,
        role: Role.USER,
      });

      await service.signup(signupDto);

      expect(accountRepo.create).toHaveBeenCalledWith({
        userId: 1,
        provider: AuthProvider.EMAIL,
        providerAccountId: signupDto.email,
      });
      expect(accountRepo.save).toHaveBeenCalled();
    });

    it('should return accessToken, refreshToken, and user object', async () => {
      userRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      userRepo.save.mockResolvedValue({
        id: 1,
        email: signupDto.email,
        passwordHash: 'hashed-pw',
        name: signupDto.name,
        profileImage: null,
        role: Role.USER,
      });

      const result = await service.signup(signupDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('name');
      expect(result.user).toHaveProperty('role');
    });
  });

  // ─── login ──────────────────────────────────────────────

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password1' };
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      passwordHash: 'hashed-pw',
      name: 'Test',
      profileImage: null,
      role: Role.USER,
      isActive: true,
    };

    it('should return tokens and user for valid credentials', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('signed-token');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException when email not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when passwordHash is null (social login account)', async () => {
      const socialUser = { ...mockUser, passwordHash: null };
      userRepo.findOne.mockResolvedValue(socialUser);

      await expect(
        service.login({ email: socialUser.email, password: 'any-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when account is inactive', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });

    it('should delete existing refresh tokens before creating new one', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login(loginDto);

      expect(refreshTokenRepo.delete).toHaveBeenCalledWith({
        userId: mockUser.id,
      });
    });
  });

  // ─── googleLogin ────────────────────────────────────────

  describe('googleLogin', () => {
    const googleProfile = {
      id: 'google-123',
      email: 'google@example.com',
      name: 'Google User',
      picture: 'https://photo.url',
    };

    beforeEach(() => {
      googleOAuthClient.getAccessToken.mockResolvedValue('mock-access-token');
      googleOAuthClient.getUserProfile.mockResolvedValue(googleProfile);
    });

    it('should return tokens for existing user with valid authorization code', async () => {
      const existingUser = {
        id: 1,
        email: googleProfile.email,
        name: googleProfile.name,
        profileImage: googleProfile.picture,
        role: Role.USER,
        isActive: true,
      };
      accountRepo.findOne.mockResolvedValue({
        userId: 1,
        provider: AuthProvider.GOOGLE,
      });
      userRepo.findOneOrFail.mockResolvedValue(existingUser);

      const result = await service.googleLogin('valid-code');

      expect(result.accessToken).toBe('signed-token');
      expect(result.isNewUser).toBe(false);
    });

    it('should create new user and account for new Google user', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockResolvedValue({
        id: 2,
        email: googleProfile.email,
        passwordHash: null,
        name: googleProfile.name,
        profileImage: googleProfile.picture,
        role: Role.USER,
        isActive: true,
      });

      const result = await service.googleLogin('valid-code');

      expect(result.isNewUser).toBe(true);
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid authorization code', async () => {
      googleOAuthClient.getAccessToken.mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(service.googleLogin('invalid-code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when existing account is inactive', async () => {
      accountRepo.findOne.mockResolvedValue({
        userId: 1,
        provider: AuthProvider.GOOGLE,
      });
      userRepo.findOneOrFail.mockResolvedValue({
        id: 1,
        email: googleProfile.email,
        isActive: false,
      });

      await expect(service.googleLogin('valid-code')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should set passwordHash to null for social login user', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockImplementation((entity) =>
        Promise.resolve({ id: 2, ...entity }),
      );

      await service.googleLogin('valid-code');

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: null }),
      );
    });

    it('should use social profile name and image for new user', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockImplementation((entity) =>
        Promise.resolve({ id: 2, ...entity }),
      );

      await service.googleLogin('valid-code');

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: googleProfile.name,
          profileImage: googleProfile.picture,
        }),
      );
    });

    it('should link Google account to existing email user and return isNewUser false', async () => {
      const existingUser = {
        id: 5,
        email: googleProfile.email,
        passwordHash: 'hashed-pw',
        name: 'Existing User',
        profileImage: null,
        role: Role.USER,
        isActive: true,
      };
      accountRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(existingUser);

      const result = await service.googleLogin('valid-code');

      expect(accountRepo.save).toHaveBeenCalled();
      expect(accountRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: existingUser.id,
          provider: AuthProvider.GOOGLE,
          providerAccountId: googleProfile.id,
        }),
      );
      expect(result.isNewUser).toBe(false);
    });

    it('should include isNewUser flag in response', async () => {
      accountRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockResolvedValue({
        id: 2,
        email: googleProfile.email,
        passwordHash: null,
        name: googleProfile.name,
        profileImage: googleProfile.picture,
        role: Role.USER,
        isActive: true,
      });

      const result = await service.googleLogin('valid-code');

      expect(result).toHaveProperty('isNewUser');
    });
  });

  // ─── refresh ────────────────────────────────────────────

  describe('refresh', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test',
      role: Role.USER,
      isActive: true,
      profileImage: null,
    };

    it('should return new token pair for valid refresh token', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 1,
        token: 'valid-rt',
        userId: 1,
        expiresAt: futureDate,
      });
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.refresh('valid-rt');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 1,
        token: 'expired-rt',
        userId: 1,
        expiresAt: pastDate,
      });

      await expect(service.refresh('expired-rt')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for non-existent refresh token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh('nonexistent-rt')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should delete old refresh token and create new one (Refresh Token Rotation)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 10,
        token: 'old-rt',
        userId: 1,
        expiresAt: futureDate,
      });
      userRepo.findOne.mockResolvedValue(mockUser);

      await service.refresh('old-rt');

      expect(refreshTokenRepo.delete).toHaveBeenCalledWith({ id: 10 });
      expect(refreshTokenRepo.save).toHaveBeenCalled();
    });

    it('should verify user isActive before issuing new tokens', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      refreshTokenRepo.findOne.mockResolvedValue({
        id: 1,
        token: 'valid-rt',
        userId: 1,
        expiresAt: futureDate,
      });
      userRepo.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.refresh('valid-rt')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── logout ─────────────────────────────────────────────

  describe('logout', () => {
    it('should delete refresh token record from database', async () => {
      await service.logout('some-rt');

      expect(refreshTokenRepo.delete).toHaveBeenCalledWith({
        token: 'some-rt',
      });
    });

    it('should return successfully even if token does not exist', async () => {
      refreshTokenRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.logout('nonexistent-rt')).resolves.toBeUndefined();
    });
  });
});
