import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsUrl,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMenuItemDto } from './create-menu-item.dto.js';
import { CreateOperatingHoursDto } from './create-operating-hours.dto.js';

/**
 * 가게 등록 DTO.
 */
export class CreateBarDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MaxLength(255)
  address: string;

  @IsString()
  @MaxLength(50)
  city: string;

  @IsString()
  @MaxLength(50)
  country: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemDto)
  menuItems?: CreateMenuItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOperatingHoursDto)
  operatingHours?: CreateOperatingHoursDto[];
}
