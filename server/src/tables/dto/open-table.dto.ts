import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OpenTableDto {
  @Type(() => Number)
  @IsInt()
  cafeId: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  maxGuests?: number;

  @IsOptional()
  @IsIn(['any', 'female_only', 'male_only'])
  genderRule?: 'any' | 'female_only' | 'male_only';
}
