import { IsEmail, IsEnum } from 'class-validator';
import { EmailVerificationPurpose } from '../constants/email-verification.constants.js';

/**
 * 인증 코드 발송 요청 DTO.
 */
export class SendCodeDto {
  @IsEmail()
  email: string;

  @IsEnum(EmailVerificationPurpose)
  purpose: EmailVerificationPurpose;
}
