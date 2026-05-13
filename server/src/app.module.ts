import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'http';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CafesModule } from './cafes/cafes.module';
import { PurposesModule } from './purposes/purposes.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ShortlistsModule } from './shortlists/shortlists.module';
import { MenusModule } from './menus/menus.module';
import { PhotosModule } from './photos/photos.module';
import { VotesModule } from './votes/votes.module';
import { OwnerModule } from './owner/owner.module';
import { PromotionsModule } from './promotions/promotions.module';
import { PaymentsModule } from './payments/payments.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CheckinsModule } from './checkins/checkins.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AchievementsModule } from './achievements/achievements.module';
import { FriendsModule } from './friends/friends.module';
import { RecapsModule } from './recaps/recaps.module';
import { EventsModule } from './gateway/events.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ScraperSyncModule } from './scraper-sync/scraper-sync.module';
import { MeiliModule } from './meili/meili.module';
import { SeoModule } from './seo/seo.module';
import { HealthModule } from './health/health.module';
import { DestinationsModule } from './destinations/destinations.module';
import { SemanticSearchModule } from './semantic-search/semantic-search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            level: config.get('LOG_LEVEL') ?? (isProd ? 'info' : 'debug'),
            transport: isProd
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'SYS:HH:MM:ss.l',
                    ignore: 'pid,hostname,req.headers,res.headers',
                    singleLine: true,
                  },
                },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.currentPassword',
                'req.body.newPassword',
                'req.body.passwordHash',
                'req.body.code',
                'req.body.otp',
                'req.body.token',
                'req.body.accessToken',
                'req.body.refreshToken',
                'res.headers["set-cookie"]',
              ],
              censor: '[Redacted]',
            },
            customLogLevel: (
              _req: IncomingMessage,
              res: ServerResponse,
              err?: Error,
            ) => {
              if (err || res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
            customSuccessMessage: (
              req: IncomingMessage,
              res: ServerResponse,
              responseTime: number,
            ) =>
              `${req.method} ${req.url} ${res.statusCode} (${responseTime}ms)`,
            customErrorMessage: (
              req: IncomingMessage,
              res: ServerResponse,
              err: Error,
            ) =>
              `${req.method} ${req.url} ${res.statusCode} (${err.message})`,
            autoLogging: {
              ignore: (req: IncomingMessage) => {
                const url = req.url ?? '';
                return (
                  url.startsWith('/api/v1/health') ||
                  url === '/health' ||
                  url === '/sitemap.xml' ||
                  url === '/robots.txt'
                );
              },
            },
            serializers: {
              req: (req: { method: string; url: string; id?: string }) => ({
                method: req.method,
                url: req.url,
                id: req.id,
              }),
              res: (res: { statusCode: number }) => ({
                statusCode: res.statusCode,
              }),
            },
          },
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: false,
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      }),
    }),
    AuthModule,
    UsersModule,
    CafesModule,
    PurposesModule,
    BookmarksModule,
    FavoritesModule,
    ShortlistsModule,
    MenusModule,
    PhotosModule,
    VotesModule,
    OwnerModule,
    PromotionsModule,
    PaymentsModule,
    AnalyticsModule,
    AdminModule,
    ReviewsModule,
    CheckinsModule,
    NotificationsModule,
    AchievementsModule,
    FriendsModule,
    RecapsModule,
    EventsModule,
    ScraperSyncModule,
    MeiliModule,
    SeoModule,
    HealthModule,
    DestinationsModule,
    SemanticSearchModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
