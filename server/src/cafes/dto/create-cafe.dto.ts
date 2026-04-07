import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

class FacilityDto {
  @IsString()
  facilityKey: string;

  @IsOptional()
  @IsString()
  facilityValue?: string;
}

export class CreateCafeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  address: string;

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
  @IsString()
  googlePlaceId?: string;

  @IsOptional()
  @IsBoolean()
  wifiAvailable?: boolean;

  @IsOptional()
  @IsNumber()
  wifiSpeedMbps?: number;

  @IsOptional()
  @IsBoolean()
  hasMushola?: boolean;

  @IsOptional()
  openingHours?: Record<string, string>;

  @IsOptional()
  @IsEnum(['$', '$$', '$$$'])
  priceRange?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacilityDto)
  facilities?: FacilityDto[];
}
