"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv = __importStar(require("dotenv"));
const purposes_seed_1 = require("./purposes.seed");
const cafes_seed_1 = require("./cafes.seed");
const user_entity_1 = require("../../users/entities/user.entity");
const cafe_entity_1 = require("../../cafes/entities/cafe.entity");
const cafe_facility_entity_1 = require("../../cafes/entities/cafe-facility.entity");
const purpose_entity_1 = require("../../purposes/entities/purpose.entity");
const purpose_requirement_entity_1 = require("../../purposes/entities/purpose-requirement.entity");
const cafe_menu_entity_1 = require("../../menus/entities/cafe-menu.entity");
const cafe_photo_entity_1 = require("../../photos/entities/cafe-photo.entity");
const bookmark_entity_1 = require("../../bookmarks/entities/bookmark.entity");
const favorite_entity_1 = require("../../favorites/entities/favorite.entity");
const cafe_vote_entity_1 = require("../../votes/entities/cafe-vote.entity");
dotenv.config();
async function run() {
    const dataSource = new typeorm_1.DataSource({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'cafematch',
        entities: [
            user_entity_1.User,
            cafe_entity_1.Cafe,
            cafe_facility_entity_1.CafeFacility,
            purpose_entity_1.Purpose,
            purpose_requirement_entity_1.PurposeRequirement,
            cafe_menu_entity_1.CafeMenu,
            cafe_photo_entity_1.CafePhoto,
            bookmark_entity_1.Bookmark,
            favorite_entity_1.Favorite,
            cafe_vote_entity_1.CafeVote,
        ],
    });
    await dataSource.initialize();
    console.log('Database connected.\n');
    console.log('--- Seeding Purposes ---');
    await (0, purposes_seed_1.seedPurposes)(dataSource);
    console.log('\n--- Seeding Cafes ---');
    await (0, cafes_seed_1.seedCafes)(dataSource);
    await dataSource.destroy();
    console.log('\nDone!');
}
run().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=run-seed.js.map