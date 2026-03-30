import { IsOptional, IsEnum, IsString } from 'class-validator';
import { BarStatus, AdminBarsSortBy } from '@my-project/shared';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

/**
 * 관리자 가게 목록 조회 쿼리 DTO.
 */
export class AdminBarsQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(BarStatus)
  status?: BarStatus;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(AdminBarsSortBy)
  sortBy?: AdminBarsSortBy = AdminBarsSortBy.NEWEST;
}
