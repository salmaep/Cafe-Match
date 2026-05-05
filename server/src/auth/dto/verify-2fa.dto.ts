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

export class EnrollPhoneDto {
  @IsString()
  @Matches(/^\d{8,15}$/, { message: 'Nomor HP harus 8–15 digit, tanpa "+".' })
  phone: string;
}

export class EnrollPhoneVerifyDto {
  @IsString()
  @Length(36, 36)
  otpId: string;

  @IsString()
  @Matches(/^\d{4,8}$/)
  code: string;

  @IsString()
  @Matches(/^\d{8,15}$/)
  phone: string;
}
