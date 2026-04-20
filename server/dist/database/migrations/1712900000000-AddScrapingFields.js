"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddScrapingFields1712900000000 = void 0;
class AddScrapingFields1712900000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE cafes
        ADD COLUMN google_rating DECIMAL(2, 1) NULL AFTER has_parking,
        ADD COLUMN total_google_reviews INT UNSIGNED NULL AFTER google_rating,
        ADD COLUMN website VARCHAR(500) NULL AFTER total_google_reviews
    `);
        await queryRunner.query(`
      CREATE TABLE cafe_purpose_tags (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        cafe_id INT UNSIGNED NOT NULL,
        purpose_slug VARCHAR(50) NOT NULL,
        score SMALLINT UNSIGNED NOT NULL,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_purpose_tag (cafe_id, purpose_slug),
        INDEX idx_purpose_tag_slug (purpose_slug),
        INDEX idx_purpose_tag_score (score)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS cafe_purpose_tags`);
        await queryRunner.query(`
      ALTER TABLE cafes
        DROP COLUMN google_rating,
        DROP COLUMN total_google_reviews,
        DROP COLUMN website
    `);
    }
}
exports.AddScrapingFields1712900000000 = AddScrapingFields1712900000000;
//# sourceMappingURL=1712900000000-AddScrapingFields.js.map