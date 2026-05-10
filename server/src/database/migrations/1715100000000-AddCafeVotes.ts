import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCafeVotes1715100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`cafe_votes\` (
        \`id\`         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
        \`user_id\`    INT UNSIGNED    NOT NULL,
        \`cafe_id\`    INT UNSIGNED    NOT NULL,
        \`purpose_id\` INT UNSIGNED    NOT NULL,
        \`created_at\` DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_cafe_votes_user_cafe_purpose\` (\`user_id\`, \`cafe_id\`, \`purpose_id\`),
        KEY \`IDX_cafe_votes_cafe_id\` (\`cafe_id\`),
        KEY \`IDX_cafe_votes_purpose_id\` (\`purpose_id\`),
        CONSTRAINT \`FK_cafe_votes_user\`    FOREIGN KEY (\`user_id\`)    REFERENCES \`users\`(\`id\`)    ON DELETE CASCADE,
        CONSTRAINT \`FK_cafe_votes_cafe\`    FOREIGN KEY (\`cafe_id\`)    REFERENCES \`cafes\`(\`id\`)    ON DELETE CASCADE,
        CONSTRAINT \`FK_cafe_votes_purpose\` FOREIGN KEY (\`purpose_id\`) REFERENCES \`purposes\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`cafe_votes\``);
  }
}
