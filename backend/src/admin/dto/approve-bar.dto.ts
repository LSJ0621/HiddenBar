import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 가게 승인 DTO.
 */
export class ApproveBarDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
