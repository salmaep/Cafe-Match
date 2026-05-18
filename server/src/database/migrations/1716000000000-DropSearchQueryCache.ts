import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSearchQueryCache1716000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS search_query_cache`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS search_query_cache (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        query_hash CHAR(64) NOT NULL,
        geo_bucket VARCHAR(40) NOT NULL DEFAULT 'global',
        parsed_json JSON NULL,
        hit_ids_json JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        UNIQUE INDEX idx_cache_hash_geo (query_hash, geo_bucket),
        INDEX idx_cache_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
}
