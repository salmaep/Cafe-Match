import { Module } from '@nestjs/common';
import { MailerModule } from '../mailer/mailer.module';
import { OtpService } from './otp.service';

@Module({
  imports: [MailerModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
