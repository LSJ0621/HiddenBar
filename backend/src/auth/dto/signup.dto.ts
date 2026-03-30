import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * 이메일 회원가입 요청 DTO.
 */
export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'password must contain lowercase, uppercase letters and numbers',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name: string;

  @IsString()
  verificationToken: string;
}
