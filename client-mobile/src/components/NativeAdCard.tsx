import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeAd as NativeAdType } from 'react-native-google-mobile-ads';
import {
  adsAvailable,
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from '../lib/ads';
import { adUnitIds } from '../config/ads';

// Color palette mirrors components/cafe/CafeListItem so the layout is a 1:1
// match. The only divergences: amber border (highlight cue) + amber tint on
// the photo edge + a small amber "AD" badge in the right column.
const C = {
  border: '#F0EDE8',
  ink: '#1C1C1A',
  muted: '#8A8880',
  mutedDeep: '#5C5A52',
  veryMuted: '#A8A59C',
  divider: '#D9D6CE',
  amber: '#D48B3A',
  amberInk: '#B45309',
  amberSoft: '#FFF8EC',
  amberRing: '#FCD34D',
  star: '#F59E0B',
};

export default function NativeAdCard() {
  const [ad, setAd] = useState<NativeAdType | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!adsAvailable || !NativeAd) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[Ad] skip — adsAvailable=', adsAvailable);
      }
      return;
    }
    let cancelled = false;
    let current: NativeAdType | null = null;

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[Ad] requesting unit:', adUnitIds.native);
    }

    // Hard timeout: if no response after 10s, give up rather than spin forever.
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[Ad] timeout — no ad after 10s, giving up.');
      }
      setFailed(true);
    }, 10_000);

    NativeAd.createForAdRequest(adUnitIds.native)
      .then((loaded) => {
        clearTimeout(timeoutId);
        if (cancelled) {
          loaded.destroy();
          return;
        }
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[Ad] loaded:', loaded.headline);
        }
        current = loaded;
        setAd(loaded);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[Ad] failed:', err?.message ?? err);
        }
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      current?.destroy();
    };
  }, []);

  if (!adsAvailable || !NativeAdView || !NativeAsset || !NativeAssetType || !NativeMediaView) {
    return null;
  }
  if (failed) return null;

  if (!ad) {
    return (
      <View style={[styles.card, styles.loading]}>
        <ActivityIndicator size="small" color={C.amber} />
      </View>
    );
  }

  const advertiser = ad.advertiser || ad.store;
  const ratingValue =
    typeof ad.starRating === 'number' && ad.starRating > 0
      ? ad.starRating.toFixed(1)
      : null;
  const iconUri = ad.icon?.url;

  return (
    <NativeAdView nativeAd={ad} style={styles.card}>
      {/* Photo column — same 96×96 as CafeListItem */}
      <View style={styles.photo}>
        {iconUri ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: iconUri }} style={StyleSheet.absoluteFill} />
          </NativeAsset>
        ) : (
          <NativeMediaView style={StyleSheet.absoluteFill} />
        )}
      </View>

      {/* Body column */}
      <View style={styles.body}>
        {/* Title row — title + SPONSOR badge (in place of promoBadge) */}
        <View style={styles.titleRow}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.title} numberOfLines={1}>
              {ad.headline}
            </Text>
          </NativeAsset>
          <View style={styles.sponsorBadge}>
            <Text style={styles.sponsorBadgeText}>SPONSOR</Text>
          </View>
        </View>

        {/* Meta row — same shape as CafeListItem (rating · advertiser) */}
        {(ratingValue || advertiser) && (
          <View style={styles.metaRow}>
            {ratingValue && (
              <>
                <Text style={styles.metaStar}>★</Text>
                <Text style={styles.metaRating}>{ratingValue}</Text>
                {advertiser && <Text style={styles.metaDot}>·</Text>}
              </>
            )}
            {advertiser && (
              <Text style={styles.metaMuted} numberOfLines={1}>
                {advertiser}
              </Text>
            )}
          </View>
        )}

        {/* Body snippet — same slot as the cafe's top review */}
        {ad.body ? (
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text style={styles.review} numberOfLines={2}>
              {ad.body}
            </Text>
          </NativeAsset>
        ) : null}

        {/* CTA chip — drops into the chipRow slot, mirroring open-status chip */}
        {ad.callToAction ? (
          <View style={styles.chipRow}>
            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
              <View style={styles.ctaChip}>
                <Text style={styles.ctaChipText} numberOfLines={1}>
                  {ad.callToAction}
                </Text>
              </View>
            </NativeAsset>
          </View>
        ) : null}
      </View>

      {/* Right column — same 40px width as CafeListItem.right */}
      <View style={styles.right}>
        <Text style={styles.adLabel}>AD</Text>
        <Text style={styles.chev}>›</Text>
      </View>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  // Same skeleton as CafeListItem.card, but visually elevated so it's
  // unambiguous that this row is sponsored: cream-amber wash background,
  // thicker amber border, warm orange shadow. Padding/radius/gap match the
  // cafe card so the row keeps its place in the rhythm of the list.
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    backgroundColor: C.amberSoft,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.amber,
    padding: 12,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  loading: {
    height: 122,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: C.border,
    overflow: 'hidden',
  },
  body: { flex: 1, minWidth: 0, justifyContent: 'flex-start' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: C.ink,
    flexShrink: 1,
  },
  sponsorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: C.amber,
  },
  sponsorBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  metaStar: { color: C.star, fontSize: 12, marginRight: 2 },
  metaRating: {
    fontSize: 12, fontWeight: '700', color: C.ink, marginRight: 2,
  },
  metaMuted: { fontSize: 12, color: C.muted, flexShrink: 1 },
  metaDot: { fontSize: 12, color: C.divider, marginHorizontal: 4 },

  // Reuses the review-snippet slot in CafeListItem so the visual rhythm matches.
  review: {
    fontSize: 11,
    color: C.mutedDeep,
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 14,
  },

  // CTA pill placed in the chip row — same vertical position as openChip.
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  ctaChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.amber,
  },
  ctaChipText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // Right column — mirrors CafeListItem.right (40px, top/bottom split).
  right: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  adLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: C.amberInk,
    letterSpacing: 1,
  },
  chev: { fontSize: 22, color: C.muted, lineHeight: 22 },
});
