import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Persistent points ledger.
 *
 * point_events is the source of truth; users.points is a cached total written
 * in the same transaction as each ledger insert (profile reads are frequent
 * and the ledger grows unboundedly). Reconciliation query if they ever drift:
 *
 *   UPDATE users u
 *   SET points = (SELECT COALESCE(SUM(points),0) FROM point_events WHERE user_id = u.id);
 *
 * dedupe_key makes awards idempotent (e.g. 'checkin:123', 'table_squad:45') —
 * unique index; NULLs allowed for ad-hoc events.
 *
 * Also extends achievements.category ENUM with the new categories used by the
 * Geser achievements seed (points / table / explorer / time).
 */
export class AddPointsLedger1716130000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE point_events (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        points INT NOT NULL,
        dedupe_key VARCHAR(120) NULL,
        meta JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE INDEX uq_point_dedupe (dedupe_key),
        INDEX idx_points_user (user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN points INT UNSIGNED NOT NULL DEFAULT 0 AFTER bio
    `);

    // Append-only ENUM extension — existing values repeated in order.
    await queryRunner.query(`
      ALTER TABLE achievements MODIFY COLUMN category ENUM(
        'visit_purpose', 'visit_general', 'social', 'streak', 'special',
        'points', 'table', 'explorer', 'time'
      ) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM achievements WHERE category IN ('points','table','explorer','time')
    `);
    await queryRunner.query(`
      ALTER TABLE achievements MODIFY COLUMN category ENUM(
        'visit_purpose', 'visit_general', 'social', 'streak', 'special'
      ) NOT NULL
    `);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN points`);
    await queryRunner.query(`DROP TABLE IF EXISTS point_events`);
  }
}
