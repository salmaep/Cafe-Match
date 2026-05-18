import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FeatureItemDto {
  @IsString() @IsNotEmpty() name: string;

  @IsOptional() @IsString() category?: string;
}

export class PurposeScoreDto {
  /** Must match purposes.slug exactly. */
  @IsString() @IsNotEmpty() slug: string;

  /** AI-computed match score 0-100. <1 is treated as no match (skipped). */
  @IsNumber() score: number;
}

export class ReviewsDistributionDto {
  @IsNumber() oneStar: number;
  @IsNumber() twoStar: number;
  @IsNumber() threeStar: number;
  @IsNumber() fourStar: number;
  @IsNumber() fiveStar: number;
}

export class MenuDto {
  @IsArray() @IsString({ each: true }) items: string[];
  @IsArray() @IsString({ each: true }) photos: string[];
}

export class GuestDto {
  @IsString() name: string;
  @IsOptional() @IsString() image: string | null;
}

export class GoogleReviewDto {
  @IsNumber() rating: number;
  @IsOptional() @IsString() comment: string | null;
  @IsOptional() @IsString() photoUrl: string | null;
  @ValidateNested() @Type(() => GuestDto) guest: GuestDto;
}

export class SyncCafeDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() address: string;
  @IsOptional() @IsString() phone: string | null;
  @IsOptional() @IsString() category: string | null;

  @IsArray() @IsNumber({}, { each: true }) location: [number, number];

  // Frontend pre-processes to final DB format:
  // { mon: "09:00-23:00", sun: "Closed" }
  @IsOptional()
  @IsObject()
  openingHours: Record<string, string> | null;

  @IsOptional() @IsString() description: string | null;

  // All features as raw strings + optional category. Server stores as-is.
  // Replaces the old `features: string[]` + `payment` + `wifiAvailable`/`hasParking` fields.
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureItemDto)
  features: FeatureItemDto[];

  @IsOptional() @IsString() coverImage: string | null;
  @IsNumber() rating: number;
  @IsNumber() totalReviews: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReviewsDistributionDto)
  reviewsDistribution: ReviewsDistributionDto | null;

  @IsOptional() @IsString() website: string | null;
  @IsOptional() @IsString() urlGoogleMaps: string | null;
  @IsString() @IsNotEmpty() googlePlaceId: string;

  @IsOptional() @IsString() status: string;
  @IsOptional() @IsBoolean() claimed: boolean;

  // Frontend supplies enum directly (no Rp string parsing on server)
  @IsOptional()
  @IsEnum(['$', '$$', '$$$'])
  priceRange: '$' | '$$' | '$$$' | null;

  // Raw price label from scraper (e.g. "Rp 25", "Rp 30-50") for display.
  // Stored as-is in cafes.pricing_raw, not parsed.
  @IsOptional()
  @IsString()
  pricingRaw: string | null;

  @IsArray() @IsString({ each: true }) gallery: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => MenuDto)
  menu: MenuDto | null;

  @IsOptional() @IsString() city: string | null;
  @IsOptional() @IsString() district: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoogleReviewDto)
  reviews: GoogleReviewDto[];

  // AI-computed purpose match scores. Server replaces cafe_purpose_tags wholesale
  // for this cafe. If omitted, existing tags remain untouched.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurposeScoreDto)
  purposeScores?: PurposeScoreDto[];
}
