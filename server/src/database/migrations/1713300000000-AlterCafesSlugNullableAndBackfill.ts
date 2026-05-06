import { MigrationInterface, QueryRunner } from 'typeorm';
import { buildCafeSlug } from '../../common/utils/slug.util';

export class AlterCafesSlugNullableAndBackfill1713300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Make slug nullable so future inserts can defer the value until after id is known
    await queryRunner.query(`ALTER TABLE cafes MODIFY slug VARCHAR(255) NULL`);

    // 2. Backfill all rows to the canonical "<slugify(name)>-<id>" format
    const rows: { id: number; name: string }[] = await queryRunner.query(
      `SELECT id, name FROM cafes`,
    );

    for (const row of rows) {
      const slug = buildCafeSlug(row.name, row.id);
      await queryRunner.query(`UPDATE cafes SET slug = ? WHERE id = ?`, [slug, row.id]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert nullability only; slug content backfill is not reversible.
    // Existing values must satisfy NOT NULL — the UPDATE above guarantees this for all rows.
    await queryRunner.query(`ALTER TABLE cafes MODIFY slug VARCHAR(255) NOT NULL`);
  }
}
