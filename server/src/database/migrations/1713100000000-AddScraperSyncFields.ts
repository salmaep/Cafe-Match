import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScraperSyncFields1713100000000 implements MigrationInterface {
  name = 'AddScraperSyncFields1713100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to cafes table
    await queryRunner.query(`
      ALTER TABLE cafes
        ADD COLUMN category        VARCHAR(100)  NULL           AFTER is_active,
        ADD COLUMN city            VARCHAR(100)  NULL           AFTER category,
        ADD COLUMN district        VARCHAR(100)  NULL           AFTER city,
        ADD COLUMN claimed_by_owner TINYINT(1)   NOT NULL DEFAULT 0 AFTER district,
        ADD COLUMN reviews_distribution JSON     NULL           AFTER claimed_by_owner,
        ADD COLUMN pricing_raw     VARCHAR(50)   NULL           AFTER reviews_distribution,
        ADD COLUMN last_scraped_at TIMESTAMP     NULL           AFTER pricing_raw,
        ADD COLUMN scraper_source  VARCHAR(50)   NOT NULL DEFAULT 'manual' AFTER last_scraped_at
    `);

    await queryRunner.query(`ALTER TABLE cafes ADD INDEX idx_cafes_city (city)`);
    await queryRunner.query(`ALTER TABLE cafes ADD INDEX idx_cafes_district (district)`);
    await queryRunner.query(`ALTER TABLE cafes ADD INDEX idx_cafes_category (category)`);

    // Create cafe_google_reviews table
    await queryRunner.query(`
      CREATE TABLE cafe_google_reviews (
        id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
        cafe_id       INT UNSIGNED NOT NULL,
        guest_name    VARCHAR(150) NOT NULL,
        guest_avatar  VARCHAR(1000) NULL,
        rating        TINYINT UNSIGNED NOT NULL,
        comment       TEXT NULL,
        photo_url     VARCHAR(1000) NULL,
        external_hash CHAR(64)     NOT NULL,
        scraped_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_google_reviews_cafe (cafe_id),
        UNIQUE KEY uq_google_review_hash (cafe_id, external_hash),
        CONSTRAINT fk_google_reviews_cafe
          FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cafe_google_reviews`);
    await queryRunner.query(`ALTER TABLE cafes DROP INDEX idx_cafes_city`);
    await queryRunner.query(`ALTER TABLE cafes DROP INDEX idx_cafes_district`);
    await queryRunner.query(`ALTER TABLE cafes DROP INDEX idx_cafes_category`);
    await queryRunner.query(`
      ALTER TABLE cafes
        DROP COLUMN scraper_source,
        DROP COLUMN last_scraped_at,
        DROP COLUMN pricing_raw,
        DROP COLUMN reviews_distribution,
        DROP COLUMN claimed_by_owner,
        DROP COLUMN district,
        DROP COLUMN city,
        DROP COLUMN category
    `);
  }
}
