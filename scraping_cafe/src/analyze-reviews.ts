/**
 * analyze-reviews.ts
 *
 * Reads all review JSONs from scraping_cafe/output/reviews/, combines texts per cafe,
 * scores purpose categories via keyword analysis, detects facilities, and writes
 * scraping_cafe/output/cafe-purpose-scores.json
 *
 * Run: npx ts-node src/analyze-reviews.ts
 *      (or plain node after tsc)
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Paths ────────────────────────────────────────────────────────────────────
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const REVIEWS_DIR = path.join(OUTPUT_DIR, 'reviews');
const CAFES_DATA_PATH = path.join(OUTPUT_DIR, 'cafes_data.json');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'cafe-purpose-scores.json');

// ── Keyword sets ─────────────────────────────────────────────────────────────

type PurposeKey = 'wfc' | 'me_time' | 'date' | 'family' | 'group_study';

const PURPOSE_KEYWORDS: Record<PurposeKey, { keywords: string[]; weight: number }> = {
  wfc: {
    weight: 1.0,
    keywords: [
      'wifi', 'internet', 'colokan', 'outlet', 'stopkontak', 'stop kontak',
      'kerja', 'laptop', 'meeting', 'zoom', 'nugas', 'tugas', 'deadline',
      'sinyal', 'kenceng', 'kencang', 'ngebut', 'produktif', 'tenang buat kerja',
      'meja luas', 'meja besar', 'ngerjain', 'wfc', 'wfh', 'remote', 'working',
      'ngetik', 'skripsi', 'presentasi',
    ],
  },
  me_time: {
    weight: 1.0,
    keywords: [
      'tenang', 'sepi', 'nyaman sendiri', 'me time', 'metime', 'baca buku',
      'santai', 'cozy', 'healing', 'menyendiri', 'adem', 'relax', 'chill',
      'tenang banget', 'sendirian', 'solo', 'quiet', 'kalem', 'peaceful',
      'tenteram',
    ],
  },
  date: {
    weight: 1.0,
    keywords: [
      'romantis', 'romantic', 'date', 'kencan', 'berdua', 'intimate', 'dim light',
      'candle', 'suasana', 'instagramable', 'instagenic', 'aesthetic', 'estetik',
      'malam', 'sunset', 'view bagus', 'pemandangan', 'pacar', 'ngedate',
      'dinner', 'candlelight',
    ],
  },
  family: {
    weight: 1.0,
    keywords: [
      'anak', 'keluarga', 'family', 'bocah', 'kids', 'mainan',
      'luas', 'parkir luas', 'ramah anak', 'area bermain', 'playground',
      'kid friendly', 'kid-friendly', 'bawa anak', 'buat anak',
      'orang tua', 'rombongan keluarga',
    ],
  },
  group_study: {
    weight: 1.0,
    keywords: [
      'rame', 'ramai', 'rombongan', 'geng', 'teman', 'meja panjang',
      'kursi banyak', 'nongkrong bareng', 'gathering', 'grup', 'group',
      'bareng teman', 'kumpul', 'reunian', 'reunian', 'nongki',
      'belajar bareng', 'diskusi', 'kelompok', 'rapat',
    ],
  },
};

const FACILITY_KEYWORDS: Record<string, string[]> = {
  wifi: ['wifi', 'wi-fi', 'wi fi', 'internet', 'sinyal', 'koneksi'],
  power_outlet: ['colokan', 'stopkontak', 'stop kontak', 'outlet listrik', 'plug', 'charger'],
  mushola: ['mushola', 'musholla', 'mushalla', 'solat', 'sholat', 'prayer'],
  parking: ['parkir', 'parking', 'parkiran', 'valet'],
  quiet_atmosphere: ['tenang', 'sepi', 'kalem', 'sunyi', 'adem', 'quiet', 'peaceful'],
  large_tables: ['meja besar', 'meja luas', 'meja panjang', 'meja gede', 'meja lebar'],
  kid_friendly: ['ramah anak', 'kid friendly', 'kid-friendly', 'area bermain', 'playground', 'mainan anak'],
  outdoor_area: ['outdoor', 'luar ruangan', 'teras', 'taman', 'rooftop', 'open air', 'terrace'],
};

// ── Score calculation ───────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ');
}

// Negation words that invalidate a keyword match if found within NEG_WINDOW
// tokens BEFORE the keyword. Covers Indonesian + English.
const NEGATION_WORDS = new Set([
  'tidak', 'tdk', 'tak', 'gak', 'gk', 'ga', 'engga', 'enggak', 'bukan',
  'belum', 'blm', 'tanpa', 'kurang', 'minus',
  'no', 'not', 'dont', "don't", 'without', 'lack', 'lacks', 'lacking',
  'tak ada', 'tidak ada', 'gak ada', 'ga ada', 'no', 'none', 'nothing',
  'sayang', // "sayangnya tidak ada" — "unfortunately no"
]);

const NEG_WINDOW = 6; // tokens

/**
 * Check if a keyword match at `matchStart` in tokenized corpus is negated
 * by looking at the previous NEG_WINDOW tokens.
 */
function isNegated(tokens: string[], keywordStartTokenIdx: number): boolean {
  const from = Math.max(0, keywordStartTokenIdx - NEG_WINDOW);
  for (let i = from; i < keywordStartTokenIdx; i++) {
    const tok = tokens[i];
    if (NEGATION_WORDS.has(tok)) return true;
  }
  return false;
}

/**
 * Count non-negated occurrences of a keyword phrase in a token stream.
 * Handles multi-word keywords (e.g. "meja besar") by sliding window match.
 */
function countNonNegatedHits(tokens: string[], keyword: string): number {
  const kwTokens = keyword.toLowerCase().split(/\s+/);
  const kwLen = kwTokens.length;
  if (kwLen === 0) return 0;

  let count = 0;
  for (let i = 0; i <= tokens.length - kwLen; i++) {
    let matches = true;
    for (let j = 0; j < kwLen; j++) {
      if (tokens[i + j] !== kwTokens[j]) {
        matches = false;
        break;
      }
    }
    if (matches && !isNegated(tokens, i)) {
      count++;
    }
  }
  return count;
}

function tokenize(text: string): string[] {
  return normalizeText(text).split(/\s+/).filter(Boolean);
}

function scorePurpose(corpusTokens: string[], keywords: string[]): number {
  let hits = 0;
  for (const kw of keywords) {
    hits += countNonNegatedHits(corpusTokens, kw);
  }
  if (hits === 0) return 0;
  const score = Math.min(100, Math.round(20 + Math.log2(hits + 1) * 30));
  return score;
}

function detectFacilities(corpusTokens: string[]): string[] {
  const detected: string[] = [];
  for (const [facility, keywords] of Object.entries(FACILITY_KEYWORDS)) {
    // Require at least 2 non-negated hits OR a single very explicit positive match
    // to avoid false positives from a single ambiguous mention.
    let totalHits = 0;
    for (const kw of keywords) {
      totalHits += countNonNegatedHits(corpusTokens, kw);
    }
    if (totalHits >= 1) {
      detected.push(facility);
    }
  }
  return detected;
}

// ── Review loading ──────────────────────────────────────────────────────────

interface ReviewFile {
  cafeName: string;
  placeId: string;
  reviews: { text?: string; textTranslated?: string | null }[];
}

interface CafeMetadata {
  name: string;
  placeId: string;
}

function loadCafeMetadata(): Map<string, CafeMetadata> {
  const map = new Map<string, CafeMetadata>();
  if (!fs.existsSync(CAFES_DATA_PATH)) return map;
  const raw = fs.readFileSync(CAFES_DATA_PATH, 'utf-8');
  const list = JSON.parse(raw);
  for (const c of list) {
    if (c.placeId) {
      map.set(c.placeId, { name: c.name, placeId: c.placeId });
    }
  }
  return map;
}

function loadReviewFile(filePath: string): ReviewFile | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildCorpus(reviews: ReviewFile['reviews']): string {
  const texts: string[] = [];
  for (const r of reviews) {
    if (r.text) texts.push(r.text);
    if (r.textTranslated) texts.push(r.textTranslated);
  }
  return normalizeText(texts.join(' '));
}

// ── Also scan embedded reviews from cafes_data.json ─────────────────────────

function loadEmbeddedCorpora(): Map<string, string> {
  const corpora = new Map<string, string>();
  if (!fs.existsSync(CAFES_DATA_PATH)) return corpora;
  const list = JSON.parse(fs.readFileSync(CAFES_DATA_PATH, 'utf-8'));
  for (const c of list) {
    if (!c.placeId || !c.reviews) continue;
    const texts: string[] = [];
    for (const r of c.reviews) {
      if (r.text) texts.push(r.text);
      if (r.textTranslated) texts.push(r.textTranslated);
    }
    corpora.set(c.placeId, normalizeText(texts.join(' ')));
  }
  return corpora;
}

// ── Main ────────────────────────────────────────────────────────────────────

interface CafeScore {
  placeId: string;
  name: string;
  purposeScores: Record<PurposeKey, number>;
  topPurposes: PurposeKey[];
  detectedFacilities: string[];
  reviewCount: number;
}

function analyze(): void {
  console.log('=== CafeMatch Review Analyzer ===\n');

  if (!fs.existsSync(REVIEWS_DIR)) {
    console.error(`Reviews dir not found: ${REVIEWS_DIR}`);
    process.exit(1);
  }

  const cafeMetadata = loadCafeMetadata();
  console.log(`Loaded metadata for ${cafeMetadata.size} cafes`);

  const embeddedCorpora = loadEmbeddedCorpora();
  console.log(`Loaded embedded review corpora for ${embeddedCorpora.size} cafes`);

  const reviewFiles = fs.readdirSync(REVIEWS_DIR).filter((f) => f.endsWith('.json'));
  console.log(`Found ${reviewFiles.length} review files\n`);

  const results: CafeScore[] = [];
  const byPlaceId = new Map<string, { corpus: string; name: string; reviewCount: number }>();

  // Start with embedded corpora
  for (const [placeId, corpus] of embeddedCorpora.entries()) {
    const meta = cafeMetadata.get(placeId);
    byPlaceId.set(placeId, {
      corpus,
      name: meta?.name || 'Unknown',
      reviewCount: corpus.split(' ').length,
    });
  }

  // Merge with per-file reviews (these may have more data)
  for (const file of reviewFiles) {
    const data = loadReviewFile(path.join(REVIEWS_DIR, file));
    if (!data || !data.placeId) continue;

    const fileCorpus = buildCorpus(data.reviews || []);
    const existing = byPlaceId.get(data.placeId);
    if (existing) {
      existing.corpus = `${existing.corpus} ${fileCorpus}`;
      existing.reviewCount += data.reviews?.length || 0;
    } else {
      byPlaceId.set(data.placeId, {
        corpus: fileCorpus,
        name: data.cafeName,
        reviewCount: data.reviews?.length || 0,
      });
    }
  }

  // Score each cafe (tokenize once per cafe, reuse for all checks)
  for (const [placeId, { corpus, name, reviewCount }] of byPlaceId.entries()) {
    const tokens = tokenize(corpus);

    const purposeScores: Record<PurposeKey, number> = {
      wfc: 0, me_time: 0, date: 0, family: 0, group_study: 0,
    };

    for (const purpose of Object.keys(PURPOSE_KEYWORDS) as PurposeKey[]) {
      purposeScores[purpose] = scorePurpose(tokens, PURPOSE_KEYWORDS[purpose].keywords);
    }

    const topPurposes = (Object.entries(purposeScores) as [PurposeKey, number][])
      .filter(([, score]) => score >= 40)
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p);

    const detectedFacilities = detectFacilities(tokens);

    results.push({
      placeId,
      name,
      purposeScores,
      topPurposes,
      detectedFacilities,
      reviewCount,
    });
  }

  // Stats
  const withAnyTop = results.filter((r) => r.topPurposes.length > 0).length;
  const withFacilities = results.filter((r) => r.detectedFacilities.length > 0).length;
  const totalHits: Record<PurposeKey, number> = { wfc: 0, me_time: 0, date: 0, family: 0, group_study: 0 };
  for (const r of results) {
    for (const p of r.topPurposes) totalHits[p]++;
  }

  console.log(`Analyzed ${results.length} cafes`);
  console.log(`  - ${withAnyTop} have at least one top purpose (score >= 40)`);
  console.log(`  - ${withFacilities} have at least one detected facility`);
  console.log(`  - Top-purpose distribution:`, totalHits);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nWritten full scores JSON to ${OUTPUT_PATH}`);

  // ── Write human-readable CSV for manual review ────────────────────────────
  const CSV_PATH = path.join(OUTPUT_DIR, 'cafe-purposes-review.csv');
  const csvLines: string[] = [
    'placeId,name,wfc,me_time,date,family,group_study,topPurposes,detectedFacilities,reviewCount',
  ];
  // Sort by name for easier scanning
  const sortedResults = [...results].sort((a, b) => a.name.localeCompare(b.name));
  for (const r of sortedResults) {
    const escapeCsv = (v: string) =>
      /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    csvLines.push(
      [
        r.placeId,
        escapeCsv(r.name),
        r.purposeScores.wfc,
        r.purposeScores.me_time,
        r.purposeScores.date,
        r.purposeScores.family,
        r.purposeScores.group_study,
        escapeCsv(r.topPurposes.join('|')),
        escapeCsv(r.detectedFacilities.join('|')),
        r.reviewCount,
      ].join(','),
    );
  }
  fs.writeFileSync(CSV_PATH, csvLines.join('\n'), 'utf-8');
  console.log(`Written human-readable CSV to ${CSV_PATH}`);

  // ── Write editable override JSON (initially empty; users edit then re-seed) ─
  const OVERRIDE_PATH = path.join(OUTPUT_DIR, 'cafe-purposes-overrides.json');
  if (!fs.existsSync(OVERRIDE_PATH)) {
    const overrideTemplate = {
      _comment:
        'Edit this file to manually override purpose/facility detection. ' +
        'Format: { "placeId": { "topPurposes": ["wfc","me_time"], "detectedFacilities": ["wifi","parking"] } }. ' +
        'Re-run `npm run seed` to apply changes. Entries here REPLACE the analyzer output for that cafe.',
      overrides: {},
    };
    fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(overrideTemplate, null, 2), 'utf-8');
    console.log(`Created empty override template at ${OVERRIDE_PATH}`);
  } else {
    console.log(`Keeping existing override file at ${OVERRIDE_PATH}`);
  }
}

analyze();
