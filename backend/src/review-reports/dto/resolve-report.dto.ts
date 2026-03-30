import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportResolution } from '@my-project/shared';

/**
 * 관리자 신고 처리 DTO.
 */
export class ResolveReportDto {
  @IsEnum(ReportResolution)
  action: ReportResolution;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
