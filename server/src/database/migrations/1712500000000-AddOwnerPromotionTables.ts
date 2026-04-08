import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnerPromotionTables1712500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add 'owner' to users role enum
    await queryRunner.query(`
      ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'owner') NOT NULL DEFAULT 'user'
    `);

    // 2. Add owner/promotion columns to cafes
    await queryRunner.query(`
      ALTER TABLE cafes
        ADD COLUMN owner_id INT UNSIGNED NULL,
        ADD COLUMN has_active_promotion BOOLEAN DEFAULT FALSE,
        ADD COLUMN active_promotion_type ENUM('new_cafe', 'featured_promo') NULL,
        ADD INDEX idx_cafes_owner (owner_id),
        ADD CONSTRAINT fk_cafes_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
    `);

    // 3. Advertisement packages
    await queryRunner.query(`
      CREATE TABLE advertisement_packages (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        price_monthly DECIMAL(12, 2) NOT NULL,
        price_annual DECIMAL(12, 2) NOT NULL,
        monthly_slots INT UNSIGNED NOT NULL,
        annual_reserved_slots INT UNSIGNED NOT NULL,
        session_frequency VARCHAR(100) NOT NULL,
        display_order SMALLINT UNSIGNED DEFAULT 0,
        benefits JSON,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pkg_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. Promotion slots (capacity tracking per period)
    await queryRunner.query(`
      CREATE TABLE promotion_slots (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        package_id INT UNSIGNED NOT NULL,
        promotion_type ENUM('new_cafe', 'featured_promo') NOT NULL,
        month VARCHAR(7) NOT NULL,
        total_slots INT UNSIGNED NOT NULL,
        used_slots INT UNSIGNED DEFAULT 0,
        reserved_slots INT UNSIGNED DEFAULT 0,
        FOREIGN KEY (package_id) REFERENCES advertisement_packages(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_slot_period (package_id, promotion_type, month)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5. Promotions
    await queryRunner.query(`
      CREATE TABLE promotions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        cafe_id INT UNSIGNED NOT NULL,
        package_id INT UNSIGNED NOT NULL,
        type ENUM('new_cafe', 'featured_promo') NOT NULL,
        billing_cycle ENUM('monthly', 'annual') NOT NULL DEFAULT 'monthly',
        status ENUM('pending_review', 'active', 'rejected', 'expired', 'pending_payment') NOT NULL DEFAULT 'pending_payment',
        rejection_reason VARCHAR(500) NULL,
        content_title VARCHAR(255) NULL,
        content_description TEXT NULL,
        content_photo_url VARCHAR(1000) NULL,
        highlighted_facilities JSON NULL,
        started_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        FOREIGN KEY (package_id) REFERENCES advertisement_packages(id),
        INDEX idx_promo_cafe (cafe_id),
        INDEX idx_promo_status (status),
        INDEX idx_promo_type_status (type, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 6. Transactions
    await queryRunner.query(`
      CREATE TABLE transactions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        promotion_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        midtrans_order_id VARCHAR(100) NOT NULL UNIQUE,
        midtrans_transaction_id VARCHAR(100) NULL,
        midtrans_snap_token VARCHAR(255) NULL,
        amount DECIMAL(12, 2) NOT NULL,
        status ENUM('pending', 'success', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
        payment_type VARCHAR(50) NULL,
        paid_at TIMESTAMP NULL,
        raw_notification JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (promotion_id) REFERENCES promotions(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_txn_order (midtrans_order_id),
        INDEX idx_txn_user (user_id),
        INDEX idx_txn_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 7. Cafe analytics
    await queryRunner.query(`
      CREATE TABLE cafe_analytics (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        cafe_id INT UNSIGNED NOT NULL,
        promotion_id INT UNSIGNED NULL,
        event_type ENUM('view', 'click') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE SET NULL,
        INDEX idx_analytics_cafe (cafe_id),
        INDEX idx_analytics_date (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 8. Seed advertisement packages
    await queryRunner.query(`
      INSERT INTO advertisement_packages (name, slug, price_monthly, price_annual, monthly_slots, annual_reserved_slots, session_frequency, display_order, benefits) VALUES
      ('Starter', 'starter', 99000, 999000, 20, 15, 'Appears 3x per session', 1, '["Basic visibility", "3x appearance per user session"]'),
      ('Pro', 'pro', 299000, 2990000, 10, 8, 'Appears 5x per session', 2, '["Enhanced visibility", "5x appearance per user session", "Priority placement"]'),
      ('Premium', 'premium', 599000, 5990000, 5, 4, 'Always on top / priority', 3, '["Maximum visibility", "Always on top", "Priority placement", "Featured badge"]')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS cafe_analytics');
    await queryRunner.query('DROP TABLE IF EXISTS transactions');
    await queryRunner.query('DROP TABLE IF EXISTS promotions');
    await queryRunner.query('DROP TABLE IF EXISTS promotion_slots');
    await queryRunner.query('DROP TABLE IF EXISTS advertisement_packages');

    await queryRunner.query(`
      ALTER TABLE cafes
        DROP FOREIGN KEY fk_cafes_owner,
        DROP INDEX idx_cafes_owner,
        DROP COLUMN active_promotion_type,
        DROP COLUMN has_active_promotion,
        DROP COLUMN owner_id
    `);

    await queryRunner.query(`
      ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user'
    `);
  }
}
