import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { seedPurposes } from './purposes.seed';
import { seedCafes } from './cafes.seed';
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
    ],
  });

  await dataSource.initialize();
  console.log('Database connected.\n');

  console.log('--- Seeding Purposes ---');
  await seedPurposes(dataSource);

  console.log('\n--- Seeding Cafes ---');
  await seedCafes(dataSource);

  await dataSource.destroy();
  console.log('\nDone!');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
