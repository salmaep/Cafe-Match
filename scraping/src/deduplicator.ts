import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '..', 'output');

/**
 * Reads all existing JSON files in output/ and builds a Set of google_place_id
 * values that have already been scraped. Used to skip duplicates on reruns.
 */
export function loadExistingPlaceIds(): Set<string> {
  const ids = new Set<string>();
  if (!fs.existsSync(OUTPUT_DIR)) return ids;

  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf-8');
      const data = JSON.parse(content);
      const cafes = Array.isArray(data) ? data : data.cafes || [];
      for (const cafe of cafes) {
        if (cafe.google_place_id) {
          ids.add(cafe.google_place_id);
        }
      }
    } catch {
      // Skip malformed files
    }
  }

  return ids;
}

/**
 * Filter out places that have already been scraped.
 */
export function filterNew(
  nearbyResults: any[],
  existingIds: Set<string>,
): any[] {
  return nearbyResults.filter((r) => !existingIds.has(r.place_id));
}
