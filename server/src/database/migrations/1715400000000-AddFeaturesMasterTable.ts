import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Introduce master `features` lookup table:
 *   - cafe_features.{name, category} → cafe_features.feature_id (FK)
 *   - purpose_requirements.feature_name → purpose_requirements.feature_id (FK)
 *
 * The master table has UNIQUE(name) — same string = same canonical feature
 * regardless of which cafe submitted it. Category is "first-observed";
 * later admin curation can rename/recategorize centrally.
 *
 * Backfill steps:
 *   1. CREATE features table
 *   2. INSERT DISTINCT (name, category) from cafe_features
 *   3. Add cafe_features.feature_id, populate, drop old name/category
 *   4. Add purpose_requirements.feature_id, populate, drop old feature_name
 */
export class AddFeaturesMasterTable1715400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Master features table
    await queryRunner.query(`
      CREATE TABLE \`features\` (
        \`id\`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`name\`       VARCHAR(150) NOT NULL,
        \`category\`   VARCHAR(50)  NULL,
        \`created_at\` DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_feature_name\` (\`name\`),
        KEY \`IDX_features_category\` (\`category\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2) Backfill master from existing cafe_features. For duplicate names with
    // different categories, MySQL picks the lowest-id occurrence (deterministic
    // because of GROUP BY name).
    await queryRunner.query(`
      INSERT INTO \`features\` (name, category)
      SELECT name, MAX(category)
      FROM \`cafe_features\`
      GROUP BY name
    `);

    // 3a) cafe_features: add feature_id, populate, swap unique key
    await queryRunner.query(`
      ALTER TABLE \`cafe_features\`
        ADD COLUMN \`feature_id\` INT UNSIGNED NULL AFTER \`cafe_id\`
    `);
    await queryRunner.query(`
      UPDATE \`cafe_features\` cf
      JOIN \`features\` f ON f.name = cf.name
      SET cf.feature_id = f.id
    `);
    // Drop old unique + columns, add new unique + FK
    await queryRunner.query(
      `ALTER TABLE \`cafe_features\` DROP INDEX \`UQ_cafe_feature_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`cafe_features\` DROP COLUMN \`name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`cafe_features\` DROP COLUMN \`category\``,
    );
    await queryRunner.query(`
      ALTER TABLE \`cafe_features\`
        MODIFY \`feature_id\` INT UNSIGNED NOT NULL,
        ADD UNIQUE KEY \`UQ_cafe_feature\` (\`cafe_id\`, \`feature_id\`),
        ADD KEY \`IDX_cafe_features_feature\` (\`feature_id\`),
        ADD CONSTRAINT \`FK_cafe_features_feature\` FOREIGN KEY (\`feature_id\`) REFERENCES \`features\`(\`id\`) ON DELETE CASCADE
    `);

    // 3b) purpose_requirements: add feature_id, populate, swap
    await queryRunner.query(`
      ALTER TABLE \`purpose_requirements\`
        ADD COLUMN \`feature_id\` INT UNSIGNED NULL AFTER \`purpose_id\`
    `);
    await queryRunner.query(`
      UPDATE \`purpose_requirements\` pr
      JOIN \`features\` f ON f.name = pr.feature_name
      SET pr.feature_id = f.id
    `);
    // Best-effort: any pr.feature_name not in master gets dropped
    await queryRunner.query(
      `DELETE FROM \`purpose_requirements\` WHERE feature_id IS NULL`,
    );
    // Before dropping idx_purpose_facility, give the FK on purpose_id an
    // alternate backing index — otherwise MySQL rejects the DROP with
    // ER_DROP_INDEX_FK (1553) because idx_purpose_facility is the only index
    // whose leftmost column is purpose_id. Once UQ_purpose_feature is added
    // below, this temp index becomes redundant (the new unique key has
    // purpose_id as leftmost) and is dropped at the end of this block.
    await queryRunner.query(`
      ALTER TABLE \`purpose_requirements\`
        ADD KEY \`IDX_purpose_req_purpose_tmp\` (\`purpose_id\`)
    `);
    // Drop the legacy composite index before removing the column it references.
    // Without this, MySQL strips feature_name from the index but keeps it as a
    // UNIQUE index on (purpose_id) alone — causing ER_DUP_ENTRY on multi-req inserts.
    await queryRunner.query(`
      ALTER TABLE \`purpose_requirements\`
        DROP INDEX \`idx_purpose_facility\`
    `);
    await queryRunner.query(
      `ALTER TABLE \`purpose_requirements\` DROP COLUMN \`feature_name\``,
    );
    await queryRunner.query(`
      ALTER TABLE \`purpose_requirements\`
        MODIFY \`feature_id\` INT UNSIGNED NOT NULL,
        ADD UNIQUE KEY \`UQ_purpose_feature\` (\`purpose_id\`, \`feature_id\`),
        ADD KEY \`IDX_purpose_req_feature\` (\`feature_id\`),
        ADD CONSTRAINT \`FK_purpose_req_feature\` FOREIGN KEY (\`feature_id\`) REFERENCES \`features\`(\`id\`) ON DELETE CASCADE
    `);
    // Clean up the temp backing index — UQ_purpose_feature now covers
    // purpose_id as its leftmost column, so the FK has a permanent home.
    await queryRunner.query(`
      ALTER TABLE \`purpose_requirements\`
        DROP INDEX \`IDX_purpose_req_purpose_tmp\`
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 1) purpose_requirements: restore feature_name
    await queryRunner.query(`
      ALTER TABLE \`purpose_requirements\`
        DROP FOREIGN KEY \`FK_purpose_req_feature\`,
        DROP INDEX \`IDX_purpose_req_feature\`,
        DROP INDEX \`UQ_purpose_feature\`,
        ADD COLUMN \`feature_name\` VARCHAR(150) NOT NULL DEFAULT '' AFTER \`purpose_id\`
    `);
    await queryRunner.query(`
      UPDATE \`purpose_requirements\` pr
      JOIN \`features\` f ON f.id = pr.feature_id
      SET pr.feature_name = f.name
    `);
    await queryRunner.query(
      `ALTER TABLE \`purpose_requirements\` DROP COLUMN \`feature_id\``,
    );
    await queryRunner.query(`
      ALTER TABLE \`purpose_requirements\`
        ALTER COLUMN \`feature_name\` DROP DEFAULT,
        ADD UNIQUE KEY \`UQ_purpose_feature_name\` (\`purpose_id\`, \`feature_name\`)
    `);

    // 2) cafe_features: restore name + category
    await queryRunner.query(`
      ALTER TABLE \`cafe_features\`
        DROP FOREIGN KEY \`FK_cafe_features_feature\`,
        DROP INDEX \`IDX_cafe_features_feature\`,
        DROP INDEX \`UQ_cafe_feature\`,
        ADD COLUMN \`name\` VARCHAR(150) NOT NULL DEFAULT '' AFTER \`cafe_id\`,
        ADD COLUMN \`category\` VARCHAR(50) NULL AFTER \`name\`
    `);
    await queryRunner.query(`
      UPDATE \`cafe_features\` cf
      JOIN \`features\` f ON f.id = cf.feature_id
      SET cf.name = f.name, cf.category = f.category
    `);
    await queryRunner.query(
      `ALTER TABLE \`cafe_features\` DROP COLUMN \`feature_id\``,
    );
    await queryRunner.query(`
      ALTER TABLE \`cafe_features\`
        ALTER COLUMN \`name\` DROP DEFAULT,
        ADD UNIQUE KEY \`UQ_cafe_feature_name\` (\`cafe_id\`, \`name\`)
    `);

    // 3) drop master
    await queryRunner.query(`DROP TABLE IF EXISTS \`features\``);
  }
}
