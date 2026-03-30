import { IsOptional, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminActionType } from '@my-project/shared';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

/**
 * 관리자 감사 로그 목록 조회 쿼리 DTO.
 */
export class AdminActionsQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(AdminActionType)
  actionType?: AdminActionType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  adminId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  targetId?: number;
}
