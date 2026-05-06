import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDestinations1714100000000 implements MigrationInterface {
  name = 'AddDestinations1714100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE destinations (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        label VARCHAR(100) NOT NULL,
        sublabel VARCHAR(100) NULL,
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        INDEX idx_destinations_active_order (is_active, display_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await queryRunner.query(`
      INSERT INTO destinations (label, sublabel, latitude, longitude, display_order) VALUES
        ('Dago', 'Bandung', -6.8800000, 107.6100000, 0),
        ('Tebet', 'Jakarta Selatan', -6.2241000, 106.8446000, 1),
        ('Bandung', 'Kota Bandung', -6.9175000, 107.6191000, 2),
        ('Jakarta Selatan', 'DKI Jakarta', -6.2615000, 106.8106000, 3)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS destinations`);
  }
}
