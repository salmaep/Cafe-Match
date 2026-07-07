import { IsString, Length, Matches } from 'class-validator';

export class Verify2faDto {
  @IsString()
  @Length(36, 36)
  otpId: string;

  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'Kode OTP harus 4–8 digit angka.' })
  code: string;
}

export class Resend2faDto {
  @IsString()
  @Length(36, 36)
  otpId: string;
}
