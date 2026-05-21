import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSoftDelete1713300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE users ADD INDEX idx_users_deleted_at (deleted_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users DROP INDEX idx_users_deleted_at`,
    );
    await queryRunner.query(`ALTER TABLE users DROP COLUMN deleted_at`);
  }
}
