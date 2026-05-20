import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DeleteAccountDto {
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  emailConfirmation?: string;

  @IsBoolean()
  acknowledge: boolean;
}
