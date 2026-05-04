import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteAndMeiliQueue1713200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Soft delete columns ────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE cafes
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL,
        ADD INDEX idx_cafes_deleted_at (deleted_at)
    `);

    await queryRunner.query(`
      ALTER TABLE reviews
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL,
        ADD INDEX idx_reviews_deleted_at (deleted_at)
    `);

    await queryRunner.query(`
      ALTER TABLE cafe_menus
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL,
        ADD INDEX idx_cafe_menus_deleted_at (deleted_at)
    `);

    await queryRunner.query(`
      ALTER TABLE cafe_photos
        ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL,
        ADD INDEX idx_cafe_photos_deleted_at (deleted_at)
    `);

    // ── Meili sync failure queue ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE meili_sync_failures (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        cafe_id     INT UNSIGNED NOT NULL,
        operation   ENUM('index', 'remove') NOT NULL,
        error       TEXT NULL,
        retry_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
        created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_cafe_op (cafe_id, operation),
        INDEX idx_meili_failures_created (created_at)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS meili_sync_failures`);

    await queryRunner.query(`ALTER TABLE cafe_photos DROP INDEX idx_cafe_photos_deleted_at, DROP COLUMN deleted_at`);
    await queryRunner.query(`ALTER TABLE cafe_menus  DROP INDEX idx_cafe_menus_deleted_at,  DROP COLUMN deleted_at`);
    await queryRunner.query(`ALTER TABLE reviews      DROP INDEX idx_reviews_deleted_at,     DROP COLUMN deleted_at`);
    await queryRunner.query(`ALTER TABLE cafes        DROP INDEX idx_cafes_deleted_at,       DROP COLUMN deleted_at`);
  }
}
