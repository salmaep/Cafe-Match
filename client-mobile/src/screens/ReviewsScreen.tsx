import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Image, Modal, Dimensions, ScrollView, StatusBar,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchReviews, fetchReviewSummary } from '../services/api';
import { Review, ReviewSummary } from '../types';
import { colors, spacing, radius } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type RouteParams = { Reviews: { cafeId: string; cafeName: string } };

// Map raw category keys (as stored in review_ratings.category) to friendly labels.
// Supports mood_<slug>, facility_<key>, overall, and legacy keys.
const CATEGORY_LABELS: Record<string, string> = {
  // Legacy / overall
  overall: '⭐ Rating',
  ambiance: '🎨 Suasana',
  wfc: '💻 WFC',
  food_quality: '🍽️ Makanan',
  service: '🛎️ Pelayanan',
  value_for_money: '💰 Harga',
  kid_friendly: '👶 Ramah Anak',

  // Mood
  mood_me_time: '🧘 Me Time',
  'mood_me-time': '🧘 Me Time',
  mood_date: '💑 Date',
  mood_family: '👨‍👩‍👧 Family Time',
  'mood_family_time': '👨‍👩‍👧 Family Time',
  mood_group_study: '📚 Group Study',
  'mood_group-work': '📚 Group Study',
  mood_wfc: '💻 WFC',

  // Facilities
  facility_wifi: '📶 WiFi',
  facility_power_outlet: '🔌 Power Outlet',
  facility_mushola: '🕌 Mushola',
  facility_parking: '🅿️ Parking',
  facility_kid_friendly: '👶 Kid-Friendly',
  facility_quiet_atmosphere: '🤫 Quiet',
  facility_large_tables: '🪑 Large Tables',
  facility_outdoor_area: '🌿 Outdoor',
};

/** Convert any raw category to a human label; fallback = prettify the key */
function prettyCategory(key: string): string {
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  // Fallback: strip mood_/facility_ prefix + title-case
  const stripped = key.replace(/^(mood_|facility_)/, '').replace(/[_-]/g, ' ');
  return stripped.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReviewsScreen() {
  const route = useRoute<RouteProp<RouteParams, 'Reviews'>>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { cafeId, cafeName } = route.params;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Zoom modal state for media preview
  const [zoomMedia, setZoomMedia] = useState<
    { list: { mediaType: 'photo' | 'video'; url: string }[]; index: number } | null
  >(null);

  // Star-only summary (exclude mood_*/facility_* from star bars)
  const starSummary = summary.filter(
    (s) => !s.category.startsWith('mood_') && !s.category.startsWith('facility_'),
  );

  useEffect(() => {
    Promise.all([
      fetchReviews(cafeId).then((r) => setReviews(r.reviews)),
      fetchReviewSummary(cafeId).then(setSummary),
    ]).finally(() => setLoading(false));
  }, [cafeId]);

  const renderStars = (score: number) => {
    return '★'.repeat(Math.round(score)) + '☆'.repeat(5 - Math.round(score));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Reviews · {cafeName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('WriteReview', { cafeId, cafeName })}>
          <Text style={styles.writeBtn}>+ Tulis</Text>
        </TouchableOpacity>
      </View>

      {/* Summary bars — STAR categories only (mood/facility excluded) */}
      {starSummary.length > 0 && (
        <View style={styles.summaryBox}>
          {starSummary.map((s) => (
            <View key={s.category} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{prettyCategory(s.category)}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${(s.avgScore / 5) * 100}%` }]} />
              </View>
              <Text style={styles.summaryScore}>{s.avgScore.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : reviews.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Belum ada review</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('WriteReview', { cafeId, cafeName })}
          >
            <Text style={styles.emptyBtnText}>Jadi yang pertama review!</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reviews.filter((r) => r && r.id)}
          keyExtractor={(r, i) => r?.id || `review-${i}`}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => {
            if (!item) return null;
            // Separate ratings into star, mood, facility
            const ratings = item.ratings ?? [];
            const starRatings = ratings.filter(
              (r) => !r.category.startsWith('mood_') && !r.category.startsWith('facility_'),
            );
            const moodRatings = ratings.filter((r) => r.category.startsWith('mood_'));
            const facilityRatings = ratings.filter((r) => r.category.startsWith('facility_'));
            const overall = starRatings.find((r) => r.category === 'overall');
            const media = item.media ?? [];

            return (
              <View style={styles.card}>
                {/* Header: avatar + name + date */}
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.userName[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{item.userName}</Text>
                    <Text style={styles.cardDate}>
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>

                {/* 1. Star rating (overall shown prominently) */}
                {overall ? (
                  <View style={styles.overallStarsRow}>
                    <Text style={styles.overallStars}>
                      {'★'.repeat(Math.round(overall.score))}
                      {'☆'.repeat(5 - Math.round(overall.score))}
                    </Text>
                    <Text style={styles.overallScore}>{overall.score.toFixed(1)}</Text>
                  </View>
                ) : null}
                {/* Other star categories (ambiance, food_quality, etc.) if present */}
                {starRatings.filter((r) => r.category !== 'overall').length > 0 && (
                  <View style={styles.ratingsRow}>
                    {starRatings
                      .filter((r) => r.category !== 'overall')
                      .map((r) => (
                        <View key={r.category} style={styles.ratingChip}>
                          <Text style={styles.ratingChipLabel}>{prettyCategory(r.category)}</Text>
                          <Text style={styles.ratingChipStars}>
                            {'★'.repeat(Math.round(r.score))}
                            {'☆'.repeat(5 - Math.round(r.score))}
                          </Text>
                        </View>
                      ))}
                  </View>
                )}

                {/* 2. Mood + facility chips (as voted attributes, NOT ratings) */}
                {(moodRatings.length > 0 || facilityRatings.length > 0) && (
                  <View style={styles.attributesRow}>
                    {moodRatings.map((r) => (
                      <View key={r.category} style={styles.moodAttrChip}>
                        <Text style={styles.moodAttrText}>{prettyCategory(r.category)}</Text>
                      </View>
                    ))}
                    {facilityRatings.map((r) => (
                      <View key={r.category} style={styles.facilityAttrChip}>
                        <Text style={styles.facilityAttrText}>{prettyCategory(r.category)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 3. Review text */}
                {item.text ? <Text style={styles.reviewText}>{item.text}</Text> : null}

                {/* 4. Photos / videos — small thumbnails, tap to zoom */}
                {media.length > 0 && (
                  <View style={styles.mediaRow}>
                    {media.map((m, i) => (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.85}
                        onPress={() => setZoomMedia({ list: media, index: i })}
                      >
                        {m.mediaType === 'photo' ? (
                          <Image source={{ uri: m.url }} style={styles.mediaThumb} />
                        ) : (
                          <View style={[styles.mediaThumb, styles.videoThumb]}>
                            <Text style={styles.videoPlay}>▶</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Zoom modal — tap thumbnail to view larger, swipe between media */}
      <Modal
        visible={!!zoomMedia}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setZoomMedia(null)}
        statusBarTranslucent
      >
        <StatusBar hidden />
        <View style={styles.zoomRoot}>
          {zoomMedia && (
            <FlatList
              data={zoomMedia.list}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={zoomMedia.index}
              getItemLayout={(_, index) => ({
                length: SCREEN_W,
                offset: SCREEN_W * index,
                index,
              })}
              keyExtractor={(_, i) => 'zoom-' + i}
              renderItem={({ item }) => (
                <ScrollView
                  style={{ width: SCREEN_W, height: SCREEN_H }}
                  contentContainerStyle={styles.zoomScrollContent}
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  pinchGestureEnabled
                  centerContent
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                >
                  {item.mediaType === 'photo' ? (
                    <Image source={{ uri: item.url }} style={styles.zoomImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.zoomVideoBox}>
                      <Text style={styles.zoomVideoIcon}>🎥</Text>
                      <Text style={styles.zoomVideoHint}>Video preview</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            />
          )}
          <TouchableOpacity
            style={styles.zoomCloseBtn}
            onPress={() => setZoomMedia(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.zoomCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surface,
    backgroundColor: colors.white,
  },
  back: { fontSize: 15, color: colors.accent, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: colors.primary, flex: 1, textAlign: 'center', marginHorizontal: spacing.sm },
  writeBtn: { fontSize: 14, fontWeight: '700', color: colors.accent },

  summaryBox: {
    backgroundColor: colors.white, margin: spacing.md, borderRadius: radius.md,
    padding: spacing.md, elevation: 1,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs + 2 },
  summaryLabel: { width: 120, fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  barBg: { flex: 1, height: 8, backgroundColor: colors.surface, borderRadius: 4, marginHorizontal: spacing.sm, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  summaryScore: { width: 28, fontSize: 13, fontWeight: '700', color: colors.primary, textAlign: 'right' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyText: { fontSize: 16, color: colors.textSecondary },
  emptyBtn: { marginTop: spacing.md, backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  emptyBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },

  card: {
    backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  cardName: { fontSize: 14, fontWeight: '700', color: colors.primary },
  cardDate: { fontSize: 11, color: colors.textSecondary },
  ratingsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  ratingChip: { backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  ratingChipLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  ratingChipStars: { fontSize: 10, color: colors.accent },
  reviewText: { fontSize: 14, color: colors.primary, lineHeight: 20, marginBottom: spacing.sm },

  // Overall star rating (prominent)
  overallStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  overallStars: {
    fontSize: 18,
    color: colors.accent,
    letterSpacing: 1,
  },
  overallScore: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: 8,
  },

  // Mood + facility chips as voted attributes (NOT rating bars)
  attributesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  moodAttrChip: {
    backgroundColor: '#FDF6EC',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  moodAttrText: { fontSize: 11, color: colors.accent, fontWeight: '700' },
  facilityAttrChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  facilityAttrText: { fontSize: 11, color: colors.primary, fontWeight: '600' },

  // Media thumbnails + zoom
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  mediaThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  videoThumb: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  videoPlay: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '900',
  },

  // Zoom modal
  zoomRoot: { flex: 1, backgroundColor: '#000' },
  zoomScrollContent: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.85,
  },
  zoomVideoBox: {
    width: SCREEN_W,
    height: SCREEN_H * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomVideoIcon: { fontSize: 80, marginBottom: 12 },
  zoomVideoHint: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  zoomCloseBtn: {
    position: 'absolute',
    top: 48,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  zoomCloseText: { color: colors.white, fontSize: 22, fontWeight: '700' },
});
