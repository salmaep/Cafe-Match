import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Allow `users.avatar_url` to hold base64 data URLs (in addition to plain URLs)
 * so users can upload an image directly from their device without needing
 * external image hosting infrastructure. TEXT column up to ~64KB which fits a
 * compressed JPEG of moderate dimensions.
 */
export class AlterUsersAvatarUrlText1715000000000 implements MigrationInterface {
  name = 'AlterUsersAvatarUrlText1715000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users MODIFY COLUMN avatar_url TEXT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users MODIFY COLUMN avatar_url VARCHAR(500) NULL`,
    );
  }
}
