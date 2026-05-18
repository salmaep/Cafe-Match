import {
  IsOptional,
  IsNumber,
  IsPositive,
  IsString,
  IsNotEmpty,
  IsIn,
  IsArray,
  Max,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SemanticSearchDto {
  // Natural language query — the main addition over SearchCafesDto
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[^<>{}\\[\]`]*$/, { message: 'q contains invalid characters' })
  q: string;

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
    if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
    return undefined;
  })
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(30)
  limit?: number = 7;

  @IsOptional()
  @IsIn(['distance', 'trending', 'rating', 'newest'])
  sort?: string;
}

export interface ParsedQuery {
  keywords: string;
  facilities: string[];
  purposeSlug: string | null;
  priceRange: '$' | '$$' | '$$$' | null;
  intent: string;
}
