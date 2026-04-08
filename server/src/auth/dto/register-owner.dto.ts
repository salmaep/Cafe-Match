import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterOwnerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  cafeName: string;

  @IsString()
  cafeAddress: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
