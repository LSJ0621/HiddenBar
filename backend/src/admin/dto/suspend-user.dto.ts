import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * 유저 정지 DTO. 정지 사유는 필수 (10자 이상).
 */
export class SuspendUserDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;
}
