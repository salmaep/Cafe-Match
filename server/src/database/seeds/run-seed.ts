import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { seedPurposes } from './purposes.seed';
import { seedCafes } from './cafes.seed';
import { seedScrapedCafes } from './cafe-scraping.seed';
import { User } from '../../users/entities/user.entity';
import { Cafe } from '../../cafes/entities/cafe.entity';
import { CafeFacility } from '../../cafes/entities/cafe-facility.entity';
import { Purpose } from '../../purposes/entities/purpose.entity';
import { PurposeRequirement } from '../../purposes/entities/purpose-requirement.entity';
import { CafeMenu } from '../../menus/entities/cafe-menu.entity';
import { CafePhoto } from '../../photos/entities/cafe-photo.entity';
import { Bookmark } from '../../bookmarks/entities/bookmark.entity';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { CafeVote } from '../../votes/entities/cafe-vote.entity';
import { AdvertisementPackage } from '../../promotions/entities/advertisement-package.entity';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { PromotionSlot } from '../../promotions/entities/promotion-slot.entity';
import { Transaction } from '../../payments/entities/transaction.entity';
import { CafeAnalytics } from '../../analytics/entities/cafe-analytics.entity';

dotenv.config();

async function run() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'cafematch',
    entities: [
      User,
      Cafe,
      CafeFacility,
      Purpose,
      PurposeRequirement,
      CafeMenu,
      CafePhoto,
      Bookmark,
      Favorite,
      CafeVote,
      AdvertisementPackage,
      Promotion,
      PromotionSlot,
      Transaction,
      CafeAnalytics,
    ],
  });

  await dataSource.initialize();
  console.log('Database connected.\n');

  console.log('--- Seeding Purposes ---');
  await seedPurposes(dataSource);

  // Scraped cafe data is now the primary source.
  // The old dummy seedCafes() is still available but skipped by default.
  // Uncomment the next line to fall back to the legacy dummy data:
  // await seedCafes(dataSource);

  console.log('\n--- Seeding Scraped Cafes ---');
  await seedScrapedCafes(dataSource);

  await dataSource.destroy();
  console.log('\nDone!');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
