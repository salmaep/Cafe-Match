import { IsString, IsOptional, IsArray, ValidateNested, IsInt, Min, Max, MaxLength, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class RatingDto {
  @IsString()
  category: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score: number;
}

export class MediaDto {
  @IsIn(['photo', 'video'])
  mediaType: 'photo' | 'video';

  @IsString()
  url: string;
}

export class CreateReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RatingDto)
  ratings: RatingDto[];

  /** Optional media — max 5 photos + 2 videos enforced server-side */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  media?: MediaDto[];
}

export class UpdateReviewDto extends CreateReviewDto {}
