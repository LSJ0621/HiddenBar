import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import ms from 'ms';
import { User } from '../entities/user.entity.js';
import { Account } from '../entities/account.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { AuthProvider, Role } from '@my-project/shared';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';
import {
  AuthResponse,
  SocialAuthResponse,
  TokenPair,
} from './types/auth-response.type.js';
import { GoogleOAuthClient } from './clients/google-oauth.client.js';
import { EmailVerificationService } from './email-verification.service.js';
import { EmailVerificationPurpose } from './constants/email-verification.constants.js';
import { toUserInfo } from '../common/utils/user-mapper.js';
import { BCRYPT_SALT_ROUNDS } from '../common/config/configuration.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly googleOAuthClient: GoogleOAuthClient,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * 이메일 회원가입. 사용자와 이메일 계정을 생성하고 토큰을 발급한다.
   */
  async signup(dto: SignupDto): Promise<AuthResponse> {
    const { email, purpose } =
      this.emailVerificationService.validateVerificationToken(
        dto.verificationToken,
      );

    if (purpose !== EmailVerificationPurpose.SIGNUP) {
      throw new UnauthorizedException('Invalid verification token.');
    }

    if (email !== dto.email) {
      throw new UnauthorizedException(
        'Verified email does not match the requested email.',
      );
    }

    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('This email is already registered.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: Role.USER,
    });
    const savedUser = await this.userRepository.save(user);

    await this.accountRepository.save(
      this.accountRepository.create({
        userId: savedUser.id,
        provider: AuthProvider.EMAIL,
        providerAccountId: savedUser.email,
      }),
    );

    const tokens = this.generateTokens(savedUser);
    await this.saveRefreshToken(savedUser.id, tokens.refreshToken);

    return { ...tokens, user: toUserInfo(savedUser) };
  }

  /**
   * 이메일 로그인. 자격증명을 검증하고 토큰을 발급한다.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      this.logger.warn({ event: 'login_failed', email: dto.email, reason: 'user_not_found' }, 'Security event');
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    if (!user.isActive) {
      this.logger.warn({ event: 'login_failed', email: dto.email, reason: 'account_suspended' }, 'Security event');
      throw new ForbiddenException('This account has been suspended.');
    }

    if (user.passwordHash === null) {
      this.logger.warn({ event: 'login_failed', email: dto.email, reason: 'social_account' }, 'Security event');
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      this.logger.warn({ event: 'login_failed', email: dto.email, reason: 'invalid_credentials' }, 'Security event');
      throw new UnauthorizedException(
        'Invalid email or password.',
      );
    }

    await this.refreshTokenRepository.delete({ userId: user.id });

    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { ...tokens, user: toUserInfo(user) };
  }

  /**
   * Google OAuth 로그인. authorization code로 Google 프로필을 조회하고 사용자를 생성/조회한다.
   */
  async googleLogin(code: string): Promise<SocialAuthResponse> {
    const accessToken = await this.googleOAuthClient.getAccessToken(code);
    const googleProfile =
      await this.googleOAuthClient.getUserProfile(accessToken);

    let account = await this.accountRepository.findOne({
      where: {
        provider: AuthProvider.GOOGLE,
        providerAccountId: googleProfile.id,
      },
    });

    let user: User;
    let isNewUser = false;

    if (account) {
      user = await this.userRepository.findOneOrFail({
        where: { id: account.userId },
      });

      if (!user.isActive) {
        throw new ForbiddenException('This account has been suspended.');
      }
    } else {
      user = (await this.userRepository.findOne({
        where: { email: googleProfile.email },
      })) as User;

      if (user) {
        if (!user.isActive) {
          throw new ForbiddenException('This account has been suspended.');
        }
      } else {
        user = await this.userRepository.save(
          this.userRepository.create({
            email: googleProfile.email,
            passwordHash: null,
            name: googleProfile.name,
            profileImage: googleProfile.picture ?? null,
            role: Role.USER,
          }),
        );
        isNewUser = true;
      }

      account = await this.accountRepository.save(
        this.accountRepository.create({
          userId: user.id,
          provider: AuthProvider.GOOGLE,
          providerAccountId: googleProfile.id,
        }),
      );
    }

    await this.refreshTokenRepository.delete({ userId: user.id });
    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { ...tokens, user: toUserInfo(user), isNewUser };
  }

  /**
   * Refresh Token Rotation. 기존 토큰을 삭제하고 새로운 토큰 쌍을 발급한다.
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (!tokenRecord) {
      this.logger.warn({ event: 'refresh_failed', reason: 'token_not_found' }, 'Security event');
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (new Date() > tokenRecord.expiresAt) {
      await this.refreshTokenRepository.delete({ id: tokenRecord.id });
      this.logger.warn({ event: 'refresh_failed', reason: 'token_expired' }, 'Security event');
      throw new UnauthorizedException('Refresh token has expired.');
    }

    const user = await this.userRepository.findOne({
      where: { id: tokenRecord.userId },
    });

    if (!user || !user.isActive) {
      this.logger.warn({ event: 'refresh_failed', reason: 'invalid_user', userId: tokenRecord.userId }, 'Security event');
      throw new UnauthorizedException('Invalid user.');
    }

    await this.refreshTokenRepository.delete({ id: tokenRecord.id });

    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * 로그아웃. 리프레시 토큰을 삭제한다.
   */
  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.delete({ token: refreshToken });
  }

  private generateTokens(user: User): TokenPair {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('jwt.refreshExpiration', '7d'),
    });
    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: number,
    token: string,
  ): Promise<RefreshToken> {
    const expiresAt = new Date();
    const refreshExpiration =
      this.configService.get<string>('jwt.refreshExpiration') ?? '7d';
    const milliseconds = ms(refreshExpiration as ms.StringValue) || ms('7d');
    expiresAt.setTime(expiresAt.getTime() + milliseconds);

    return this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({ userId, token, expiresAt }),
    );
  }

}
