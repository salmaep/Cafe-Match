import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { UsersModule } from '../users/users.module';
import { Cafe } from '../cafes/entities/cafe.entity';
import { OtpModule } from '../otp/otp.module';

@Module({
  imports: [
    UsersModule,
    OtpModule,
    PassportModule,
    TypeOrmModule.forFeature([Cafe]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET')!,
        signOptions: { expiresIn: (configService.get<string>('JWT_EXPIRATION') ?? '7d') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, FacebookStrategy],
  exports: [AuthService],
})
export class AuthModule {}
