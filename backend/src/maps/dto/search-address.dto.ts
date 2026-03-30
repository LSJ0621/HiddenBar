import { IsString, IsOptional, MinLength } from 'class-validator';

export class SearchAddressDto {
  @IsString()
  @MinLength(1)
  query: string;

  @IsOptional()
  @IsString()
  language?: string;
}
