import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletionRequests1713400000000 implements MigrationInterface {
  name = 'AddDeletionRequests1713400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deletion_requests (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        friend_code VARCHAR(8) NULL,
        reason TEXT NULL,
        status ENUM('pending','verified','processed','rejected') NOT NULL DEFAULT 'pending',
        matched_user_id INT UNSIGNED NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        processed_at TIMESTAMP NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    const db = queryRunner.connection.options.database as string;

    const emailIdx = await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'deletion_requests' AND INDEX_NAME = 'idx_dr_email'`,
      [db],
    );
    if (emailIdx[0].cnt === 0) {
      await queryRunner.query(
        `CREATE INDEX idx_dr_email ON deletion_requests (email)`,
      );
    }

    const statusIdx = await queryRunner.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'deletion_requests' AND INDEX_NAME = 'idx_dr_status'`,
      [db],
    );
    if (statusIdx[0].cnt === 0) {
      await queryRunner.query(
        `CREATE INDEX idx_dr_status ON deletion_requests (status)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS deletion_requests`);
  }
}
