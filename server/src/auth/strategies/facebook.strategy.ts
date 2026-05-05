import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, Profile } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('FB_APP_ID') || 'unset',
      clientSecret: config.get<string>('FB_APP_SECRET') || 'unset',
      callbackURL:
        config.get<string>('FB_CALLBACK_URL') ||
        'http://localhost:3084/api/v1/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'emails', 'photos'],
      scope: ['email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: any, user: any) => void,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('Facebook profile missing email'), null);
    }
    done(null, {
      provider: 'facebook' as const,
      providerId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0],
      avatarUrl: profile.photos?.[0]?.value,
    });
  }
}
