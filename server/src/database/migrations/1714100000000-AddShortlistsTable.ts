import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShortlistsTable1714100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE shortlists (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        cafe_id INT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_shortlist_user_cafe (user_id, cafe_id),
        INDEX idx_shortlist_cafe (cafe_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS shortlists');
  }
}
