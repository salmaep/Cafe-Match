import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CafesModule } from './cafes/cafes.module';
import { PurposesModule } from './purposes/purposes.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { FavoritesModule } from './favorites/favorites.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
