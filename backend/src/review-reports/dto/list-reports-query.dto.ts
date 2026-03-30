import { IsOptional, IsEnum, IsInt, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';
import { ReportStatus } from '@my-project/shared';

/**
 * 관리자 신고 목록 조회 쿼리 DTO.
 */
export class ListReportsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}
