import * as fs from 'fs';
import * as path from 'path';
import { ScrapedCafe } from './transformer';

const OUTPUT_DIR = path.join(__dirname, '..', 'output');

/**
 * Write scraped cafes to a JSON file in output/.
 * If the file already exists, it merges new cafes (deduped by google_place_id).
 */
export function writeAreaOutput(areaSlug: string, newCafes: ScrapedCafe[]): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const filePath = path.join(OUTPUT_DIR, `${areaSlug}.json`);

  let existing: ScrapedCafe[] = [];
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      existing = Array.isArray(parsed) ? parsed : parsed.cafes || [];
    } catch {
      // Overwrite if malformed
    }
  }

  // Merge: keep existing, add new ones that don't overlap by place_id
  const existingIds = new Set(existing.map((c) => c.google_place_id));
  const merged = [...existing, ...newCafes.filter((c) => !existingIds.has(c.google_place_id))];

  const output = {
    area: areaSlug,
    scraped_at: new Date().toISOString(),
    count: merged.length,
    cafes: merged,
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`  Written ${merged.length} cafes to ${filePath}`);
}
