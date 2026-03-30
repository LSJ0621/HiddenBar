import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { BCRYPT_SALT_ROUNDS } from '../common/config/configuration.js';
import { EmailVerification } from '../entities/email-verification.entity.js';
import { User } from '../entities/user.entity.js';
import { EmailNotificationService } from './email-notification.service.js';
import {
  EmailVerificationPurpose,
  CODE_LENGTH,
  CODE_EXPIRATION_MINUTES,
  DAILY_SEND_LIMIT,
  MAX_FAIL_COUNT,
  VERIFICATION_TOKEN_EXPIRATION_MINUTES,
} from './constants/email-verification.constants.js';

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 인증 코드를 생성하여 이메일로 발송한다.
   * 기존 같은 email+purpose 레코드를 삭제하고 새로 생성한다.
   */
  async sendCode(
    email: string,
    purpose: EmailVerificationPurpose,
  ): Promise<void> {
    if (purpose === EmailVerificationPurpose.RESET_PASSWORD) {
      const user = await this.userRepository.findOne({ where: { email } });
      // 계정 열거 방지: 미가입/소셜 계정이어도 동일 응답 (코드 발송 없이 조기 반환)
      if (!user || user.passwordHash === null) {
        return;
      }
    }

    await this.checkDailyLimit(email, purpose);

    await this.emailVerificationRepository.delete({ email, purpose });

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_SALT_ROUNDS);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRATION_MINUTES);

    await this.emailVerificationRepository.save(
      this.emailVerificationRepository.create({
        email,
        codeHash,
        purpose,
        expiresAt,
      }),
    );

    await this.emailNotificationService.sendVerificationCode(
      email,
      code,
      purpose,
    );
  }

  /**
   * 인증 코드를 검증하고, 성공 시 단기 JWT(verificationToken)를 반환한다.
   */
  async verifyCode(
    email: string,
    code: string,
    purpose: EmailVerificationPurpose,
  ): Promise<{ verificationToken: string }> {
    const record = await this.emailVerificationRepository.findOne({
      where: { email, purpose, isUsed: false },
    });

    if (!record) {
      throw new BadRequestException('Please request a verification code first.');
    }

    if (new Date() > record.expiresAt) {
      throw new BadRequestException('Verification code has expired.');
    }

    if (record.failCount >= MAX_FAIL_COUNT) {
      throw new BadRequestException(
        'Too many failed attempts. Please request a new code.',
      );
    }

    const isValid = await bcrypt.compare(code, record.codeHash);
    if (!isValid) {
      await this.emailVerificationRepository.update(record.id, {
        failCount: record.failCount + 1,
      });
      throw new BadRequestException('Invalid verification code.');
    }

    await this.emailVerificationRepository.update(record.id, { isUsed: true });

    const verificationToken = this.jwtService.sign(
      { email, purpose, type: 'email-verification' },
      { expiresIn: `${VERIFICATION_TOKEN_EXPIRATION_MINUTES}m` },
    );

    return { verificationToken };
  }

  /**
   * verificationToken을 검증하고 payload를 반환한다.
   */
  validateVerificationToken(token: string): {
    email: string;
    purpose: EmailVerificationPurpose;
  } {
    try {
      const payload = this.jwtService.verify<{
        email: string;
        purpose: EmailVerificationPurpose;
        type: string;
      }>(token);

      if (payload.type !== 'email-verification') {
        throw new UnauthorizedException('Invalid verification token.');
      }

      return { email: payload.email, purpose: payload.purpose };
    } catch {
      throw new UnauthorizedException('Invalid verification token.');
    }
  }

  /**
   * 6자리 숫자 인증 코드를 생성한다.
   */
  private generateCode(): string {
    const max = Math.pow(10, CODE_LENGTH);
    const num = crypto.randomInt(0, max);
    return num.toString().padStart(CODE_LENGTH, '0');
  }

  /**
   * 일일 발송 횟수를 확인한다.
   */
  private async checkDailyLimit(
    email: string,
    purpose: EmailVerificationPurpose,
  ): Promise<void> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.emailVerificationRepository.count({
      where: {
        email,
        purpose,
        createdAt: MoreThanOrEqual(startOfDay),
      },
    });

    if (count >= DAILY_SEND_LIMIT) {
      throw new BadRequestException(
        'Daily verification code send limit exceeded.',
      );
    }
  }
}
