import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { reviewsText } from '@shared/i18n/keys';
import {
  Star,
  X,
  ChevronLeft,
  PencilLine,
  Play,
  Video,
  MessageSquareText,
} from 'lucide-react-native';
import { useReviews } from '../queries/reviews/use-reviews';
import { useReviewSummary } from '../queries/reviews/use-review-summary';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';
import {
  prettyReviewCategory,
  reviewCategoryIcon,
  isStarCategory,
  isMoodCategory,
  isFacilityCategory,
} from '../constant/ui/review-categories';
import { LucideIcon } from '../utils/lucideIcon';
import type { Review, ReviewSummary } from '../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STAR_COLOR = '#F59E0B';
const REVIEW_TEXT_MAX_LINES = 4;
const REVIEW_LONG_THRESHOLD = 220;

type RouteParams = { Reviews: { cafeId: string; cafeName: string } };
type MediaItem = { mediaType: 'photo' | 'video'; url: string };
type ZoomState = { list: MediaItem[]; index: number } | null;

function StarRow({
  score,
  size = 12,
  color = STAR_COLOR,
}: {
  score: number;
  size?: number;
  color?: string;
}) {
  const n = Math.round(score);
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          color={color}
          fill={i < n ? color : 'transparent'}
          strokeWidth={i < n ? 0 : 1.5}
        />
      ))}
    </View>
  );
}

function CategoryLabel({
  category,
  iconColor = colors.textSecondary,
  textStyle,
}: {
  category: string;
  iconColor?: string;
  textStyle?: any;
}) {
  const icon = reviewCategoryIcon(category);
  return (
    <View style={styles.categoryLabelRow}>
      {icon && (
        <LucideIcon name={icon} size={12} color={iconColor} strokeWidth={2} />
      )}
      <Text style={[styles.categoryLabelText, textStyle]}>
        {prettyReviewCategory(category)}
      </Text>
    </View>
  );
}

function ScreenHeader({
  cafeName,
  onBack,
  onWrite,
}: {
  cafeName: string;
  onBack: () => void;
  onWrite: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerBackBtn}
        onPress={onBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ChevronLeft size={22} color={colors.primary} strokeWidth={2.2} />
      </TouchableOpacity>
      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle}>Ulasan</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {cafeName}
        </Text>
      </View>
      <TouchableOpacity style={styles.writeBtn} onPress={onWrite}>
        <PencilLine size={13} color={colors.white} strokeWidth={2.4} />
        <Text style={styles.writeBtnText}>Tulis</Text>
      </TouchableOpacity>
    </View>
  );
}

function HeroSummary({
  starSummary,
  overall,
  totalReviews,
}: {
  starSummary: ReviewSummary[];
  overall: ReviewSummary | undefined;
  totalReviews: number;
}) {
  const overallScore = overall?.avgScore ?? 0;
  const bars = starSummary.filter((s) => s.category !== 'overall');

  return (
    <View style={styles.hero}>
      <View style={styles.heroTopRow}>
        <View style={styles.heroScoreCol}>
          <Text style={styles.heroScore}>{overallScore.toFixed(1)}</Text>
          <StarRow score={overallScore} size={14} />
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroCountCol}>
          <Text style={styles.heroCountNumber}>{totalReviews}</Text>
          <Text style={styles.heroCountLabel}>ulasan</Text>
        </View>
      </View>

      {bars.length > 0 && (
        <View style={styles.heroBars}>
          {bars.map((s) => (
            <View key={s.category} style={styles.summaryRow}>
              <View style={styles.summaryLabelWrap}>
                <CategoryLabel category={s.category} />
              </View>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(s.avgScore / 5) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.summaryScore}>{s.avgScore.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ReviewBody({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = useMemo(
    () => text.length > REVIEW_LONG_THRESHOLD,
    [text],
  );
  return (
    <>
      <Text
        style={styles.reviewText}
        numberOfLines={expanded ? undefined : REVIEW_TEXT_MAX_LINES}
      >
        {text}
      </Text>
      {isLong && (
        <TouchableOpacity
          onPress={() => setExpanded((v) => !v)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.expandBtn}>
            {expanded ? 'Lebih ringkas' : 'Baca lengkap'}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}

function ReviewAvatar({ name, url }: { name: string; url?: string }) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={styles.avatar}
        cachePolicy="memory-disk"
        transition={150}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarText}>
        {name?.[0]?.toUpperCase() || '?'}
      </Text>
    </View>
  );
}

function ReviewCard({
  review,
  onOpenMedia,
}: {
  review: Review;
  onOpenMedia: (media: MediaItem[], index: number) => void;
}) {
  const ratings = review.ratings ?? [];
  const starRatings = ratings.filter((r) => isStarCategory(r.category));
  const moodRatings = ratings.filter((r) => isMoodCategory(r.category));
  const facilityRatings = ratings.filter((r) => isFacilityCategory(r.category));
  const overall = starRatings.find((r) => r.category === 'overall');
  const otherStars = starRatings.filter((r) => r.category !== 'overall');
  const media = review.media ?? [];

  const dateStr = new Date(review.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <ReviewAvatar name={review.userName} url={review.userAvatar} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardName} numberOfLines={1}>
            {review.userName}
          </Text>
          <View style={styles.cardSubRow}>
            {overall && <StarRow score={overall.score} size={11} />}
            {overall && <Text style={styles.cardSubDot}>·</Text>}
            <Text style={styles.cardDate}>{dateStr}</Text>
          </View>
        </View>
      </View>

      {otherStars.length > 0 && (
        <View style={styles.ratingsRow}>
          {otherStars.map((r) => (
            <View key={r.category} style={styles.ratingChip}>
              <CategoryLabel category={r.category} />
              <StarRow score={r.score} size={10} />
            </View>
          ))}
        </View>
      )}

      {(moodRatings.length > 0 || facilityRatings.length > 0) && (
        <View style={styles.attributesRow}>
          {moodRatings.map((r) => (
            <View key={r.category} style={styles.moodAttrChip}>
              <CategoryLabel
                category={r.category}
                iconColor={colors.accent}
                textStyle={styles.moodAttrText}
              />
            </View>
          ))}
          {facilityRatings.map((r) => (
            <View key={r.category} style={styles.facilityAttrChip}>
              <CategoryLabel category={r.category} />
            </View>
          ))}
        </View>
      )}

      {review.text ? <ReviewBody text={review.text} /> : null}

      {media.length > 0 && (
        <View style={styles.mediaRow}>
          {media.map((m, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.85}
              onPress={() => onOpenMedia(media, i)}
            >
              {m.mediaType === 'photo' ? (
                <Image
                  source={{ uri: m.url }}
                  style={styles.mediaThumb}
                  cachePolicy="memory-disk"
                  transition={200}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.mediaThumb, styles.videoThumb]}>
                  <Play size={22} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function SkeletonRow() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, styles.skel]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.skel, styles.skelLineWide]} />
          <View style={[styles.skel, styles.skelLineNarrow]} />
        </View>
      </View>
      <View style={[styles.skel, styles.skelLineFull, { marginTop: 4 }]} />
      <View style={[styles.skel, styles.skelLineFull]} />
      <View style={[styles.skel, styles.skelLineMid]} />
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.listContainer}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  );
}

function EmptyState({ onWrite }: { onWrite: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <MessageSquareText size={32} color={colors.accent} strokeWidth={1.8} />
      </View>
      <Text style={styles.emptyTitle}>{t(reviewsText.listEmpty)}</Text>
      <Text style={styles.emptyHint}>
        Bagikan pengalamanmu di sini, bantu yang lain memilih cafe.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onWrite}>
        <PencilLine size={14} color={colors.white} strokeWidth={2.4} />
        <Text style={styles.emptyBtnText}>{t(reviewsText.beTheFirst)}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ZoomModal({
  state,
  onClose,
}: {
  state: ZoomState;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={!!state}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={styles.zoomRoot}>
        {state && (
          <FlatList
            data={state.list}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={state.index}
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
                  <Image
                    source={{ uri: item.url }}
                    style={styles.zoomImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                ) : (
                  <View style={styles.zoomVideoBox}>
                    <Video size={48} color={colors.textSecondary} strokeWidth={1.5} />
                    <Text style={styles.zoomVideoHint}>
                      {t(reviewsText.videoPreview)}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          />
        )}
        <TouchableOpacity
          style={styles.zoomCloseBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={22} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function ReviewsScreen() {
  const route = useRoute<RouteProp<RouteParams, 'Reviews'>>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { cafeId, cafeName } = route.params;
  const { user } = useAuth();

  const reviewsQuery = useReviews(cafeId);
  const summaryQuery = useReviewSummary(cafeId);
  const reviews: Review[] = reviewsQuery.data?.reviews ?? [];
  const summary: ReviewSummary[] = summaryQuery.data ?? [];
  const totalReviews =
    reviewsQuery.data?.meta?.total ?? reviews.length;
  const loading = reviewsQuery.isLoading || summaryQuery.isLoading;

  const starSummary = useMemo(
    () => summary.filter((s) => isStarCategory(s.category)),
    [summary],
  );
  const overall = useMemo(
    () => starSummary.find((s) => s.category === 'overall'),
    [starSummary],
  );

  const [zoomMedia, setZoomMedia] = useState<ZoomState>(null);

  const goWriteReview = () => {
    if (!user) {
      navigation.navigate('AuthModal');
      return;
    }
    navigation.navigate('WriteReview', { cafeId, cafeName });
  };

  const handleOpenMedia = (list: MediaItem[], index: number) =>
    setZoomMedia({ list, index });

  const ListHeader =
    starSummary.length > 0 ? (
      <HeroSummary
        starSummary={starSummary}
        overall={overall}
        totalReviews={totalReviews}
      />
    ) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        cafeName={cafeName}
        onBack={() => navigation.goBack()}
        onWrite={goWriteReview}
      />

      {loading ? (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {ListHeader}
          <LoadingState />
        </ScrollView>
      ) : reviews.length === 0 ? (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {ListHeader}
          <EmptyState onWrite={goWriteReview} />
        </ScrollView>
      ) : (
        <FlatList
          data={reviews.filter((r) => r && r.id)}
          keyExtractor={(r, i) => r?.id || `review-${i}`}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <ReviewCard review={item} onOpenMedia={handleOpenMedia} />
          )}
        />
      )}

      <ZoomModal state={zoomMedia} onClose={() => setZoomMedia(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E4DD',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  writeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  writeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },

  listContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },

  hero: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E8E4DD',
    marginBottom: spacing.xs,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  heroScoreCol: { flex: 1, alignItems: 'center', gap: 4 },
  heroScore: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: '#E8E4DD',
    marginHorizontal: spacing.md,
  },
  heroCountCol: { flex: 1, alignItems: 'center', gap: 2 },
  heroCountNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  heroCountLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  heroBars: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E4DD',
    gap: 8,
  },

  starsRow: { flexDirection: 'row', gap: 1 },

  categoryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  categoryLabelText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryLabelWrap: { width: 92 },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  summaryScore: {
    width: 26,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'right',
  },

  empty: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E8E4DD',
    padding: spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FDF6EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: 4,
  },
  emptyBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E8E4DD',
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  avatarFallback: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  cardName: { fontSize: 14, fontWeight: '700', color: colors.primary },
  cardSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  cardSubDot: { fontSize: 11, color: colors.textSecondary },
  cardDate: { fontSize: 11, color: colors.textSecondary },

  ratingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

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
    borderColor: 'rgba(212, 139, 58, 0.4)',
  },
  moodAttrText: { color: colors.accent, fontWeight: '700' },
  facilityAttrChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  reviewText: { fontSize: 14, color: colors.primary, lineHeight: 20 },
  expandBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 4,
  },

  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
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

  skel: { backgroundColor: '#EFECE6', borderRadius: 6 },
  skelLineWide: { height: 12, width: '60%' },
  skelLineNarrow: { height: 10, width: '35%' },
  skelLineFull: { height: 10, width: '100%', marginTop: 6 },
  skelLineMid: { height: 10, width: '70%', marginTop: 6 },

  zoomRoot: { flex: 1, backgroundColor: '#000' },
  zoomScrollContent: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: { width: SCREEN_W, height: SCREEN_H * 0.85 },
  zoomVideoBox: {
    width: SCREEN_W,
    height: SCREEN_H * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomVideoHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 12,
  },
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
});
