import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { BarStatus } from '@my-project/shared';

/**
 * 내 가게 목록 조회 쿼리 DTO.
 */
export class MyBarsQueryDto {
  @IsOptional()
  @IsEnum(BarStatus)
  status?: BarStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
