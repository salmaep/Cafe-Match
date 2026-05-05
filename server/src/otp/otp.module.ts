import { Module } from '@nestjs/common';
import { OtpClient } from './otp.client';

@Module({
  providers: [OtpClient],
  exports: [OtpClient],
})
export class OtpModule {}
