import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewsDistributionDto {
  @IsNumber() oneStar: number;
  @IsNumber() twoStar: number;
  @IsNumber() threeStar: number;
  @IsNumber() fourStar: number;
  @IsNumber() fiveStar: number;
}

export class PaymentDto {
  @IsBoolean() cash: boolean;
  @IsBoolean() debitCard: boolean;
  @IsBoolean() creditCard: boolean;
  @IsBoolean() qris: boolean;
  @IsBoolean() nfc: boolean;
  @IsBoolean() ewallet: boolean;
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

  @IsOptional() @IsObject() openingHours: Record<string, { open: string; close: string }> | null;
  @IsOptional() @IsString() description: string | null;
  @IsArray() @IsString({ each: true }) features: string[];

  @IsOptional() @IsString() coverImage: string | null;
  @IsNumber() rating: number;
  @IsNumber() totalReviews: number;

  @IsOptional() @ValidateNested() @Type(() => ReviewsDistributionDto)
  reviewsDistribution: ReviewsDistributionDto | null;

  @IsOptional() @IsString() website: string | null;
  @IsOptional() @IsString() urlGoogleMaps: string | null;
  @IsString() @IsNotEmpty() googlePlaceId: string;

  @IsOptional() @IsString() status: string;
  @IsOptional() @IsBoolean() claimed: boolean;
  @IsBoolean() wifiAvailable: boolean;
  @IsBoolean() hasParking: boolean;

  @IsOptional() @ValidateNested() @Type(() => PaymentDto)
  payment: PaymentDto | null;

  @IsOptional() @IsString() pricing: string | null;
  @IsArray() @IsString({ each: true }) gallery: string[];

  @IsOptional() @ValidateNested() @Type(() => MenuDto)
  menu: MenuDto | null;

  @IsOptional() @IsString() city: string | null;
  @IsOptional() @IsString() district: string | null;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => GoogleReviewDto)
  reviews: GoogleReviewDto[];
}
