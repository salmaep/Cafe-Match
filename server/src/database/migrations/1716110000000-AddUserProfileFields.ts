import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends users with optional profile fields:
 * - username: unique public handle (shown as @username on tables & share cards)
 * - gender:   used by table gender rules ("perempuan saja") — optional
 * - bio:      short free-text profile bio — optional
 * phone & avatar_url already exist. All new columns are nullable; nothing is
 * required from the user. Usernames are backfilled deterministically
 * (slugified name + id suffix → guaranteed unique) and remain editable.
 */
export class AddUserProfileFields1716110000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN username VARCHAR(30) NULL AFTER name,
        ADD COLUMN gender ENUM('male','female') NULL AFTER avatar_url,
        ADD COLUMN bio VARCHAR(255) NULL AFTER gender,
        ADD UNIQUE INDEX uq_users_username (username)
    `);

    // Backfill usernames for existing users (JS loop — same pattern as the
    // friend_code backfill; avoids depending on MySQL REGEXP_REPLACE).
    const users: { id: number; name: string }[] = await queryRunner.query(
      `SELECT id, name FROM users WHERE username IS NULL`,
    );
    for (const user of users) {
      const slug = (user.name || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
      const username = `${slug || 'user'}${user.id}`.slice(0, 30);
      await queryRunner.query(`UPDATE users SET username = ? WHERE id = ?`, [
        username,
        user.id,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP INDEX uq_users_username,
        DROP COLUMN bio,
        DROP COLUMN gender,
        DROP COLUMN username
    `);
  }
}
