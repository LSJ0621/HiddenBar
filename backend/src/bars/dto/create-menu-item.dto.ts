import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * 메뉴 아이템 생성 DTO.
 */
export class CreateMenuItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsIn(['USD'])
  currency?: string;
}
