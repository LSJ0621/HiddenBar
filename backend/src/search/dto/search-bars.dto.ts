import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { SearchSortBy } from '@my-project/shared';

/**
 * lat/lng 쌍 유효성 검증.
 * lat 제공 시 lng도 필수, 반대도 동일.
 */
@ValidatorConstraint({ name: 'latLngPair', async: false })
export class LatLngPairValidator implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as SearchBarsDto;
    const hasLat = obj.lat !== undefined && obj.lat !== null;
    const hasLng = obj.lng !== undefined && obj.lng !== null;
    return hasLat === hasLng;
  }

  defaultMessage(): string {
    return 'Both lat and lng must be provided together.';
  }
}

/**
 * 바 검색 Query DTO.
 * 검색 모드: 주소만(lat+lng), 이름만(name), 주소+이름(lat+lng+name), 일반(sortBy).
 */
export class SearchBarsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Validate(LatLngPairValidator)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  userLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  userLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radiusKm?: number = 5;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 5;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  /** 일반 목록 정렬용 (홈페이지 호환). 검색 모드에서는 무시된다. */
  @IsOptional()
  @IsEnum(SearchSortBy)
  sortBy?: SearchSortBy;
}
