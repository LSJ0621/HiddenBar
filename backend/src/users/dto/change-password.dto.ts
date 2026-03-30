import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

/**
 * 비밀번호 변경 요청 DTO.
 */
export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'newPassword must contain both letters and numbers',
  })
  newPassword: string;
}
