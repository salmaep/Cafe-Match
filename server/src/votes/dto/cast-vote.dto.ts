import { IsArray, ArrayMaxSize, ArrayMinSize, IsNumber } from 'class-validator';

export class CastVoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsNumber({}, { each: true })
  purposeIds: number[];
}
