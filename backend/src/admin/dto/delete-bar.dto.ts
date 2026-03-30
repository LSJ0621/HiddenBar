import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 가게 삭제 DTO.
 */
export class DeleteBarDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
