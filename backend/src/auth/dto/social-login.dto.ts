import { IsString } from 'class-validator';

/**
 * 소셜 로그인(Google OAuth) 요청 DTO.
 */
export class SocialLoginDto {
  @IsString()
  code: string;
}
