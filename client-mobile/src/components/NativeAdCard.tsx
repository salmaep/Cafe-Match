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
import { colors, radius, spacing } from '../theme';

export default function NativeAdCard() {
  const [ad, setAd] = useState<NativeAdType | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!adsAvailable || !NativeAd) return;
    let cancelled = false;
    let current: NativeAdType | null = null;

    NativeAd.createForAdRequest(adUnitIds.native)
      .then((loaded) => {
        if (cancelled) {
          loaded.destroy();
          return;
        }
        current = loaded;
        setAd(loaded);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      current?.destroy();
    };
  }, []);

  // In Expo Go (or any build without the native module) skip rendering entirely.
  if (!adsAvailable || !NativeAdView || !NativeAsset || !NativeAssetType || !NativeMediaView) {
    return null;
  }
  if (failed) return null;

  if (!ad) {
    return (
      <View style={[styles.card, styles.loading]}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  const iconUri = ad.icon?.url;

  return (
    <NativeAdView nativeAd={ad} style={styles.card}>
      <View style={styles.sponsoredBadge}>
        <Text style={styles.sponsoredText}>Ad</Text>
      </View>

      {iconUri ? (
        <NativeAsset assetType={NativeAssetType.ICON}>
          <Image source={{ uri: iconUri }} style={styles.photo} />
        </NativeAsset>
      ) : (
        <View style={styles.photo}>
          <NativeMediaView style={StyleSheet.absoluteFill} />
        </View>
      )}

      <View style={styles.info}>
        <NativeAsset assetType={NativeAssetType.HEADLINE}>
          <Text style={styles.name} numberOfLines={1}>
            {ad.headline}
          </Text>
        </NativeAsset>
        {ad.body ? (
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text style={styles.body} numberOfLines={1}>
              {ad.body}
            </Text>
          </NativeAsset>
        ) : null}
        {ad.advertiser || ad.store ? (
          <View style={styles.pill}>
            <Text style={styles.pillText} numberOfLines={1}>
              {ad.advertiser || ad.store}
            </Text>
          </View>
        ) : null}
      </View>

      {ad.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <View style={styles.cta}>
            <Text style={styles.ctaText} numberOfLines={1}>
              {ad.callToAction}
            </Text>
          </View>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  loading: {
    height: 102,
    justifyContent: 'center',
  },
  sponsoredBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FBBF24',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    zIndex: 2,
  },
  sponsoredText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  photo: {
    width: 70,
    height: 70,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 3,
  },
  body: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent + '20',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
    maxWidth: 120,
  },
  cta: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.3,
  },
});
