import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePurposeRequirementsFacilityKey1715300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Rename `facility_key` → `feature_name` and extend length to match
    // `cafe_features.name` (VARCHAR 150). The column now references
    // `cafe_features.name` (raw feature string) instead of legacy facility keys.
    await queryRunner.query(`
      ALTER TABLE \`purpose_requirements\`
        CHANGE COLUMN \`facility_key\` \`feature_name\` VARCHAR(150) NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`purpose_requirements\`
        CHANGE COLUMN \`feature_name\` \`facility_key\` VARCHAR(50) NOT NULL
    `);
  }
}
