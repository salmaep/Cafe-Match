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
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

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
        synchronize: true, // TODO: disable in production, use migrations instead
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
