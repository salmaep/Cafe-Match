"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1712400000000 = void 0;
class InitialSchema1712400000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE cafes (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        address VARCHAR(500) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        location POINT NOT NULL,
        phone VARCHAR(20),
        google_place_id VARCHAR(255),
        google_maps_url VARCHAR(500),
        wifi_available BOOLEAN DEFAULT FALSE,
        wifi_speed_mbps SMALLINT UNSIGNED,
        has_mushola BOOLEAN DEFAULT FALSE,
        opening_hours JSON,
        price_range ENUM('$', '$$', '$$$') DEFAULT '$$',
        bookmarks_count INT UNSIGNED DEFAULT 0,
        favorites_count INT UNSIGNED DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        SPATIAL INDEX idx_cafes_location (location),
        INDEX idx_cafes_slug (slug),
        INDEX idx_cafes_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE cafe_facilities (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        cafe_id INT UNSIGNED NOT NULL,
        facility_key VARCHAR(50) NOT NULL,
        facility_value VARCHAR(255),
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_cafe_facility (cafe_id, facility_key),
        INDEX idx_facility_key (facility_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE purposes (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        display_order SMALLINT UNSIGNED DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE purpose_requirements (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        purpose_id INT UNSIGNED NOT NULL,
        facility_key VARCHAR(50) NOT NULL,
        is_mandatory BOOLEAN DEFAULT FALSE,
        weight SMALLINT UNSIGNED DEFAULT 1,
        FOREIGN KEY (purpose_id) REFERENCES purposes(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_purpose_facility (purpose_id, facility_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE cafe_menus (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        cafe_id INT UNSIGNED NOT NULL,
        category VARCHAR(100) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        description VARCHAR(500),
        is_available BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        INDEX idx_menu_cafe (cafe_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE cafe_photos (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        cafe_id INT UNSIGNED NOT NULL,
        url VARCHAR(1000) NOT NULL,
        source ENUM('manual', 'google') NOT NULL DEFAULT 'manual',
        google_photo_ref VARCHAR(500),
        caption VARCHAR(255),
        display_order SMALLINT UNSIGNED DEFAULT 0,
        is_primary BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        INDEX idx_photo_cafe (cafe_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE bookmarks (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        cafe_id INT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_bookmark_user_cafe (user_id, cafe_id),
        INDEX idx_bookmark_cafe (cafe_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE favorites (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        cafe_id INT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE,
        UNIQUE INDEX idx_favorite_user_cafe (user_id, cafe_id),
        INDEX idx_favorite_cafe (cafe_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TABLE IF EXISTS favorites');
        await queryRunner.query('DROP TABLE IF EXISTS bookmarks');
        await queryRunner.query('DROP TABLE IF EXISTS cafe_photos');
        await queryRunner.query('DROP TABLE IF EXISTS cafe_menus');
        await queryRunner.query('DROP TABLE IF EXISTS purpose_requirements');
        await queryRunner.query('DROP TABLE IF EXISTS purposes');
        await queryRunner.query('DROP TABLE IF EXISTS cafe_facilities');
        await queryRunner.query('DROP TABLE IF EXISTS cafes');
        await queryRunner.query('DROP TABLE IF EXISTS users');
    }
}
exports.InitialSchema1712400000000 = InitialSchema1712400000000;
//# sourceMappingURL=1712400000000-InitialSchema.js.map