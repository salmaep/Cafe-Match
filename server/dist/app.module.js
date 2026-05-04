"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const core_1 = require("@nestjs/core");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const cafes_module_1 = require("./cafes/cafes.module");
const purposes_module_1 = require("./purposes/purposes.module");
const bookmarks_module_1 = require("./bookmarks/bookmarks.module");
const favorites_module_1 = require("./favorites/favorites.module");
const menus_module_1 = require("./menus/menus.module");
const photos_module_1 = require("./photos/photos.module");
const votes_module_1 = require("./votes/votes.module");
const owner_module_1 = require("./owner/owner.module");
const promotions_module_1 = require("./promotions/promotions.module");
const payments_module_1 = require("./payments/payments.module");
const analytics_module_1 = require("./analytics/analytics.module");
const admin_module_1 = require("./admin/admin.module");
const reviews_module_1 = require("./reviews/reviews.module");
const checkins_module_1 = require("./checkins/checkins.module");
const notifications_module_1 = require("./notifications/notifications.module");
const achievements_module_1 = require("./achievements/achievements.module");
const friends_module_1 = require("./friends/friends.module");
const recaps_module_1 = require("./recaps/recaps.module");
const events_module_1 = require("./gateway/events.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const scraper_sync_module_1 = require("./scraper-sync/scraper-sync.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'mysql',
                    host: configService.get('DB_HOST'),
                    port: configService.get('DB_PORT'),
                    username: configService.get('DB_USERNAME'),
                    password: configService.get('DB_PASSWORD'),
                    database: configService.get('DB_DATABASE'),
                    autoLoadEntities: true,
                    synchronize: false,
                    migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
                }),
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            cafes_module_1.CafesModule,
            purposes_module_1.PurposesModule,
            bookmarks_module_1.BookmarksModule,
            favorites_module_1.FavoritesModule,
            menus_module_1.MenusModule,
            photos_module_1.PhotosModule,
            votes_module_1.VotesModule,
            owner_module_1.OwnerModule,
            promotions_module_1.PromotionsModule,
            payments_module_1.PaymentsModule,
            analytics_module_1.AnalyticsModule,
            admin_module_1.AdminModule,
            reviews_module_1.ReviewsModule,
            checkins_module_1.CheckinsModule,
            notifications_module_1.NotificationsModule,
            achievements_module_1.AchievementsModule,
            friends_module_1.FriendsModule,
            recaps_module_1.RecapsModule,
            events_module_1.EventsModule,
            scraper_sync_module_1.ScraperSyncModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map