import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportReason } from '@my-project/shared';

/**
 * 리뷰 신고 접수 DTO.
 */
export class CreateReportDto {
  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  detail?: string;
}
