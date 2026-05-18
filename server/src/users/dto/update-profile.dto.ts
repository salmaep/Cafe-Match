import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  /**
   * Avatar URL OR base64 data URL (data:image/...). Capped at ~64KB to fit the
   * MySQL TEXT column comfortably.
   */
  @IsOptional()
  @IsString()
  @MaxLength(60_000)
  avatarUrl?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password baru minimal 8 karakter.' })
  @MaxLength(72)
  @Matches(/[A-Z]/, { message: 'Password baru harus mengandung huruf besar.' })
  @Matches(/[a-z]/, { message: 'Password baru harus mengandung huruf kecil.' })
  @Matches(/[0-9]/, { message: 'Password baru harus mengandung angka.' })
  newPassword: string;
}
