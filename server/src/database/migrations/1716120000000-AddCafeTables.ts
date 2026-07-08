import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Open/Join Table ("Meja") feature.
 *
 * cafe_tables.host_active is the race-safety mechanism for "one active table
 * per user": it equals host_user_id while the table is open and is set to
 * NULL when closed/expired. MySQL unique indexes allow unlimited NULLs, so
 * uq_table_host_active emulates a partial unique index — a second concurrent
 * open INSERT fails atomically with ER_DUP_ENTRY. Do NOT "simplify" this to a
 * regular composite index.
 *
 * Also extends notifications.type ENUM with the table notification types.
 */
export class AddCafeTables1716120000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE cafe_tables (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        host_user_id INT UNSIGNED NOT NULL,
        cafe_id INT UNSIGNED NOT NULL,
        status ENUM('open','closed','expired') NOT NULL DEFAULT 'open',
        host_active INT UNSIGNED NULL,
        title VARCHAR(100) NULL,
        max_guests TINYINT UNSIGNED NOT NULL DEFAULT 4,
        gender_rule ENUM('any','female_only','male_only') NOT NULL DEFAULT 'any',
        friends_only BOOLEAN NOT NULL DEFAULT FALSE,
        opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        closed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        UNIQUE INDEX uq_table_host_active (host_active),
        INDEX idx_table_cafe_status (cafe_id, status, expires_at),
        INDEX idx_table_expiry (status, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE table_join_requests (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        table_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        status ENUM('pending','accepted','declined','canceled','expired') NOT NULL DEFAULT 'pending',
        message VARCHAR(200) NULL,
        responded_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (table_id) REFERENCES cafe_tables(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE INDEX uq_table_request (table_id, user_id),
        INDEX idx_request_user (user_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Append table notification types (ENUM is append-only; existing values
    // must be repeated in order or rows would remap).
    await queryRunner.query(`
      ALTER TABLE notifications MODIFY COLUMN type ENUM(
        'rank_change', 'friend_request', 'friend_nearby', 'friend_same_cafe',
        'achievement_unlocked', 'together_bomb', 'emoji_spam',
        'table_join_request', 'table_request_accepted',
        'table_request_declined', 'table_closed'
      ) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove any rows using the new enum values before shrinking the enum.
    await queryRunner.query(`
      DELETE FROM notifications WHERE type IN (
        'table_join_request', 'table_request_accepted',
        'table_request_declined', 'table_closed'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE notifications MODIFY COLUMN type ENUM(
        'rank_change', 'friend_request', 'friend_nearby', 'friend_same_cafe',
        'achievement_unlocked', 'together_bomb', 'emoji_spam'
      ) NOT NULL
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS table_join_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS cafe_tables`);
  }
}
