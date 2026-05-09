import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeCafeFeatures1715200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`cafe_facilities\``);

    await queryRunner.query(`
      ALTER TABLE \`cafes\`
        DROP COLUMN \`wifi_available\`,
        DROP COLUMN \`has_parking\`,
        DROP COLUMN \`has_mushola\`,
        DROP COLUMN \`wifi_speed_mbps\`
    `);

    await queryRunner.query(`
      CREATE TABLE \`cafe_features\` (
        \`id\`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
        \`cafe_id\`    INT UNSIGNED    NOT NULL,
        \`name\`       VARCHAR(150)    NOT NULL,
        \`category\`   VARCHAR(50)     NULL,
        \`source\`     ENUM('google_scraper','manual') NOT NULL DEFAULT 'manual',
        \`created_at\` DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_cafe_feature_name\` (\`cafe_id\`, \`name\`),
        KEY \`IDX_cafe_features_cafe\` (\`cafe_id\`),
        KEY \`IDX_cafe_features_category\` (\`category\`),
        CONSTRAINT \`FK_cafe_features_cafe\` FOREIGN KEY (\`cafe_id\`) REFERENCES \`cafes\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`cafe_photos\`
        ADD COLUMN \`photo_type\` ENUM('cover','gallery','menu') NOT NULL DEFAULT 'gallery' AFTER \`source\`
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`cafe_photos\` DROP COLUMN \`photo_type\``);

    await queryRunner.query(`DROP TABLE IF EXISTS \`cafe_features\``);

    await queryRunner.query(`
      ALTER TABLE \`cafes\`
        ADD COLUMN \`wifi_available\`   TINYINT(1) NOT NULL DEFAULT 0,
        ADD COLUMN \`has_parking\`      TINYINT(1) NOT NULL DEFAULT 0,
        ADD COLUMN \`has_mushola\`      TINYINT(1) NOT NULL DEFAULT 0,
        ADD COLUMN \`wifi_speed_mbps\`  SMALLINT UNSIGNED NULL
    `);

    await queryRunner.query(`
      CREATE TABLE \`cafe_facilities\` (
        \`id\`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`cafe_id\`        INT UNSIGNED NOT NULL,
        \`facility_key\`   VARCHAR(50)  NOT NULL,
        \`facility_value\` VARCHAR(255) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_cafe_facility\` (\`cafe_id\`, \`facility_key\`),
        KEY \`IDX_cafe_facilities_key\` (\`facility_key\`),
        CONSTRAINT \`FK_cafe_facilities_cafe\` FOREIGN KEY (\`cafe_id\`) REFERENCES \`cafes\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
}
