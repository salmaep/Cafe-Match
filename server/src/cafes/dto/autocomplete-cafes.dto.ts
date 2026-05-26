import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsPositive,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AutocompleteCafesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q!: string;

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
  @IsPositive()
  @Max(10)
  limit?: number = 8;
}
