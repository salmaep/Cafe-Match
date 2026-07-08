import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Logs searches that returned zero results, for dataset evaluation
 * (which queries/filters users try that we can't serve yet).
 * Raw-SQL-only table — no TypeORM entity (same as together_counts /
 * meili_sync_failures). Inserts happen fire-and-forget in CafesService.
 */
export class AddSearchZeroResults1716100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS search_zero_results (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        q VARCHAR(255) NOT NULL DEFAULT '',
        q_norm VARCHAR(255) NOT NULL DEFAULT '',
        lat DECIMAL(10,7) NULL,
        lng DECIMAL(11,7) NULL,
        radius INT UNSIGNED NULL,
        facilities_json JSON NULL,
        price_range VARCHAR(8) NULL,
        purpose_id INT UNSIGNED NULL,
        sort VARCHAR(20) NULL,
        user_id INT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_szr_qnorm_created (q_norm, created_at),
        INDEX idx_szr_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS search_zero_results`);
  }
}
