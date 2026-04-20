"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddReviewMedia1713000000000 = void 0;
class AddReviewMedia1713000000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE review_media (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        review_id INT UNSIGNED NOT NULL,
        media_type ENUM('photo', 'video') NOT NULL,
        url VARCHAR(1000) NOT NULL,
        display_order SMALLINT UNSIGNED DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        INDEX idx_review_media_review (review_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS review_media`);
    }
}
exports.AddReviewMedia1713000000000 = AddReviewMedia1713000000000;
//# sourceMappingURL=1713000000000-AddReviewMedia.js.map