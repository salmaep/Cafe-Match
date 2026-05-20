import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDeletionRequestDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  friendCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsBoolean()
  acknowledge: boolean;
}
