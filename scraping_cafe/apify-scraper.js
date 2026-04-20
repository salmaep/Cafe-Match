/**
 * Google Maps Cafe Scraper — Apify Edition
 *
 * Scrape data cafe + reviews (min 500) dari Google Maps
 * menggunakan Apify Cloud (compass/crawler-google-places)
 *
 * Setup:
 *   npm install apify-client dotenv
 *   Buat .env dengan APIFY_TOKEN=apify_api_xxx
 *
 * Jalankan:
 *   node apify-scraper.js
 */

import { ApifyClient } from "apify-client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// ─── KONFIGURASI ──────────────────────────────────────────
const CONFIG = {
  // Run ke-2: query berbeda dari run pertama biar nemu cafe baru, bukan re-scrape.
  // Kalau mau run ke-3, ganti lagi dengan keyword lain (brunch, dessert cafe, dll).
  searchQueries: [
    // "warung kopi",
    // "kedai kopi",
    // "coffee bar",
    // "third wave coffee",
    // "tempat nongkrong",
    "cafe",
    "coffee",
    "roastery",
    "coffee shop",
    "kopi",
    "coffeeshop",
  ], // Lokasi di-handle via customGeolocation, jangan duplikat di sini
  city: "Bandung",
  maxCafesPerQuery: 300,
  minReviews: 20,
  maxReviews: 80,
  language: "id",

  // Bounding box Kota Bandung proper (~167 km²).
  // NW: 107.555, -6.855 · SE: 107.730, -6.990
  // Dago Atas utara, Buahbatu selatan, Cihampelas barat, Ujungberung timur.
  kotaBandungBbox: {
    minLat: -6.99,
    maxLat: -6.855,
    minLng: 107.555,
    maxLng: 107.73,
  },

  outputDir: "./output",
  reviewsDir: "./output/reviews",
};

// ─── APIFY CLIENT ─────────────────────────────────────────
const client = new ApifyClient({
  token: process.env.APIFY_TOKEN,
});

// ─── MAIN: SCRAPE CAFES ───────────────────────────────────
async function scrapeCafes() {
  console.log("🔍 Memulai scraping cafe dari Google Maps...");
  console.log(`   Queries (${CONFIG.searchQueries.length}):`);
  CONFIG.searchQueries.forEach((q) => console.log(`     - "${q}"`));
  console.log(
    `   Target: ${CONFIG.maxCafesPerQuery} cafe/query, min ${CONFIG.minReviews} reviews/cafe\n`,
  );

  // Jalankan Apify Actor untuk Google Maps
  const bbox = CONFIG.kotaBandungBbox;
  const run = await client.actor("compass/crawler-google-places").call({
    // Search settings
    searchStringsArray: CONFIG.searchQueries,
    // customGeolocation paksa actor scan HANYA di dalam polygon Kota Bandung,
    // jauh lebih presisi daripada locationQuery (yang sering bocor ke metro area).
    customGeolocation: {
      type: "Polygon",
      coordinates: [
        [
          [bbox.minLng, bbox.maxLat], // NW
          [bbox.maxLng, bbox.maxLat], // NE
          [bbox.maxLng, bbox.minLat], // SE
          [bbox.minLng, bbox.minLat], // SW
          [bbox.minLng, bbox.maxLat], // close
        ],
      ],
    },
    maxCrawledPlacesPerSearch: CONFIG.maxCafesPerQuery,
    language: CONFIG.language,
    countryCode: "id",

    // Review settings — ini yang penting untuk dapat 500+ reviews
    maxReviews: CONFIG.maxReviews,
    reviewsSort: "newest", // newest, mostRelevant, highestRating, lowestRating
    reviewsTranslation: "originalAndTranslated",

    // Data yang di-include
    includeWebResults: false,
    includeHistogram: true,
    includePeopleAlsoSearch: false,
    includeOpeningHours: true,

    // Anti-detection
    maxImages: 5,
    maxAutomaticZoomOut: 3,

    // Proxy (Apify menyediakan built-in proxy)
    proxyConfig: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"], // Residential proxy lebih aman
    },
  });

  console.log(`✅ Scraping selesai! Run ID: ${run.defaultDatasetId}\n`);

  // Ambil hasil dari dataset
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  return items;
}

// ─── TRANSFORM DATA ───────────────────────────────────────
function transformCafeData(rawItem) {
  return {
    // Identitas
    name: rawItem.title || rawItem.name || "Unknown",
    placeId: rawItem.placeId || null,
    cid: rawItem.cid || null,

    // Lokasi
    address: rawItem.address || null,
    neighborhood: rawItem.neighborhood || null,
    city: rawItem.city || CONFIG.city,
    coordinates: {
      lat: rawItem.location?.lat || null,
      lng: rawItem.location?.lng || null,
    },
    plusCode: rawItem.plusCode || null,

    // Info bisnis
    category: rawItem.categoryName || null,
    categories: rawItem.categories || [],
    phone: rawItem.phone || null,
    website: rawItem.website || null,
    url: rawItem.url || null, // Google Maps URL

    // Rating & Reviews
    rating: rawItem.totalScore || null,
    totalReviews: rawItem.reviewsCount || 0,
    reviewsDistribution: rawItem.reviewsDistribution || null,

    // Detail tambahan
    priceLevel: rawItem.price || null,
    temporarilyClosed: rawItem.temporarilyClosed || false,
    permanentlyClosed: rawItem.permanentlyClosed || false,

    // Jam operasional
    hours: rawItem.openingHours || null,

    // Foto
    photos: (rawItem.imageUrls || []).slice(0, 5),

    // Reviews (sudah di-scrape oleh Apify)
    reviews: (rawItem.reviews || []).map((review) => ({
      author: review.name || "Anonymous",
      authorUrl: review.reviewerUrl || null,
      rating: review.stars || null,
      text: review.text || "",
      textTranslated: review.textTranslated || null,
      date: review.publishedAtDate || review.publishAt || null,
      relativeDate: review.publishAt || null,
      likesCount: review.likesCount || 0,
      responseFromOwner: review.responseFromOwnerText || null,
      reviewId: review.reviewId || null,
      reviewUrl: review.reviewUrl || null,
    })),

    // Metadata
    scrapedAt: new Date().toISOString(),
  };
}

// ─── MERGE DENGAN DATA LAMA ───────────────────────────────
function loadExistingCafes() {
  const fullPath = path.join(CONFIG.outputDir, "cafes_data.json");
  if (!fs.existsSync(fullPath)) return [];
  try {
    const raw = fs.readFileSync(fullPath, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn(`⚠️  Gagal baca cafes_data.json lama: ${e.message}`);
    return [];
  }
}

function keyOfCafe(cafe) {
  return cafe.placeId || cafe.cid || `${cafe.name || ""}|${cafe.address || ""}`;
}

function mergeCafes(existing, fresh) {
  const byKey = new Map();
  for (const cafe of existing) byKey.set(keyOfCafe(cafe), cafe);

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const cafe of fresh) {
    const key = keyOfCafe(cafe);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, cafe);
      added++;
      continue;
    }
    // Duplikat: pilih versi dengan review lebih banyak, refresh metadata
    const prevReviews = prev.reviews?.length || 0;
    const freshReviews = cafe.reviews?.length || 0;
    if (freshReviews > prevReviews) {
      byKey.set(key, cafe);
      updated++;
    } else {
      unchanged++;
    }
  }

  return { merged: Array.from(byKey.values()), added, updated, unchanged };
}

// ─── SAVE OUTPUT ──────────────────────────────────────────
function saveOutput(cafes) {
  // Buat direktori output
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  fs.mkdirSync(CONFIG.reviewsDir, { recursive: true });

  // 1. Save full data (JSON)
  const fullPath = path.join(CONFIG.outputDir, "cafes_data.json");
  fs.writeFileSync(fullPath, JSON.stringify(cafes, null, 2), "utf-8");
  console.log(`📁 Full data: ${fullPath}`);

  // 2. Save summary CSV
  const csvHeader = [
    "name",
    "address",
    "rating",
    "totalReviews",
    "reviewsScraped",
    "phone",
    "website",
    "category",
    "priceLevel",
    "lat",
    "lng",
    "googleMapsUrl",
  ].join(",");

  const csvRows = cafes.map((c) =>
    [
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${(c.address || "").replace(/"/g, '""')}"`,
      c.rating,
      c.totalReviews,
      c.reviews.length,
      `"${c.phone || ""}"`,
      `"${c.website || ""}"`,
      `"${(c.category || "").replace(/"/g, '""')}"`,
      `"${c.priceLevel || ""}"`,
      c.coordinates.lat,
      c.coordinates.lng,
      `"${c.url || ""}"`,
    ].join(","),
  );

  const csvContent = [csvHeader, ...csvRows].join("\n");
  const csvPath = path.join(CONFIG.outputDir, "cafes_summary.csv");
  fs.writeFileSync(csvPath, csvContent, "utf-8");
  console.log(`📊 Summary CSV: ${csvPath}`);

  // 3. Save reviews per cafe (separate files)
  cafes.forEach((cafe) => {
    const safeName = cafe.name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase()
      .slice(0, 50);

    const reviewPath = path.join(CONFIG.reviewsDir, `${safeName}.json`);
    fs.writeFileSync(
      reviewPath,
      JSON.stringify(
        {
          cafeName: cafe.name,
          placeId: cafe.placeId,
          totalReviews: cafe.totalReviews,
          reviewsScraped: cafe.reviews.length,
          reviews: cafe.reviews,
        },
        null,
        2,
      ),
      "utf-8",
    );
  });
  console.log(`💬 Individual reviews: ${CONFIG.reviewsDir}/`);
}

// ─── PRINT SUMMARY ───────────────────────────────────────
function printSummary(cafes) {
  console.log("\n" + "═".repeat(60));
  console.log("📊 RINGKASAN SCRAPING");
  console.log("═".repeat(60));
  console.log(`Total cafe ditemukan : ${cafes.length}`);

  const totalReviews = cafes.reduce((sum, c) => sum + c.reviews.length, 0);
  console.log(`Total reviews        : ${totalReviews.toLocaleString()}`);

  const cafesWithMinReviews = cafes.filter(
    (c) => c.reviews.length >= CONFIG.minReviews,
  );
  console.log(
    `Cafe ≥${CONFIG.minReviews} reviews  : ${cafesWithMinReviews.length}`,
  );

  const avgRating =
    cafes.reduce((sum, c) => sum + (c.rating || 0), 0) / cafes.length;
  console.log(`Rata-rata rating     : ${avgRating.toFixed(2)}`);

  console.log("\n📋 Top 10 Cafe by Reviews:");
  cafes
    .sort((a, b) => b.reviews.length - a.reviews.length)
    .slice(0, 10)
    .forEach((c, i) => {
      console.log(
        `   ${i + 1}. ${c.name} — ⭐${c.rating} — ${c.reviews.length} reviews`,
      );
    });

  // Cafe yang reviewnya kurang dari minimum
  const underMinimum = cafes.filter(
    (c) => c.reviews.length < CONFIG.minReviews,
  );
  if (underMinimum.length > 0) {
    console.log(
      `\n⚠️  ${underMinimum.length} cafe dengan <${CONFIG.minReviews} reviews:`,
    );
    underMinimum.forEach((c) => {
      console.log(
        `   - ${c.name}: ${c.reviews.length} reviews (total: ${c.totalReviews})`,
      );
    });
    console.log("   Tip: Cafe ini mungkin memang punya <500 reviews di GMaps.");
  }

  console.log("═".repeat(60) + "\n");
}

// ─── RUN ──────────────────────────────────────────────────
async function main() {
  try {
    // Step 1: Scrape
    const rawItems = await scrapeCafes();

    if (!rawItems || rawItems.length === 0) {
      console.error(
        "❌ Tidak ada data yang ditemukan. Cek query dan konfigurasi.",
      );
      process.exit(1);
    }

    console.log(`📦 Raw data: ${rawItems.length} tempat ditemukan`);

    // Step 2: Dedupe berdasarkan placeId (fallback ke cid / name+address)
    const seen = new Map();
    for (const item of rawItems) {
      const key =
        item.placeId ||
        item.cid ||
        `${item.title || item.name}|${item.address || ""}`;
      if (!seen.has(key)) seen.set(key, item);
    }
    const dedupedItems = Array.from(seen.values());
    const duplicates = rawItems.length - dedupedItems.length;
    console.log(
      `🧹 Dedupe: ${dedupedItems.length} unik (${duplicates} duplikat dibuang)`,
    );

    // Step 2.5: Filter area Bandung.
    // Terima cafe kalau:
    //   (a) koordinatnya di dalam bbox Kota Bandung proper, ATAU
    //   (b) city/address-nya mengandung "bandung" (cover Kab Bandung, Bandung Barat, Cimahi, dll)
    // Ditolak cuma kalau keduanya gagal (misal hasil bocor ke Sumedang, Garut, dll).
    const bbox = CONFIG.kotaBandungBbox;
    let inBboxCount = 0;
    let outsideBboxButBandungCount = 0;
    const inBandung = dedupedItems.filter((item) => {
      const lat = item.location?.lat;
      const lng = item.location?.lng;

      const inBbox =
        lat != null &&
        lng != null &&
        lat >= bbox.minLat &&
        lat <= bbox.maxLat &&
        lng >= bbox.minLng &&
        lng <= bbox.maxLng;

      if (inBbox) {
        inBboxCount++;
        return true;
      }

      const city = (item.city || "").toLowerCase();
      const address = (item.address || "").toLowerCase();
      const mentionsBandung =
        city.includes("bandung") || address.includes("bandung");

      if (mentionsBandung) {
        outsideBboxButBandungCount++;
        return true;
      }
      return false;
    });
    const rejected = dedupedItems.length - inBandung.length;
    console.log(`📍 Filter Bandung: ${inBandung.length} cafe diterima`);
    console.log(`   - ${inBboxCount} di dalam Kota Bandung bbox`);
    console.log(
      `   - ${outsideBboxButBandungCount} di luar bbox tapi area Bandung`,
    );
    if (rejected > 0) {
      console.log(`   - ${rejected} dibuang (bukan area Bandung)`);
    }

    // Step 3: Transform
    const freshCafes = inBandung.map(transformCafeData);

    // Step 4: Merge dengan data lama (cafes_data.json di output/)
    const existing = loadExistingCafes();
    if (existing.length > 0) {
      console.log(`📂 Data lama ditemukan: ${existing.length} cafe`);
    }
    const { merged, added, updated, unchanged } = mergeCafes(
      existing,
      freshCafes,
    );
    console.log(
      `🔀 Merge: +${added} baru, ~${updated} diupdate (review lebih banyak), =${unchanged} tidak berubah`,
    );
    console.log(`   Total sekarang: ${merged.length} cafe unik\n`);

    // Step 5: Save (cumulative)
    saveOutput(merged);

    // Step 6: Summary
    printSummary(merged);

    console.log("✅ Selesai! Cek folder ./output untuk hasilnya.");
  } catch (error) {
    console.error("❌ Error:", error.message);

    if (error.message.includes("token")) {
      console.error("💡 Pastikan APIFY_TOKEN sudah di-set di file .env");
    }
    if (error.message.includes("limit")) {
      console.error(
        "💡 Free tier mungkin sudah habis. Cek usage di dashboard Apify.",
      );
    }

    process.exit(1);
  }
}

main();
