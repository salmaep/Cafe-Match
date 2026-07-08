import { IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinTableDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;
}
