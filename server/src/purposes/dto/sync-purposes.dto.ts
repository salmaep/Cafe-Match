import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurposeRequirementDto {
  /** Must EXACTLY match cafe_features.name (case-sensitive). */
  @IsString()
  @IsNotEmpty()
  featureName: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  /** Weight for scoring (default 1). Range 0-100 recommended. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  weight?: number;
}

export class PurposeUpsertDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurposeRequirementDto)
  requirements: PurposeRequirementDto[];
}

export class SyncPurposesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurposeUpsertDto)
  purposes: PurposeUpsertDto[];
}
