import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { commonText, mapText } from '@shared/i18n/keys';
import CafePhoto from '../CafePhoto';
import { Cafe } from '../../types';
import { cleanAddress } from '../../utils/address';
import { formatRating } from '../../utils/rating';
import { getOpenStatus } from '../../utils/openingHours';
import { buildFacilityChips, formatDistance } from '../../utils/facilities';

interface Props {
  cafe: Cafe;
  /** Optional override for press behavior. Defaults to navigate('CafeDetail'). */
  onPress?: () => void;
  /** Right-side accessory rendered in place of the favorites count + chevron. */
  rightAccessory?: React.ReactNode;
}

const VISIBLE_CHIPS = 3;

export default function CafeListItem({ cafe, onPress, rightAccessory }: Props) {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { t } = useTranslation();
  const open = getOpenStatus(cafe.openingHours);
  const locality = cleanAddress(cafe.district || cafe.city || '');
  const allChips = buildFacilityChips(cafe);
  const visibleChips = allChips.slice(0, VISIBLE_CHIPS);
  const overflow = allChips.length - visibleChips.length;
  const ratingText = formatRating(cafe.googleRating);
  const distMeters =
    cafe.distanceMeters != null
      ? cafe.distanceMeters
      : cafe.distance != null
        ? Math.round(cafe.distance * 1000)
        : null;

  const promoLabel =
    cafe.activePromotionType === 'new_cafe'
      ? t(mapText.newBadge)
      : cafe.activePromotionType === 'featured_promo'
        ? t(commonText.featured)
        : null;
  const promoBg =
    cafe.activePromotionType === 'new_cafe' ? '#E94B4B' : '#D48B3A';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={
        onPress ?? (() => navigation.navigate('CafeDetail', { cafe }))
      }
    >
      <CafePhoto
        photos={cafe.photos}
        name={cafe.name}
        style={styles.photo}
      />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {cafe.name}
          </Text>
          {promoLabel && (
            <View style={[styles.promoBadge, { backgroundColor: promoBg }]}>
              <Text style={styles.promoBadgeText}>{promoLabel}</Text>
            </View>
          )}
        </View>

        {/* Rating · price · distance row */}
        <View style={styles.metaRow}>
          {ratingText && (
            <>
              <Text style={styles.metaStar}>★</Text>
              <Text style={styles.metaRating}>{ratingText}</Text>
              {cafe.totalGoogleReviews != null && (
                <Text style={styles.metaMuted}>
                  ({cafe.totalGoogleReviews.toLocaleString()})
                </Text>
              )}
              <Text style={styles.metaDot}>·</Text>
            </>
          )}
          {!!cafe.priceRange && (
            <Text style={styles.metaMuted}>{cafe.priceRange}</Text>
          )}
          {distMeters != null && (
            <>
              {!!cafe.priceRange && <Text style={styles.metaDot}>·</Text>}
              <Text style={styles.metaMuted}>{formatDistance(distMeters)}</Text>
            </>
          )}
        </View>

        {!!locality && (
          <Text style={styles.locality} numberOfLines={1}>
            {locality}
          </Text>
        )}

        {/* Open status + facility chips */}
        <View style={styles.chipRow}>
          {open && (
            <View
              style={[
                styles.openChip,
                open.isOpen ? styles.openChipOn : styles.openChipOff,
              ]}
            >
              <Text
                style={[
                  styles.openChipText,
                  open.isOpen ? styles.openChipTextOn : styles.openChipTextOff,
                ]}
              >
                {open.isOpen
                  ? open.closesAt
                    ? `Buka · tutup ${open.closesAt}`
                    : 'Buka'
                  : open.opensAt
                    ? `Tutup · buka ${open.nextOpenDay === 'today' ? '' : `${open.nextOpenDay} `}${open.opensAt}`
                    : 'Tutup'}
              </Text>
            </View>
          )}
          {visibleChips.map((c) => (
            <View key={c.key} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {c.icon} {c.label}
              </Text>
            </View>
          ))}
          {overflow > 0 && (
            <View style={styles.chipOverflow}>
              <Text style={styles.chipOverflowText}>+{overflow}</Text>
            </View>
          )}
        </View>

        {!!cafe.topReviewText && (
          <Text style={styles.review} numberOfLines={2}>
            <Text style={styles.reviewIcon}>💬 </Text>"{cafe.topReviewText}"
            {!!cafe.topReviewAuthor && (
              <Text style={styles.reviewAuthor}> — {cafe.topReviewAuthor}</Text>
            )}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        {rightAccessory ?? (
          <>
            <Text style={styles.favCount}>❤️ {cafe.favoritesCount}</Text>
            <Text style={styles.chev}>›</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const C = {
  border: '#F0EDE8',
  ink: '#1C1C1A',
  muted: '#8A8880',
  mutedDeep: '#5C5A52',
  veryMuted: '#A8A59C',
  divider: '#D9D6CE',
  amber: '#D48B3A',
  amberInk: '#B45309',
  emeraldBg: '#ECFDF5',
  emeraldText: '#047857',
  closedBg: '#F3F4F6',
  closedText: '#4B5563',
  star: '#F59E0B',
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: C.border,
  },
  body: { flex: 1, minWidth: 0, justifyContent: 'flex-start' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: C.ink,
    flexShrink: 1,
  },
  promoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  promoBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  metaStar: { color: C.star, fontSize: 12, marginRight: 2 },
  metaRating: { fontSize: 12, fontWeight: '700', color: C.ink, marginRight: 2 },
  metaMuted: { fontSize: 12, color: C.muted },
  metaDot: { fontSize: 12, color: C.divider, marginHorizontal: 4 },

  locality: {
    fontSize: 11,
    color: C.veryMuted,
    marginTop: 1,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  openChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  openChipOn: { backgroundColor: C.emeraldBg },
  openChipOff: { backgroundColor: C.closedBg },
  openChipText: { fontSize: 10, fontWeight: '800' },
  openChipTextOn: { color: C.emeraldText },
  openChipTextOff: { color: C.closedText },

  chip: {
    backgroundColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    maxWidth: 130,
  },
  chipText: { fontSize: 10, fontWeight: '600', color: C.mutedDeep },
  chipOverflow: {
    borderWidth: 1,
    borderColor: '#E0DCD3',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  chipOverflowText: { fontSize: 10, fontWeight: '600', color: C.muted },

  review: {
    fontSize: 11,
    color: C.mutedDeep,
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 14,
  },
  reviewIcon: { fontStyle: 'normal', color: C.muted },
  reviewAuthor: { fontStyle: 'normal', color: C.veryMuted },

  right: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  favCount: { fontSize: 13, fontWeight: '700', color: C.amber },
  chev: { fontSize: 22, color: C.muted, lineHeight: 22 },
});
