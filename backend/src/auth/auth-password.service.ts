import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity.js';
import { BCRYPT_SALT_ROUNDS } from '../common/config/configuration.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { EmailVerificationService } from './email-verification.service.js';
import { EmailVerificationPurpose } from './constants/email-verification.constants.js';

@Injectable()
export class AuthPasswordService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * 비밀번호를 재설정한다.
   * verificationToken을 검증하고, 비밀번호를 해시 업데이트하며, 모든 리프레시 토큰을 삭제한다.
   */
  async resetPassword(
    verificationToken: string,
    newPassword: string,
  ): Promise<void> {
    const { email, purpose } =
      this.emailVerificationService.validateVerificationToken(
        verificationToken,
      );

    if (purpose !== EmailVerificationPurpose.RESET_PASSWORD) {
      throw new UnauthorizedException('Invalid verification token.');
    }

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // 소셜 로그인 계정은 비밀번호 재설정 불가 (defense in depth)
    if (user.passwordHash === null) {
      throw new ForbiddenException(
        'Social login accounts cannot reset password. Please sign in with your social account.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepository.update(user.id, { passwordHash });

    await this.refreshTokenRepository.delete({ userId: user.id });
  }
}
