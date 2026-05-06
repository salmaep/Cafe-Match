import { findFacilityByAlias } from '../../cafes/facility-catalog';

export interface ParsedFacility {
  facilityKey: string;
  facilityValue?: string;
}

export interface DerivedFlags {
  wifiAvailable: boolean;
  hasMushola: boolean;
  hasParking: boolean;
}

export interface ParsedFacilitiesResult {
  facilities: ParsedFacility[];
  derivedFlags: DerivedFlags;
}

const PAYMENT_FEATURE_REGEX =
  /kartu debit|kartu kredit|pembayaran seluler|nfc|qris|tunai/i;

/**
 * Parses Indonesian Google Maps feature strings into facility key-value pairs.
 * Resolves aliases via FACILITY_CATALOG (single source of truth).
 *
 * - Skips payment-related features (handled separately via parsePayment).
 * - Deduplicates: each facility_key appears at most once.
 * - Also returns derived booleans (wifiAvailable, hasMushola, hasParking)
 *   for the flat columns on `cafes` — caller decides whether to OR-merge
 *   with explicit DTO fields.
 */
export function parseFeatures(features: string[]): ParsedFacilitiesResult {
  const derivedFlags: DerivedFlags = {
    wifiAvailable: false,
    hasMushola: false,
    hasParking: false,
  };

  if (!features || features.length === 0) {
    return { facilities: [], derivedFlags };
  }

  const seen = new Set<string>();
  const facilities: ParsedFacility[] = [];

  for (const rawFeature of features) {
    const normalized = rawFeature.trim().toLowerCase();

    if (PAYMENT_FEATURE_REGEX.test(normalized)) {
      continue;
    }

    const def = findFacilityByAlias(normalized);
    if (!def || seen.has(def.key)) continue;

    seen.add(def.key);
    facilities.push({ facilityKey: def.key });

    if (def.derivesFlag) {
      derivedFlags[def.derivesFlag] = true;
    }
  }

  return { facilities, derivedFlags };
}

const PAYMENT_KEY_MAP: Record<string, string> = {
  cash: 'payment_cash',
  debitCard: 'payment_debit',
  creditCard: 'payment_credit',
  qris: 'payment_qris',
  nfc: 'payment_nfc',
  ewallet: 'payment_ewallet',
};

/**
 * Converts the scraper `payment` object into facility key-value pairs.
 * Only includes payment methods that are explicitly true.
 */
export function parsePayment(
  payment: Record<string, unknown> | null | undefined,
): ParsedFacility[] {
  if (!payment) return [];
  const result: ParsedFacility[] = [];
  for (const [method, enabled] of Object.entries(payment)) {
    if (!enabled) continue;
    const key = PAYMENT_KEY_MAP[method];
    if (!key) continue;
    result.push({ facilityKey: key, facilityValue: String(enabled) });
  }
  return result;
}
