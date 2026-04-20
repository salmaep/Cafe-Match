import { BANDUNG_AREAS, AreaConfig } from './config';
import { nearbySearch, placeDetails } from './google-places';
import { transformPlace, ScrapedCafe } from './transformer';
import { loadExistingPlaceIds, filterNew } from './deduplicator';
import { writeAreaOutput } from './writer';

async function scrapeArea(area: AreaConfig, existingIds: Set<string>): Promise<number> {
  console.log(`\n--- Scraping: ${area.name} (${area.slug}) ---`);
  console.log(`  Center: ${area.lat}, ${area.lng} | Radius: ${area.radius}m`);

  // Step 1: Nearby Search
  const nearbyResults = await nearbySearch(area.lat, area.lng, area.radius);
  console.log(`  Found ${nearbyResults.length} places from Nearby Search`);

  // Step 2: Filter out already-scraped places
  const newResults = filterNew(nearbyResults, existingIds);
  console.log(`  ${newResults.length} new places to fetch details for`);

  if (newResults.length === 0) {
    console.log('  Nothing new — skipping.');
    return 0;
  }

  // Step 3: Fetch Place Details for each new place
  const scraped: ScrapedCafe[] = [];
  for (let i = 0; i < newResults.length; i++) {
    const place = newResults[i];
    console.log(`  [${i + 1}/${newResults.length}] Fetching details: ${place.name}`);
    try {
      const detail = await placeDetails(place.place_id);
      const cafe = transformPlace(place, detail);
      scraped.push(cafe);
      // Track this place_id so cross-area duplicates are caught
      existingIds.add(place.place_id);
    } catch (err: any) {
      console.error(`  Failed to fetch details for ${place.name}: ${err.message}`);
    }
  }

  // Step 4: Write to output file
  writeAreaOutput(area.slug, scraped);
  return scraped.length;
}

async function main() {
  console.log('=== CafeMatch Google Places Scraper ===');
  console.log(`Targeting ${BANDUNG_AREAS.length} areas in Bandung\n`);

  // Check for --area flag to scrape a single area
  const areaFlag = process.argv.find((a) => a === '--area');
  const areaName = areaFlag ? process.argv[process.argv.indexOf('--area') + 1] : null;

  const areas = areaName
    ? BANDUNG_AREAS.filter((a) => a.slug === areaName || a.name.toLowerCase().includes(areaName.toLowerCase()))
    : BANDUNG_AREAS;

  if (areas.length === 0) {
    console.error(`No area found matching "${areaName}". Available:`);
    BANDUNG_AREAS.forEach((a) => console.log(`  - ${a.slug} (${a.name})`));
    process.exit(1);
  }

  // Load all existing place_ids across all output files
  const existingIds = loadExistingPlaceIds();
  console.log(`Loaded ${existingIds.size} existing place IDs from previous runs`);

  let totalNew = 0;
  for (const area of areas) {
    totalNew += await scrapeArea(area, existingIds);
  }

  console.log(`\n=== Done! Scraped ${totalNew} new cafes total ===`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
