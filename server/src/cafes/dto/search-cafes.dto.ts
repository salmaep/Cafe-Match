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
  @Max(10000)
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
  @IsIn(['$', '$$', '$$$'])
  priceRange?: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(100)
  limit?: number = 50;
}
