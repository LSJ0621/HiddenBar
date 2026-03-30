import { IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { EmailVerificationPurpose } from '../constants/email-verification.constants.js';

/**
 * 인증 코드 검증 요청 DTO.
 */
export class VerifyCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;

  @IsEnum(EmailVerificationPurpose)
  purpose: EmailVerificationPurpose;
}
