import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @Length(36, 36)
  otpId: string;

  @IsString()
  @Matches(/^\d{4,8}$/, { message: 'Kode OTP harus 4–8 digit angka.' })
  code: string;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Password harus ada huruf besar, huruf kecil, dan angka.',
  })
  newPassword: string;
}
