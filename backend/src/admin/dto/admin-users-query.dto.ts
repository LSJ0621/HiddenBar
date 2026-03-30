import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@my-project/shared';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

/**
 * 관리자 유저 목록 조회 쿼리 DTO.
 */
export class AdminUsersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;
}
