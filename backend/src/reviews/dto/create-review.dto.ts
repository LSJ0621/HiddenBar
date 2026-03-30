import {
  IsInt,
  IsPositive,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  Min,
  Max,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';

@ValidatorConstraint({ name: 'isNotFutureDate', async: false })
class IsNotFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) return true;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return new Date(value) <= today;
  }

  defaultMessage(): string {
    return 'visitedAt must not be a future date.';
  }
}

/**
 * 리뷰 생성 DTO.
 */
export class CreateReviewDto {
  @IsInt()
  @IsPositive()
  barId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsDateString()
  @Validate(IsNotFutureDateConstraint)
  visitedAt?: string;
}
