import { IsString, IsOptional, IsBoolean, IsNumber, IsIn, IsArray } from 'class-validator';

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
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class CreateOwnerCafeDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
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
