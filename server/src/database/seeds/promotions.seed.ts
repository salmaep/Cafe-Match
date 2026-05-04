/**
 * Standalone promotion seeder. Unlike `cafe-scraping.seed.ts`, this script
 * does NOT wipe any cafe data — it just attaches more `featured_promo` and
 * `new_cafe` promotions to top-rated cafes that don't already have one.
 *
 * Run with:  npm run seed:promotions
 *
 * Re-running is safe (idempotent): cafes that already have an active
 * promotion are skipped, so the script can be invoked any time you want
 * to top-up sponsored inventory.
 */
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const TYPE_A_TEMPLATES = [
  {
    openingSince: 'April 2026',
    highlightText: "Bandung's newest specialty coffee destination — freshly opened with handpicked beans and panoramic views.",
    keunggulan: ['Rooftop seating', 'Specialty coffee', 'Free WiFi 50 Mbps'],
    promoOffer: 'Grand Opening: Buy 1 Get 1 all beverages this month!',
  },
  {
    openingSince: 'March 2026',
    highlightText: "A fresh face in Bandung's cafe scene — modern interior with a full brunch menu and artisan pastries.",
    keunggulan: ['Full brunch menu', 'Artisan pastries', 'Power outlets at every table'],
    promoOffer: 'Opening Month: Free dessert with any main course!',
  },
  {
    openingSince: 'April 2026',
    highlightText: "New on the block — cozy atmosphere perfect for WFH, with single-origin pour-over and homemade cakes.",
    keunggulan: ['Single-origin coffee', 'Homemade cakes', 'Quiet workspace'],
    promoOffer: 'First 50 visitors get a free signature latte!',
  },
  {
    openingSince: 'February 2026',
    highlightText: "Just opened in the heart of Dago — minimalist Scandinavian vibes with locally-roasted beans.",
    keunggulan: ['Scandinavian interior', 'Local roastery', 'Photogenic spot'],
    promoOffer: 'Soft Opening: 30% off everything until end of month!',
  },
  {
    openingSince: 'May 2026',
    highlightText: "Brand new co-working cafe — fast WiFi, ergonomic seating, and a quiet zone for deep work.",
    keunggulan: ['100 Mbps WiFi', 'Ergonomic seating', 'Quiet zone'],
    promoOffer: 'Launch Week: Free 1-hour parking with any order!',
  },
  {
    openingSince: 'March 2026',
    highlightText: "Newly opened bakery + cafe — sourdough fresh out of the oven daily, paired with house-blend coffee.",
    keunggulan: ['Daily fresh sourdough', 'House-blend coffee', 'Pet-friendly patio'],
    promoOffer: 'Open House: Complimentary pastry sample with every coffee!',
  },
];

const TYPE_B_TEMPLATES = [
  {
    title: 'Live Music Every Weekend!',
    description: 'Enjoy live acoustic performances every Friday & Saturday night. Free entry with any drink purchase.',
    validHours: '19:00 - 22:00',
    validDays: 'Jumat – Sabtu',
    highlightedFacilities: '["cozy_seating", "outdoor_seating"]',
  },
  {
    title: 'Buy 1 Get 1 All Lattes!',
    description: 'Every Monday-Wednesday, buy any latte and get the second one free. Perfect for catching up with friends.',
    validHours: '09:00 - 17:00',
    validDays: 'Senin – Rabu',
    highlightedFacilities: '["strong_wifi", "power_outlets"]',
  },
  {
    title: 'New Seasonal Menu Available!',
    description: 'Try our new Mango Coconut Cold Brew and Matcha Croissant. Limited time only!',
    validHours: '10:00 - 22:00',
    validDays: 'Setiap Hari',
    highlightedFacilities: '["cozy_seating"]',
  },
  {
    title: 'Happy Hour 4–7 PM!',
    description: 'All espresso-based drinks 25% off. Pair with our discounted snack platter for the perfect afternoon break.',
    validHours: '16:00 - 19:00',
    validDays: 'Senin – Jumat',
    highlightedFacilities: '["power_outlets", "cozy_seating"]',
  },
  {
    title: 'Student Discount 20%',
    description: 'Show your student ID and get 20% off your entire order. Valid for dine-in and takeaway.',
    validHours: '08:00 - 20:00',
    validDays: 'Setiap Hari',
    highlightedFacilities: '["strong_wifi", "quiet_atmosphere"]',
  },
  {
    title: 'Brunch Bundle 99k!',
    description: 'Pick any signature drink + brunch plate for only 99k. Available weekends until 2 PM.',
    validHours: '09:00 - 14:00',
    validDays: 'Sabtu – Minggu',
    highlightedFacilities: '["outdoor_seating", "cozy_seating"]',
  },
];

const OWNER_EMAIL = 'owner@cafematch.id';

async function ensureOwner(dataSource: DataSource): Promise<number> {
  let [row] = await dataSource.query(
    `SELECT id FROM users WHERE email = ? LIMIT 1`,
    [OWNER_EMAIL],
  );
  if (!row) {
    await dataSource.query(
      `INSERT INTO users (email, password_hash, name, role, friend_code)
       VALUES (?, ?, ?, ?, ?)`,
      [
        OWNER_EMAIL,
        '$2b$10$YkLCmevYrzjaI5noe.mn0eVp0.OOaC2oiMcNhEXkmy47WGptYTX2y', // bcrypt('demo123')
        'Demo Owner',
        'owner',
        Math.random().toString(36).slice(2, 10).toUpperCase(),
      ],
    );
    [row] = await dataSource.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [OWNER_EMAIL],
    );
    console.log(`  Created owner user ${OWNER_EMAIL} / demo123`);
  }
  return row.id;
}

async function pickPromoCandidates(
  dataSource: DataSource,
  type: 'new_cafe' | 'featured_promo',
  count: number,
): Promise<any[]> {
  // Top-rated cafes that don't already have an active promotion
  return dataSource.query(
    `
      SELECT c.id, c.name, c.google_rating AS googleRating,
             (SELECT url FROM cafe_photos ph WHERE ph.cafe_id = c.id ORDER BY display_order ASC LIMIT 1) AS primaryPhoto
      FROM cafes c
      WHERE c.is_active = TRUE
        AND c.has_active_promotion = FALSE
        AND c.google_rating >= 4.3
      ORDER BY c.google_rating DESC, c.total_google_reviews DESC, RAND()
      LIMIT ?
    `,
    [count],
  );
}

async function seedPromotions(dataSource: DataSource) {
  // Pre-flight: do we have advertisement packages?
  const packages = await dataSource.query(
    `SELECT id, slug FROM advertisement_packages ORDER BY display_order DESC`,
  );
  if (!packages || packages.length === 0) {
    console.warn('  No advertisement_packages — run main seed first');
    return;
  }

  const ownerId = await ensureOwner(dataSource);

  // ── Type A: new_cafe ────────────────────────────────────────────────
  const typeACandidates = await pickPromoCandidates(
    dataSource,
    'new_cafe',
    TYPE_A_TEMPLATES.length,
  );
  console.log(`\n--- Type A (new_cafe) ---`);
  if (typeACandidates.length === 0) {
    console.log('  No eligible cafes (all top-rated cafes already promoted)');
  }
  for (let i = 0; i < typeACandidates.length; i++) {
    const cafe = typeACandidates[i];
    const tpl = TYPE_A_TEMPLATES[i];
    const pkg = packages[i % packages.length];

    const newCafeContent = {
      openingSince: tpl.openingSince,
      highlightText: tpl.highlightText,
      keunggulan: tpl.keunggulan,
      promoOffer: tpl.promoOffer,
      promoPhoto: cafe.primaryPhoto || null,
    };

    await dataSource.query(
      `INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, started_at, expires_at)
       VALUES (?, ?, 'new_cafe', 'monthly', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`,
      [cafe.id, pkg.id],
    );
    await dataSource.query(
      `UPDATE cafes
       SET has_active_promotion = TRUE,
           active_promotion_type = 'new_cafe',
           new_cafe_content = ?,
           owner_id = COALESCE(owner_id, ?)
       WHERE id = ?`,
      [JSON.stringify(newCafeContent), ownerId, cafe.id],
    );
    console.log(`  ✓ ${cafe.name} (★ ${cafe.googleRating})`);
  }

  // ── Type B: featured_promo ──────────────────────────────────────────
  const typeBCandidates = await pickPromoCandidates(
    dataSource,
    'featured_promo',
    TYPE_B_TEMPLATES.length,
  );
  console.log(`\n--- Type B (featured_promo) ---`);
  if (typeBCandidates.length === 0) {
    console.log('  No eligible cafes (all top-rated cafes already promoted)');
  }
  for (let i = 0; i < typeBCandidates.length; i++) {
    const cafe = typeBCandidates[i];
    const tpl = TYPE_B_TEMPLATES[i];
    const pkg = packages[i % packages.length];

    const promotionContent = {
      title: tpl.title,
      description: tpl.description,
      validHours: tpl.validHours,
      validDays: tpl.validDays,
      promoPhoto: cafe.primaryPhoto || null,
    };

    await dataSource.query(
      `INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, content_photo_url, highlighted_facilities, started_at, expires_at)
       VALUES (?, ?, 'featured_promo', 'monthly', 'active', ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`,
      [cafe.id, pkg.id, tpl.title, tpl.description, cafe.primaryPhoto || null, tpl.highlightedFacilities],
    );
    await dataSource.query(
      `UPDATE cafes
       SET has_active_promotion = TRUE,
           active_promotion_type = 'featured_promo',
           promotion_content = ?,
           owner_id = COALESCE(owner_id, ?)
       WHERE id = ?`,
      [JSON.stringify(promotionContent), ownerId, cafe.id],
    );
    console.log(`  ✓ ${cafe.name} (★ ${cafe.googleRating}) → ${tpl.title}`);
  }

  // Summary
  const [{ totalActive }] = await dataSource.query(
    `SELECT COUNT(*) AS totalActive FROM promotions WHERE status = 'active' AND expires_at > NOW()`,
  );
  console.log(`\n  Total active promotions in DB: ${totalActive}`);
}

async function run() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'cafematch',
    entities: [],
  });

  await dataSource.initialize();
  console.log('Database connected.');
  await seedPromotions(dataSource);
  await dataSource.destroy();
  console.log('\nDone!');
}

run().catch((err) => {
  console.error('Promotion seed failed:', err);
  process.exit(1);
});
