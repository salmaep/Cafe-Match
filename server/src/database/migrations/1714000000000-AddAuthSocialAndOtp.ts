import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSocialAndOtp1714000000000 implements MigrationInterface {
  name = 'AddAuthSocialAndOtp1714000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        MODIFY COLUMN password_hash VARCHAR(255) NULL,
        ADD COLUMN phone VARCHAR(20) NULL AFTER password_hash,
        ADD COLUMN phone_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER phone,
        ADD COLUMN two_fa_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER phone_verified,
        ADD COLUMN provider VARCHAR(20) NOT NULL DEFAULT 'local' AFTER two_fa_enabled,
        ADD COLUMN provider_id VARCHAR(255) NULL AFTER provider
    `);
    await queryRunner.query(
      `CREATE INDEX idx_users_provider ON users (provider, provider_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_users_provider ON users`);
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN provider_id,
        DROP COLUMN provider,
        DROP COLUMN two_fa_enabled,
        DROP COLUMN phone_verified,
        DROP COLUMN phone,
        MODIFY COLUMN password_hash VARCHAR(255) NOT NULL
    `);
  }
}
