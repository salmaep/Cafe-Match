import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCafePromotionContent1712700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add has_parking + rich promotion content JSON columns to cafes
    await queryRunner.query(`
      ALTER TABLE cafes
        ADD COLUMN has_parking BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN promotion_content JSON NULL,
        ADD COLUMN new_cafe_content JSON NULL
    `);

    // Backfill has_parking from cafe_facilities where facility_key = 'parking'
    await queryRunner.query(`
      UPDATE cafes c
      SET has_parking = TRUE
      WHERE EXISTS (
        SELECT 1 FROM cafe_facilities f
        WHERE f.cafe_id = c.id AND f.facility_key = 'parking'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cafes
        DROP COLUMN has_parking,
        DROP COLUMN promotion_content,
        DROP COLUMN new_cafe_content
    `);
  }
}
