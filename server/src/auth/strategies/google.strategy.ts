import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(config: ConfigService) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID') || 'unset';
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET') || 'unset';
    const callbackURL =
      config.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3084/api/v1/auth/google/callback';
    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('Google profile missing email'), undefined);
    }
    const user = {
      provider: 'google' as const,
      providerId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0],
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, user);
  }
}
