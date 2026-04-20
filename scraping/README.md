# CafeMatch — Google Places Scraper

Standalone scraper that fetches cafe data from Google Places API for Bandung areas. Saves raw JSON to `output/` — does NOT connect to the CafeMatch database.

## Setup

```bash
cd scraping
npm install
cp .env.example .env
# Edit .env and add your Google Places API key
```

## Usage

### Scrape all areas
```bash
npm run scrape
```

### Scrape a single area
```bash
npm run scrape:area -- --area bandung-dago
```

### Available areas
- `bandung-dago` — Dago
- `bandung-buahbatu` — Buah Batu
- `bandung-lengkong` — Lengkong (Burangrang/Progo)
- `bandung-sukajadi` — Sukajadi
- `bandung-cicendo` — Cicendo (Pasir Kaliki)
- `bandung-riau` — Riau / RE Martadinata

## Output

Results are saved as JSON files in `output/`:
- `output/bandung-dago.json`
- `output/bandung-buahbatu.json`
- etc.

Each file contains an array of `ScrapedCafe` objects with: name, address, coordinates, phone, opening hours, photos, rating, reviews, etc.

## Rerunning

The scraper is **idempotent**. It reads all existing `output/*.json` files, builds a set of known `google_place_id` values, and skips any place that has already been scraped. Safe to rerun multiple times.

## API Cost Estimate

Per full run (~6 areas):
- ~18 Nearby Search calls (~$0.58)
- ~360 Place Details calls (~$6.12)
- **Total: ~$7-15 per full scrape run**
