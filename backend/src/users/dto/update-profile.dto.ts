import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

/**
 * 프로필 수정 요청 DTO.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name?: string;
}
