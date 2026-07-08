import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The "friends-only" join rule was removed from the Open Table feature
 * (product decision) — drop its column. Joining is governed by the gender
 * rule + host accept/decline only.
 */
export class DropTableFriendsOnly1716150000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE cafe_tables DROP COLUMN friends_only`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE cafe_tables ADD COLUMN friends_only BOOLEAN NOT NULL DEFAULT FALSE AFTER gender_rule`,
    );
  }
}
