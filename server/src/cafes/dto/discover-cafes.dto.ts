import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsPositive,
  IsString,
  IsIn,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class DiscoverCafesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
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
  @IsPositive()
  @Max(50000000)
  radius?: number = 2000;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  purposeId?: number;

  @IsOptional()
  @IsIn(['$', '$$', '$$$'])
  priceRange?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string')
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return undefined;
  })
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(20)
  limit?: number = 7;
}
