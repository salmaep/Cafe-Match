import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialFeatures1712800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. ALTER users: add friend_code + avatar_url ──────────────────────

    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN friend_code VARCHAR(8) NULL AFTER role,
        ADD COLUMN avatar_url VARCHAR(500) NULL AFTER friend_code
    `);

    // Backfill existing users with random 8-char alphanumeric friend codes
    const users: { id: number }[] = await queryRunner.query(
      `SELECT id FROM users WHERE friend_code IS NULL`,
    );
    for (const user of users) {
      const code = Math.random().toString(36).slice(2, 10).toUpperCase();
      await queryRunner.query(`UPDATE users SET friend_code = ? WHERE id = ?`, [
        code,
        user.id,
      ]);
    }

    // Now make it NOT NULL + UNIQUE
    await queryRunner.query(`
      ALTER TABLE users
        MODIFY COLUMN friend_code VARCHAR(8) NOT NULL,
        ADD UNIQUE INDEX idx_users_friend_code (friend_code)
    `);

    // ── 2. reviews ────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE reviews (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        cafe_id INT UNSIGNED NOT NULL,
        text TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_review_user_cafe (user_id, cafe_id),
        INDEX idx_review_cafe (cafe_id),
        INDEX idx_review_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 3. review_ratings ─────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE review_ratings (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        review_id INT UNSIGNED NOT NULL,
        category VARCHAR(50) NOT NULL,
        score TINYINT UNSIGNED NOT NULL,
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_rating_review_cat (review_id, category),
        INDEX idx_rating_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 4. checkins ───────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE checkins (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        cafe_id INT UNSIGNED NOT NULL,
        check_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        check_out_at TIMESTAMP NULL,
        duration_minutes SMALLINT UNSIGNED NULL,
        verified BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        INDEX idx_checkin_user (user_id),
        INDEX idx_checkin_cafe (cafe_id),
        INDEX idx_checkin_time (check_in_at),
        INDEX idx_checkin_user_cafe_time (user_id, cafe_id, check_in_at),
        INDEX idx_checkin_user_checkout (user_id, check_out_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 5. user_streaks ───────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE user_streaks (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        cafe_id INT UNSIGNED NULL,
        streak_type ENUM('cafe', 'global') NOT NULL DEFAULT 'global',
        current_streak INT UNSIGNED DEFAULT 0,
        longest_streak INT UNSIGNED DEFAULT 0,
        last_checkin_date DATE NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE SET NULL,
        UNIQUE INDEX idx_streak_user_cafe (user_id, cafe_id, streak_type),
        INDEX idx_streak_last (last_checkin_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 6. friend_requests ────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE friend_requests (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        sender_id INT UNSIGNED NOT NULL,
        receiver_id INT UNSIGNED NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_friend_pair (sender_id, receiver_id),
        INDEX idx_friend_receiver (receiver_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 7. friendships ────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE friendships (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_a_id INT UNSIGNED NOT NULL,
        user_b_id INT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_friendship_pair (user_a_id, user_b_id),
        INDEX idx_friendship_b (user_b_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 8. achievements (definition table) ────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE achievements (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        category ENUM('visit_purpose', 'visit_general', 'social', 'streak', 'special') NOT NULL,
        tier ENUM('bronze_1', 'bronze_2', 'silver_1', 'silver_2', 'gold_1', 'gold_2', 'platinum') NOT NULL,
        threshold INT UNSIGNED NOT NULL,
        purpose_slug VARCHAR(50) NULL,
        icon_url VARCHAR(500) NULL,
        INDEX idx_achievement_category (category),
        INDEX idx_achievement_tier (tier)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 9. user_achievements ──────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE user_achievements (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        achievement_id INT UNSIGNED NOT NULL,
        progress INT UNSIGNED DEFAULT 0,
        unlocked_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_user_achievement (user_id, achievement_id),
        INDEX idx_ua_unlocked (unlocked_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 10. together_counts ───────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE together_counts (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_a_id INT UNSIGNED NOT NULL,
        user_b_id INT UNSIGNED NOT NULL,
        cafe_id INT UNSIGNED NOT NULL,
        count INT UNSIGNED DEFAULT 0,
        FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_together_pair_cafe (user_a_id, user_b_id, cafe_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 11. notifications ─────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE notifications (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        type ENUM('rank_change', 'friend_request', 'friend_nearby', 'friend_same_cafe', 'achievement_unlocked', 'together_bomb', 'emoji_spam') NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        data JSON NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_notif_user_read (user_id, is_read, created_at),
        INDEX idx_notif_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 12. push_tokens ───────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE push_tokens (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        token VARCHAR(500) NOT NULL,
        platform ENUM('ios', 'android') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_push_token (token),
        INDEX idx_push_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ── 13. user_recaps ───────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE user_recaps (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        year SMALLINT UNSIGNED NOT NULL,
        recap_data JSON NOT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_recap_user_year (user_id, year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS user_recaps`);
    await queryRunner.query(`DROP TABLE IF EXISTS push_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS together_counts`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_achievements`);
    await queryRunner.query(`DROP TABLE IF EXISTS achievements`);
    await queryRunner.query(`DROP TABLE IF EXISTS friendships`);
    await queryRunner.query(`DROP TABLE IF EXISTS friend_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_streaks`);
    await queryRunner.query(`DROP TABLE IF EXISTS checkins`);
    await queryRunner.query(`DROP TABLE IF EXISTS review_ratings`);
    await queryRunner.query(`DROP TABLE IF EXISTS reviews`);

    // Revert users columns
    await queryRunner.query(`
      ALTER TABLE users
        DROP INDEX idx_users_friend_code,
        DROP COLUMN avatar_url,
        DROP COLUMN friend_code
    `);
  }
}
