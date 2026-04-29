"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedScrapedCafes = seedScrapedCafes;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SCRAPING_DIR = path.resolve(__dirname, '../../../../scraping_cafe/output');
const CAFES_JSON_PATH = path.join(SCRAPING_DIR, 'cafes_data.json');
const SCORES_JSON_PATH = path.join(SCRAPING_DIR, 'cafe-purpose-scores.json');
const OVERRIDES_JSON_PATH = path.join(SCRAPING_DIR, 'cafe-purposes-overrides.json');
const DAY_MAP = {
    senin: 'mon', selasa: 'tue', rabu: 'wed', kamis: 'thu',
    jumat: 'fri', sabtu: 'sat', minggu: 'sun',
};
function parseHours(hours) {
    if (!hours || hours.length === 0)
        return null;
    const out = {};
    for (const h of hours) {
        const key = DAY_MAP[h.day?.toLowerCase()] || h.day?.toLowerCase();
        if (!key || !h.hours)
            continue;
        const raw = h.hours.trim();
        if (/^tutup$/i.test(raw)) {
            out[key] = 'Closed';
            continue;
        }
        if (/buka\s*24/i.test(raw) || /^24\s*jam$/i.test(raw)) {
            out[key] = '00:00-23:59';
            continue;
        }
        const normalized = raw
            .replace(/\s*to\s*/i, '-')
            .replace(/\./g, ':');
        out[key] = normalized;
    }
    return Object.keys(out).length > 0 ? out : null;
}
function generateSlug(name, placeId) {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
    const suffix = placeId.slice(-8).toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${base || 'cafe'}-${suffix}`;
}
const PURPOSE_SLUG_MAP = {
    wfc: 'wfc',
    me_time: 'me-time',
    date: 'date',
    family: 'family',
    group_study: 'group-work',
};
async function seedScrapedCafes(dataSource) {
    console.log('=== Scraped Cafe Seeder ===\n');
    if (!fs.existsSync(CAFES_JSON_PATH)) {
        console.error(`Missing: ${CAFES_JSON_PATH}`);
        return;
    }
    const cafesRaw = JSON.parse(fs.readFileSync(CAFES_JSON_PATH, 'utf-8'));
    console.log(`Loaded ${cafesRaw.length} scraped cafes`);
    let scoresMap = new Map();
    if (fs.existsSync(SCORES_JSON_PATH)) {
        const scoresList = JSON.parse(fs.readFileSync(SCORES_JSON_PATH, 'utf-8'));
        for (const s of scoresList)
            scoresMap.set(s.placeId, s);
        console.log(`Loaded purpose scores for ${scoresMap.size} cafes`);
    }
    else {
        console.warn(`No ${SCORES_JSON_PATH} found — skipping purpose tagging`);
    }
    if (fs.existsSync(OVERRIDES_JSON_PATH)) {
        try {
            const raw = JSON.parse(fs.readFileSync(OVERRIDES_JSON_PATH, 'utf-8'));
            const overrides = raw.overrides || {};
            let applied = 0;
            for (const [placeId, override] of Object.entries(overrides)) {
                const ov = override;
                const existing = scoresMap.get(placeId);
                if (!existing)
                    continue;
                if (Array.isArray(ov.topPurposes)) {
                    existing.purposeScores = {
                        wfc: ov.topPurposes.includes('wfc') ? 100 : 0,
                        me_time: ov.topPurposes.includes('me_time') ? 100 : 0,
                        date: ov.topPurposes.includes('date') ? 100 : 0,
                        family: ov.topPurposes.includes('family') ? 100 : 0,
                        group_study: ov.topPurposes.includes('group_study') ? 100 : 0,
                    };
                    existing.topPurposes = ov.topPurposes;
                }
                if (Array.isArray(ov.detectedFacilities)) {
                    existing.detectedFacilities = ov.detectedFacilities;
                }
                applied++;
            }
            if (applied > 0) {
                console.log(`Applied manual overrides for ${applied} cafes`);
            }
        }
        catch (err) {
            console.warn(`Failed to parse overrides: ${err.message}`);
        }
    }
    console.log('\n--- Wiping old cafe data ---');
    await wipeOldCafeData(dataSource);
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    for (const c of cafesRaw) {
        if (!c.placeId || !c.coordinates?.lat || !c.coordinates?.lng) {
            errors++;
            continue;
        }
        try {
            const [existing] = await dataSource.query(`SELECT id FROM cafes WHERE google_place_id = ? LIMIT 1`, [c.placeId]);
            if (existing) {
                skipped++;
                continue;
            }
            const slug = generateSlug(c.name, c.placeId);
            const isActive = !(c.temporarilyClosed || c.permanentlyClosed);
            const openingHours = parseHours(c.hours);
            const googleMapsUrl = c.url || `https://maps.google.com/?q=${c.coordinates.lat},${c.coordinates.lng}`;
            const scores = scoresMap.get(c.placeId);
            const detectedFacilities = scores?.detectedFacilities || [];
            const wifiAvailable = detectedFacilities.includes('wifi');
            const hasMushola = detectedFacilities.includes('mushola');
            const hasParking = detectedFacilities.includes('parking');
            const result = await dataSource.query(`INSERT INTO cafes (
          name, slug, description, address, latitude, longitude, location,
          phone, google_place_id, google_maps_url, website,
          wifi_available, has_mushola, has_parking,
          opening_hours, price_range,
          google_rating, total_google_reviews,
          has_active_promotion, active_promotion_type,
          promotion_content, new_cafe_content, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ST_PointFromText(CONCAT('POINT(', ?, ' ', ?, ')'), 4326), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                c.name,
                slug,
                null,
                c.address,
                c.coordinates.lat,
                c.coordinates.lng,
                c.coordinates.lat,
                c.coordinates.lng,
                c.phone || null,
                c.placeId,
                googleMapsUrl,
                c.website || null,
                wifiAvailable,
                hasMushola,
                hasParking,
                openingHours ? JSON.stringify(openingHours) : null,
                '$$',
                c.rating ?? null,
                c.totalReviews ?? null,
                false,
                null,
                null,
                null,
                isActive,
            ]);
            const cafeId = result.insertId;
            if (c.photos && c.photos.length > 0) {
                for (let i = 0; i < Math.min(c.photos.length, 10); i++) {
                    await dataSource.query(`INSERT INTO cafe_photos (cafe_id, url, source, display_order, is_primary)
             VALUES (?, ?, 'google', ?, ?)`, [cafeId, c.photos[i], i, i === 0]);
                }
            }
            for (const fac of detectedFacilities) {
                try {
                    await dataSource.query(`INSERT INTO cafe_facilities (cafe_id, facility_key) VALUES (?, ?)`, [cafeId, fac]);
                }
                catch {
                }
            }
            if (scores) {
                for (const [rawPurpose, score] of Object.entries(scores.purposeScores)) {
                    if (score < 40)
                        continue;
                    const purposeSlug = PURPOSE_SLUG_MAP[rawPurpose] || rawPurpose;
                    await dataSource.query(`INSERT INTO cafe_purpose_tags (cafe_id, purpose_slug, score) VALUES (?, ?, ?)`, [cafeId, purposeSlug, score]);
                }
            }
            inserted++;
            if (inserted % 50 === 0) {
                console.log(`  Inserted ${inserted}/${cafesRaw.length}...`);
            }
        }
        catch (err) {
            console.error(`Error on ${c.name}: ${err.message}`);
            errors++;
        }
    }
    console.log(`\n=== Cafe seeding done ===`);
    console.log(`  Inserted: ${inserted}`);
    console.log(`  Skipped (existing): ${skipped}`);
    console.log(`  Errors: ${errors}`);
    console.log('\n--- Assigning promotions to scraped cafes ---');
    await assignPromotions(dataSource);
}
async function wipeOldCafeData(dataSource) {
    const deletes = [
        { table: 'cafe_analytics' },
        { table: 'checkins' },
        { table: 'review_ratings' },
        { table: 'reviews' },
        { table: 'together_counts' },
        { table: 'user_streaks', where: 'cafe_id IS NOT NULL' },
        { table: 'cafe_votes' },
        { table: 'bookmarks' },
        { table: 'favorites' },
        { table: 'cafe_purpose_tags' },
        { table: 'cafe_facilities' },
        { table: 'cafe_menus' },
        { table: 'cafe_photos' },
        { table: 'promotions' },
        { table: 'cafes' },
    ];
    for (const d of deletes) {
        try {
            const sql = d.where ? `DELETE FROM ${d.table} WHERE ${d.where}` : `DELETE FROM ${d.table}`;
            const result = await dataSource.query(sql);
            const affected = result?.affectedRows ?? 0;
            if (affected > 0)
                console.log(`  Deleted ${affected} rows from ${d.table}`);
        }
        catch (err) {
            if (!/doesn't exist|ER_NO_SUCH_TABLE/.test(err.message)) {
                console.warn(`  Warning deleting from ${d.table}: ${err.message}`);
            }
        }
    }
    try {
        await dataSource.query(`ALTER TABLE cafes AUTO_INCREMENT = 1`);
    }
    catch { }
}
async function assignPromotions(dataSource) {
    const packages = await dataSource.query(`SELECT id, slug FROM advertisement_packages ORDER BY display_order DESC`);
    if (!packages || packages.length === 0) {
        console.warn('  No advertisement_packages found — skipping promo assignment');
        return;
    }
    const pkgByPriority = packages;
    const topCafes = await dataSource.query(`
    SELECT c.id, c.name, c.google_rating AS googleRating, c.total_google_reviews AS totalReviews,
           (SELECT url FROM cafe_photos ph WHERE ph.cafe_id = c.id ORDER BY display_order ASC LIMIT 1) AS primaryPhoto
    FROM cafes c
    WHERE c.is_active = TRUE
      AND c.google_rating >= 4.6
      AND c.total_google_reviews >= 100
    ORDER BY c.google_rating DESC, c.total_google_reviews DESC
    LIMIT 20
  `);
    if (topCafes.length < 6) {
        console.warn(`  Only ${topCafes.length} top-rated cafes found — need at least 6`);
        return;
    }
    console.log(`  Picked top ${topCafes.length} cafes for promo pool`);
    const shuffled = [...topCafes].sort(() => Math.random() - 0.5);
    const typeACafes = shuffled.slice(0, 3);
    const typeBCafes = shuffled.slice(3, 6);
    const OWNER_EMAIL = 'owner@cafematch.id';
    let [ownerRow] = await dataSource.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [OWNER_EMAIL]);
    if (!ownerRow) {
        await dataSource.query(`INSERT INTO users (email, password_hash, name, role, friend_code)
       VALUES (?, ?, ?, ?, ?)`, [
            OWNER_EMAIL,
            '$2b$10$YkLCmevYrzjaI5noe.mn0eVp0.OOaC2oiMcNhEXkmy47WGptYTX2y',
            'Demo Owner',
            'owner',
            Math.random().toString(36).slice(2, 10).toUpperCase(),
        ]);
        [ownerRow] = await dataSource.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [OWNER_EMAIL]);
        console.log(`  Created fresh owner: ${OWNER_EMAIL} / demo123`);
    }
    const ownerId = ownerRow.id;
    const typeATemplates = [
        {
            openingSince: 'April 2026',
            highlightText: "Bandung's newest specialty coffee destination — freshly opened with a handpicked bean selection and panoramic views.",
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
    ];
    const typeBTemplates = [
        {
            title: 'Live Music Every Weekend!',
            description: 'Enjoy live acoustic performances every Friday & Saturday night. Free entry with any drink purchase.',
            validHours: '19:00 - 22:00',
            validDays: 'Jumat – Sabtu',
            sqlTitle: 'Live Music Every Weekend!',
            sqlDesc: 'Enjoy live acoustic performances every Friday & Saturday night. Free entry with any drink purchase.',
            highlightedFacilities: '["cozy_seating", "outdoor_seating"]',
        },
        {
            title: 'Buy 1 Get 1 All Lattes!',
            description: 'Every Monday-Wednesday, buy any latte and get the second one free. Perfect for catching up with friends.',
            validHours: '09:00 - 17:00',
            validDays: 'Senin – Rabu',
            sqlTitle: 'Buy 1 Get 1 All Lattes!',
            sqlDesc: 'Every Monday-Wednesday, buy any latte and get the second one free. Perfect for catching up with friends.',
            highlightedFacilities: '["strong_wifi", "power_outlets"]',
        },
        {
            title: 'New Seasonal Menu Available!',
            description: 'Try our new Mango Coconut Cold Brew and Matcha Croissant. Limited time only!',
            validHours: '10:00 - 22:00',
            validDays: 'Setiap Hari',
            sqlTitle: 'New Seasonal Menu Available!',
            sqlDesc: 'Try our new Mango Coconut Cold Brew and Matcha Croissant. Limited time only!',
            highlightedFacilities: '["cozy_seating"]',
        },
    ];
    for (let i = 0; i < typeACafes.length; i++) {
        const cafe = typeACafes[i];
        const tpl = typeATemplates[i];
        const pkg = pkgByPriority[i % pkgByPriority.length];
        const newCafeContent = {
            openingSince: tpl.openingSince,
            highlightText: tpl.highlightText,
            keunggulan: tpl.keunggulan,
            promoOffer: tpl.promoOffer,
            promoPhoto: cafe.primaryPhoto || null,
        };
        await dataSource.query(`INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, started_at, expires_at)
       VALUES (?, ?, 'new_cafe', 'monthly', 'active', NULL, NULL, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`, [cafe.id, pkg.id]);
        await dataSource.query(`UPDATE cafes
       SET has_active_promotion = TRUE,
           active_promotion_type = 'new_cafe',
           new_cafe_content = ?,
           owner_id = ?
       WHERE id = ?`, [JSON.stringify(newCafeContent), ownerId, cafe.id]);
        console.log(`  Type A → ${cafe.name} (rating ${cafe.googleRating})`);
    }
    for (let i = 0; i < typeBCafes.length; i++) {
        const cafe = typeBCafes[i];
        const tpl = typeBTemplates[i];
        const pkg = pkgByPriority[i % pkgByPriority.length];
        const promotionContent = {
            title: tpl.title,
            description: tpl.description,
            validHours: tpl.validHours,
            validDays: tpl.validDays,
            promoPhoto: cafe.primaryPhoto || null,
        };
        await dataSource.query(`INSERT INTO promotions (cafe_id, package_id, type, billing_cycle, status, content_title, content_description, content_photo_url, highlighted_facilities, started_at, expires_at)
       VALUES (?, ?, 'featured_promo', 'monthly', 'active', ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))`, [cafe.id, pkg.id, tpl.sqlTitle, tpl.sqlDesc, cafe.primaryPhoto || null, tpl.highlightedFacilities]);
        await dataSource.query(`UPDATE cafes
       SET has_active_promotion = TRUE,
           active_promotion_type = 'featured_promo',
           promotion_content = ?,
           owner_id = ?
       WHERE id = ?`, [JSON.stringify(promotionContent), ownerId, cafe.id]);
        console.log(`  Type B → ${cafe.name} (rating ${cafe.googleRating})`);
    }
    console.log(`\n  ✓ Promoted 6 cafes (3 Type A + 3 Type B), all owned by user ${ownerId}`);
}
//# sourceMappingURL=cafe-scraping.seed.js.map