import { IsNumber, IsIn, IsOptional, IsString, IsArray } from 'class-validator';

export class CreatePromotionDto {
  @IsNumber()
  packageId: number;

  @IsIn(['new_cafe', 'featured_promo'])
  type: string;

  @IsIn(['monthly', 'annual'])
  @IsOptional()
  billingCycle?: string;

  @IsOptional()
  @IsString()
  contentTitle?: string;

  @IsOptional()
  @IsString()
  contentDescription?: string;

  @IsOptional()
  @IsString()
  contentPhotoUrl?: string;

  @IsOptional()
  @IsArray()
  highlightedFacilities?: string[];
}

export class UpdatePromotionContentDto {
  @IsOptional()
  @IsString()
  contentTitle?: string;

  @IsOptional()
  @IsString()
  contentDescription?: string;

  @IsOptional()
  @IsString()
  contentPhotoUrl?: string;

  @IsOptional()
  @IsArray()
  highlightedFacilities?: string[];
}
