import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewVotes1715500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`review_votes\` (
        \`user_id\`    INT UNSIGNED NOT NULL,
        \`review_id\`  INT UNSIGNED NOT NULL,
        \`created_at\` DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`user_id\`, \`review_id\`),
        KEY \`IDX_review_votes_review_id\` (\`review_id\`),
        CONSTRAINT \`FK_review_votes_user\`   FOREIGN KEY (\`user_id\`)   REFERENCES \`users\`(\`id\`)    ON DELETE CASCADE,
        CONSTRAINT \`FK_review_votes_review\` FOREIGN KEY (\`review_id\`) REFERENCES \`reviews\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE \`reviews\`
      ADD COLUMN \`helpful_count\` INT NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE \`reviews\`
      ADD INDEX \`IDX_reviews_helpful_created\` (\`helpful_count\`, \`created_at\`)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`reviews\` DROP INDEX \`IDX_reviews_helpful_created\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reviews\` DROP COLUMN \`helpful_count\``,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS \`review_votes\``);
  }
}
