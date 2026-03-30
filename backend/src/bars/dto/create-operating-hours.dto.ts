import {
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { DayOfWeek } from '@my-project/shared';

/**
 * 영업시간 생성 DTO.
 */
export class CreateOperatingHoursDto {
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  openTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  closeTime: string;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}
