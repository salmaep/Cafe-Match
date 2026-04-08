"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedDummyPromotions1712600000000 = void 0;
class SeedDummyPromotions1712600000000 {
    async up(queryRunner) {
        const [owner] = await queryRunner.query(`SELECT id FROM users WHERE role = 'owner' LIMIT 1`);
        const ownerId = owner?.id || null;
        if (!ownerId) {
            await queryRunner.query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ('owner@cafematch.id', '$2b$10$dummyhashnotreal000000000000000000000000000000', 'Demo Owner', 'owner')
      `);
        }
        const [ownerRow] = await queryRunner.query(`SELECT id FROM users WHERE role = 'owner' LIMIT 1`);
        const finalOwnerId = ownerRow.id;
        await queryRunner.query(`UPDATE cafes SET owner_id = ? WHERE id IN (1, 2, 3, 4, 5, 6)`, [finalOwnerId]);
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
    async down(queryRunner) {
        await queryRunner.query(`DELETE FROM promotions WHERE cafe_id IN (1, 2, 3, 4, 5, 6)`);
        await queryRunner.query(`
      UPDATE cafes SET has_active_promotion = FALSE, active_promotion_type = NULL, owner_id = NULL
      WHERE id IN (1, 2, 3, 4, 5, 6)
    `);
    }
}
exports.SeedDummyPromotions1712600000000 = SeedDummyPromotions1712600000000;
//# sourceMappingURL=1712600000000-SeedDummyPromotions.js.map