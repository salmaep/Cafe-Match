import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DEPRECATED: Promotion seeding has been moved into cafe-scraping.seed.ts
 * which picks real scraped cafes and attaches promo content to them.
 *
 * This migration is kept as a defensive no-op so existing DBs that already
 * ran it don't break and fresh DBs don't crash on missing cafe IDs 1-6.
 *
 * To seed promos on a fresh DB: `npm run seed` (handled by cafe-scraping.seed.ts)
 */
export class SeedDummyPromotions1712600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only run the legacy seed if cafes 1-6 actually exist AND they don't already have promotions.
    // This protects fresh DBs from FK errors while preserving idempotency.
    const [cafesPresent] = await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM cafes WHERE id IN (1, 2, 3, 4, 5, 6)`,
    );
    if (parseInt(cafesPresent?.cnt ?? '0', 10) < 6) {
      console.log(
        '[SeedDummyPromotions] Skipped — cafes 1-6 not present. Promotions are now seeded by cafe-scraping.seed.ts',
      );
      return;
    }

    const [existingPromo] = await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM promotions WHERE cafe_id IN (1, 2, 3, 4, 5, 6)`,
    );
    if (parseInt(existingPromo?.cnt ?? '0', 10) > 0) {
      console.log('[SeedDummyPromotions] Skipped — promotions already seeded for cafes 1-6');
      return;
    }

    // ── Legacy path (unchanged) ─────────────────────────────────────────────
    const [owner] = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'owner' LIMIT 1`,
    );
    let ownerId = owner?.id || null;

    if (!ownerId) {
      await queryRunner.query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ('owner@cafematch.id', '$2b$10$dummyhashnotreal000000000000000000000000000000', 'Demo Owner', 'owner')
      `);
      const [ownerRow] = await queryRunner.query(
        `SELECT id FROM users WHERE role = 'owner' LIMIT 1`,
      );
      ownerId = ownerRow.id;
    }

    await queryRunner.query(
      `UPDATE cafes SET owner_id = ? WHERE id IN (1, 2, 3, 4, 5, 6)`,
      [ownerId],
    );

    // Type A: New Cafe Highlight (cafes 1, 2, 3)
    await queryRunner.query(`
      INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, started_at, expires_at)
      VALUES (1, 3, 'new_cafe', 'monthly', 'active', NULL, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
    `);
    await queryRunner.query(`
      INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, started_at, expires_at)
      VALUES (2, 2, 'new_cafe', 'monthly', 'active', NULL, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
    `);
    await queryRunner.query(`
      INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, started_at, expires_at)
      VALUES (3, 1, 'new_cafe', 'monthly', 'active', NULL, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
    `);
    await queryRunner.query(`
      UPDATE cafes SET has_active_promotion = TRUE, active_promotion_type = 'new_cafe'
      WHERE id IN (1, 2, 3)
    `);

    // Type B: Featured Promo (cafes 4, 5, 6)
    await queryRunner.query(`
      INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, content_photo_url, highlighted_facilities, started_at, expires_at)
      VALUES (4, 3, 'featured_promo', 'monthly', 'active',
        'Live Music Every Weekend!',
        'Enjoy live acoustic performances every Friday & Saturday night. Free entry with any drink purchase.',
        NULL,
        '["cozy_seating", "outdoor_seating"]',
        NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
    `);
    await queryRunner.query(`
      INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, content_photo_url, highlighted_facilities, started_at, expires_at)
      VALUES (5, 2, 'featured_promo', 'monthly', 'active',
        'Buy 1 Get 1 All Lattes!',
        'Every Monday-Wednesday, buy any latte and get the second one free. Perfect for catching up with friends.',
        NULL,
        '["strong_wifi", "power_outlets"]',
        NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
    `);
    await queryRunner.query(`
      INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, content_photo_url, highlighted_facilities, started_at, expires_at)
      VALUES (6, 1, 'featured_promo', 'monthly', 'active',
        'New Seasonal Menu Available!',
        'Try our new Mango Coconut Cold Brew and Matcha Croissant. Limited time only!',
        NULL,
        '["cozy_seating"]',
        NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
    `);
    await queryRunner.query(`
      UPDATE cafes SET has_active_promotion = TRUE, active_promotion_type = 'featured_promo'
      WHERE id IN (4, 5, 6)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM promotions WHERE cafe_id IN (1, 2, 3, 4, 5, 6)`);
    await queryRunner.query(`
      UPDATE cafes SET has_active_promotion = FALSE, active_promotion_type = NULL, owner_id = NULL
      WHERE id IN (1, 2, 3, 4, 5, 6)
    `);
  }
}
