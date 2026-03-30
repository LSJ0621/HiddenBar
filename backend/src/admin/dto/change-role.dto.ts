import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Role } from '@my-project/shared';

/**
 * 유저 역할 변경 DTO.
 */
export class ChangeRoleDto {
  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
