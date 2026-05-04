import { IsString, IsOptional, IsBoolean, IsNumber, IsIn, IsArray, MinLength, Min, Max } from 'class-validator';

export class UpdateCafeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  description?: string;

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
  @IsIn(['$', '$$', '$$$'])
  priceRange?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class CreateOwnerCafeDto {
  @IsString()
  @MinLength(2, { message: 'Cafe name must be at least 2 characters' })
  name: string;

  @IsString()
  @MinLength(5, { message: 'Address must be at least 5 characters' })
  address: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude?: number;
}

export class UpdateMenuItemDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsString()
  category: string;

  @IsString()
  itemName: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpdateMenusDto {
  @IsArray()
  items: UpdateMenuItemDto[];
}
