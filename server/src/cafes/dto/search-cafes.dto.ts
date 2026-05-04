import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsPositive,
  IsString,
  IsIn,
  IsBooleanString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchCafesDto {
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
  @Max(50000000) // DEV: allow large radius for testing (was 10000 = 10km)
  radius?: number = 2000;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  purposeId?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsBooleanString()
  wifiAvailable?: string;

  @IsOptional()
  @IsBooleanString()
  hasMushola?: string;

  @IsOptional()
  @IsBooleanString()
  hasParking?: string;

  @IsOptional()
  @IsIn(['$', '$$', '$$$'])
  priceRange?: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(2000) // DEV: raised from 100 for testing — show all ~553 cafes on map
  limit?: number = 50;
}
