import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDummyPromotions1712600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Assign some cafes to owner user (id=2) if exists
    const [owner] = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'owner' LIMIT 1`,
    );
    const ownerId = owner?.id || null;

    // If no owner exists, create one
    if (!ownerId) {
      await queryRunner.query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ('owner@cafematch.id', '$2b$10$dummyhashnotreal000000000000000000000000000000', 'Demo Owner', 'owner')
      `);
    }

    const [ownerRow] = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'owner' LIMIT 1`,
    );
    const finalOwnerId = ownerRow.id;

    // Assign owner to cafes 1-6
    await queryRunner.query(
      `UPDATE cafes SET owner_id = ? WHERE id IN (1, 2, 3, 4, 5, 6)`,
      [finalOwnerId],
    );

    // --- Type A: New Cafe Highlight (cafes 1, 2, 3) ---
    // Cafe 1 - Premium highlight
    await queryRunner.query(`
      INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, started_at, expires_at)
      VALUES (1, 3, 'new_cafe', 'monthly', 'active', NULL, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
    `);
    // Cafe 2 - Pro highlight
    await queryRunner.query(`
      INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, started_at, expires_at)
      VALUES (2, 2, 'new_cafe', 'monthly', 'active', NULL, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
    `);
    // Cafe 3 - Starter highlight
    await queryRunner.query(`
      INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, started_at, expires_at)
      VALUES (3, 1, 'new_cafe', 'monthly', 'active', NULL, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
    `);

    // Mark cafes 1-3 as having active Type A promotion
    await queryRunner.query(`
      UPDATE cafes SET has_active_promotion = TRUE, active_promotion_type = 'new_cafe'
      WHERE id IN (1, 2, 3)
    `);

    // --- Type B: Featured Promo (cafes 4, 5, 6) ---
    // Cafe 4 - Premium featured
    await queryRunner.query(`
      INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, content_photo_url, highlighted_facilities, started_at, expires_at)
      VALUES (4, 3, 'featured_promo', 'monthly', 'active',
        'Live Music Every Weekend!',
        'Enjoy live acoustic performances every Friday & Saturday night. Free entry with any drink purchase.',
        NULL,
        '["cozy_seating", "outdoor_seating"]',
        NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
    `);
    // Cafe 5 - Pro featured
    await queryRunner.query(`
      INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, content_photo_url, highlighted_facilities, started_at, expires_at)
      VALUES (5, 2, 'featured_promo', 'monthly', 'active',
        'Buy 1 Get 1 All Lattes!',
        'Every Monday-Wednesday, buy any latte and get the second one free. Perfect for catching up with friends.',
        NULL,
        '["strong_wifi", "power_outlets"]',
        NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
    `);
    // Cafe 6 - Starter featured
    await queryRunner.query(`
      INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, content_photo_url, highlighted_facilities, started_at, expires_at)
      VALUES (6, 1, 'featured_promo', 'monthly', 'active',
        'New Seasonal Menu Available!',
        'Try our new Mango Coconut Cold Brew and Matcha Croissant. Limited time only!',
        NULL,
        '["cozy_seating"]',
        NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))
    `);

    // Mark cafes 4-6 as having active Type B promotion
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
