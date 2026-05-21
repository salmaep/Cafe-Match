import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSocialAndOtp1714000000000 implements MigrationInterface {
  name = 'AddAuthSocialAndOtp1714000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const db = queryRunner.connection.options.database as string;

    // Helper: check if column exists before adding (idempotent)
    const hasCol = async (col: string) => {
      const rows = await queryRunner.query(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
        [db, col],
      );
      return rows[0].cnt > 0;
    };

    await queryRunner.query(
      `ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL`,
    );
    if (!(await hasCol('phone')))
      await queryRunner.query(
        `ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL AFTER password_hash`,
      );
    if (!(await hasCol('phone_verified')))
      await queryRunner.query(
        `ALTER TABLE users ADD COLUMN phone_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER phone`,
      );
    if (!(await hasCol('two_fa_enabled')))
      await queryRunner.query(
        `ALTER TABLE users ADD COLUMN two_fa_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER phone_verified`,
      );
    if (!(await hasCol('provider')))
      await queryRunner.query(
        `ALTER TABLE users ADD COLUMN provider VARCHAR(20) NOT NULL DEFAULT 'local' AFTER two_fa_enabled`,
      );
    if (!(await hasCol('provider_id')))
      await queryRunner.query(
        `ALTER TABLE users ADD COLUMN provider_id VARCHAR(255) NULL AFTER provider`,
      );

    // Create index only if it doesn't exist
    const idxRows = await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_provider'`,
      [db],
    );
    if (idxRows[0].cnt === 0) {
      await queryRunner.query(
        `CREATE INDEX idx_users_provider ON users (provider, provider_id)`,
      );
    }
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
