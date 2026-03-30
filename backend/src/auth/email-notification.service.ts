import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailVerificationPurpose } from './constants/email-verification.constants.js';

@Injectable()
export class EmailNotificationService {
  constructor(private readonly mailerService: MailerService) {}

  /**
   * 인증 코드 이메일을 발송한다.
   */
  async sendVerificationCode(
    email: string,
    code: string,
    purpose: EmailVerificationPurpose,
  ): Promise<void> {
    const subject =
      purpose === EmailVerificationPurpose.SIGNUP
        ? '[HiddenBar] Signup Verification Code'
        : '[HiddenBar] Password Reset Verification Code';

    await this.mailerService.sendMail({
      to: email,
      subject,
      template: 'verification-code',
      context: {
        code,
        purpose,
        title:
          purpose === EmailVerificationPurpose.SIGNUP
            ? 'Signup Verification Code'
            : 'Password Reset Verification Code',
        expirationMinutes: 3,
      },
    });
  }
}
