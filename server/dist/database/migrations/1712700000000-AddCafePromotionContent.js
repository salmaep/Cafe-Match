"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCafePromotionContent1712700000000 = void 0;
class AddCafePromotionContent1712700000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE cafes
        ADD COLUMN has_parking BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN promotion_content JSON NULL,
        ADD COLUMN new_cafe_content JSON NULL
    `);
        await queryRunner.query(`
      UPDATE cafes c
      SET has_parking = TRUE
      WHERE EXISTS (
        SELECT 1 FROM cafe_facilities f
        WHERE f.cafe_id = c.id AND f.facility_key = 'parking'
      )
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE cafes
        DROP COLUMN has_parking,
        DROP COLUMN promotion_content,
        DROP COLUMN new_cafe_content
    `);
    }
}
exports.AddCafePromotionContent1712700000000 = AddCafePromotionContent1712700000000;
//# sourceMappingURL=1712700000000-AddCafePromotionContent.js.map