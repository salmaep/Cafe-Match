"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OwnerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const cafe_entity_1 = require("../cafes/entities/cafe.entity");
const cafe_menu_entity_1 = require("../menus/entities/cafe-menu.entity");
const cafe_photo_entity_1 = require("../photos/entities/cafe-photo.entity");
const cafe_facility_entity_1 = require("../cafes/entities/cafe-facility.entity");
const promotion_entity_1 = require("../promotions/entities/promotion.entity");
const cafe_analytics_entity_1 = require("../analytics/entities/cafe-analytics.entity");
const owner_controller_1 = require("./owner.controller");
const owner_service_1 = require("./owner.service");
let OwnerModule = class OwnerModule {
};
exports.OwnerModule = OwnerModule;
exports.OwnerModule = OwnerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                cafe_entity_1.Cafe,
                cafe_menu_entity_1.CafeMenu,
                cafe_photo_entity_1.CafePhoto,
                cafe_facility_entity_1.CafeFacility,
                promotion_entity_1.Promotion,
                cafe_analytics_entity_1.CafeAnalytics,
            ]),
        ],
        controllers: [owner_controller_1.OwnerController],
        providers: [owner_service_1.OwnerService],
        exports: [owner_service_1.OwnerService],
    })
], OwnerModule);
//# sourceMappingURL=owner.module.js.map