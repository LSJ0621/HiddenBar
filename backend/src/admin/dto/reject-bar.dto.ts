import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * 가게 거절 DTO. 거절 사유는 필수 (10자 이상).
 */
export class RejectBarDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;
}
