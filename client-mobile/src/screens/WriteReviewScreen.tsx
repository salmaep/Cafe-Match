import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { commonText, reviewsText } from '@shared/i18n/keys';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { createReview, uploadReviewMedia } from '../services/api';
import MediaZoomModal, { ZoomMediaItem } from '../components/MediaZoomModal';
import { colors, spacing, radius } from '../theme';
import { usePurposes } from '../queries/purposes/use-purposes';
import { useCafeFilters } from '../queries/cafes/use-cafe-filters';
import { useAuth } from '../context/AuthContext';
import { Camera, Video as VideoIcon, Star, LucideIcon } from '../utils/lucideIcon';
import { X } from 'lucide-react-native';
import { chipFromFacilityKey } from '@shared/constants/facilities';
import { lucideForFacility } from '../utils/lucideIcon';

const { width } = Dimensions.get('window');

type RouteParams = { WriteReview: { cafeId: string; cafeName: string } };

const TOTAL_STEPS = 5;

type MediaItem = { uri: string; type: 'photo' | 'video'; thumbnailUri?: string };

export default function WriteReviewScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RouteParams, 'WriteReview'>>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { cafeId, cafeName } = route.params;
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigation.replace('AuthModal');
    }
  }, [user, navigation]);

  const [zoomState, setZoomState] = useState<{
    list: ZoomMediaItem[];
    index: number;
  } | null>(null);


  const filtersQuery = useCafeFilters();
  const filterGroups = filtersQuery.data?.groups ?? [];
  const facilityOptions = useMemo(
    () =>
      filterGroups.flatMap((g) =>
        g.options.map((o) => ({
          key: o.key,
          label: o.label,
          icon: lucideForFacility(o.key) ?? chipFromFacilityKey(o.key).icon,
        })),
      ),
    [filterGroups],
  );
  const purposesQuery = usePurposes();
  const moodOptions = purposesQuery.data ?? [];

  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const toggleFacility = (key: string) => {
    setFacilities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const canProceed = () => {
    switch (step) {
      case 0: return mood !== null;
      case 1: return true;
      case 2: return true;
      case 3: return true;
      case 4: return rating > 0;
      default: return false;
    }
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else handleSubmit();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const pickPhoto = async () => {
    const photoCount = media.filter((m) => m.type === 'photo').length;
    if (photoCount >= 5) {
      Alert.alert('Maksimal 5 foto', 'Udah nyampe batas foto nih.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setMedia((prev) => [...prev, { uri: result.assets[0].uri, type: 'photo' }]);
    }
  };

  const pickVideo = async () => {
    const videoCount = media.filter((m) => m.type === 'video').length;
    if (videoCount >= 2) {
      Alert.alert('Maksimal 2 video', 'Udah nyampe batas video nih.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
      videoMaxDuration: 30,
    });
    if (!result.canceled && result.assets[0]) {
      const videoUri = result.assets[0].uri;
      let thumbnailUri: string | undefined;
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: 1000,
          quality: 0.7,
        });
        thumbnailUri = uri;
      } catch {
        // Fallback: render placeholder icon below if thumbnail extraction fails.
      }
      setMedia((prev) => [...prev, { uri: videoUri, type: 'video', thumbnailUri }]);
    }
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) {
      navigation.replace('AuthModal');
      return;
    }
    if (!mood) {
      Alert.alert('Oops', 'Pilih mood dulu ya');
      setStep(0);
      return;
    }
    if (rating === 0) {
      Alert.alert('Oops', 'Kasih rating bintang dulu ya');
      setStep(4);
      return;
    }

    setSubmitting(true);
    try {
      const ratings: { category: string; score: number }[] = [
        { category: `mood_${mood}`, score: 5 },
        ...facilities.map((f) => ({ category: `facility_${f}`, score: 5 })),
        { category: 'overall', score: rating },
      ];

      const validMedia = media.filter(
        (m) => m && m.uri && typeof m.uri === 'string',
      );
      const uploaded = await Promise.all(
        validMedia.map((m) => uploadReviewMedia(m.uri, m.type)),
      );
      const mediaPayload = uploaded.map((u) => ({
        mediaType: u.mediaType,
        url: u.url,
      }));

      await createReview(cafeId, {
        text: text.trim() || undefined,
        ratings,
        media: mediaPayload.length > 0 ? mediaPayload : undefined,
      });
      try {
        const parentState = navigation.getState();
        const prevIndex = Math.max(0, parentState.index - 1);
        const prevRoute = parentState.routes[prevIndex];
        if (prevRoute?.name === 'CafeDetail') {
          navigation.dispatch({
            ...({ type: 'SET_PARAMS' } as any),
            source: prevRoute.key,
            payload: { params: { newReviewTimestamp: Date.now() } },
          });
        }
      } catch {}
      navigation.goBack();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Gagal kirim review';
      Alert.alert('Error', typeof msg === 'string' ? msg : msg[0]);
      setSubmitting(false);
    }
  };

  const renderProgressDots = () => (
    <View style={styles.dotsRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
        />
      ))}
    </View>
  );

  if (!user) {
    return <View style={styles.container} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {step > 0 ? (
          <TouchableOpacity onPress={prev} disabled={submitting}>
            <Text
              style={[styles.backText, submitting && styles.headerBtnDisabled]}
            >
              {t(commonText.back)}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
        {renderProgressDots()}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={submitting}
        >
          <Text
            style={[styles.skipText, submitting && styles.headerBtnDisabled]}
          >
            {t(commonText.close)}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {step === 0 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t(reviewsText.writeMoodTitle)}</Text>
            <Text style={styles.stepSubtitle}>
              {t(reviewsText.writeMoodSubtitle, { cafeName })}
            </Text>
            <ScrollView
              contentContainerStyle={styles.optionsGrid}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              {moodOptions.map((m) => {
                const active = mood === m.slug;
                return (
                  <TouchableOpacity
                    key={m.slug}
                    style={[styles.optionCard, active && styles.optionCardActive]}
                    onPress={() => setMood(m.slug)}
                  >
                    <View style={styles.optionIconWrap}>
                      <LucideIcon
                        name={m.icon}
                        size={26}
                        color={active ? colors.accent : colors.primary}
                        strokeWidth={2}
                      />
                    </View>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {m.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t(reviewsText.writeFacilitiesTitle)}</Text>
            <Text style={styles.stepSubtitle}>{t(reviewsText.writeFacilitiesSubtitle)}</Text>
            <ScrollView
              contentContainerStyle={{ paddingBottom: spacing.xxl }}
              showsVerticalScrollIndicator
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              {filtersQuery.isLoading && facilityOptions.length === 0 ? (
                <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : facilityOptions.length === 0 ? (
                <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                  <Text style={styles.emptyFilterText}>{t(reviewsText.writeFacilitiesEmpty)}</Text>
                </View>
              ) : (
                <View style={styles.facilityChipWrap}>
                  {facilityOptions.map((f) => {
                    const active = facilities.includes(f.key);
                    return (
                      <TouchableOpacity
                        key={f.key}
                        onPress={() => toggleFacility(f.key)}
                        style={[styles.facilityChip, active && styles.facilityChipActive]}
                      >
                        <LucideIcon
                          name={f.icon}
                          size={14}
                          color={active ? colors.accent : colors.primary}
                          strokeWidth={2}
                        />
                        <Text
                          style={[
                            styles.facilityChipLabel,
                            active && styles.facilityChipLabelActive,
                          ]}
                        >
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t(reviewsText.writeStoryTitle)}</Text>
            <Text style={styles.stepSubtitle}>{t(reviewsText.writeStorySubtitle)}</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={6}
              placeholder={t(reviewsText.writeStoryPlaceholder)}
              placeholderTextColor={colors.textSecondary}
              value={text}
              onChangeText={setText}
              maxLength={2000}
            />
            <Text style={styles.charCount}>{text.length} / 2000</Text>
          </View>
        )}

        {step === 3 && (() => {
          const photoCount = media.filter((m) => m.type === 'photo').length;
          const videoCount = media.filter((m) => m.type === 'video').length;
          return (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>{t(reviewsText.writeMediaTitle)}</Text>
              <Text style={styles.stepSubtitle}>{t(reviewsText.writeMediaSubtitle)}</Text>
              <View style={styles.mediaButtonsRow}>
                <TouchableOpacity style={styles.mediaBtn} onPress={pickPhoto} disabled={photoCount >= 5}>
                  <Camera size={28} strokeWidth={1.8} color={colors.accent} style={{ marginBottom: 6 }} />
                  <Text style={styles.mediaBtnText}>{t(reviewsText.photoCount, { current: photoCount, max: 5 })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaBtn} onPress={pickVideo} disabled={videoCount >= 2}>
                  <VideoIcon size={28} strokeWidth={1.8} color={colors.accent} style={{ marginBottom: 6 }} />
                  <Text style={styles.mediaBtnText}>{t(reviewsText.videoCount, { current: videoCount, max: 2 })}</Text>
                </TouchableOpacity>
              </View>

              {media.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreview}>
                  {media.map((m, i) => (
                    <View key={i} style={styles.mediaItem}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() =>
                          setZoomState({
                            list: media.map((mm) => ({
                              mediaType: mm.type,
                              url: mm.uri,
                            })),
                            index: i,
                          })
                        }
                      >
                        {m.type === 'photo' ? (
                          <Image source={{ uri: m.uri }} style={styles.mediaThumb} />
                        ) : m.thumbnailUri ? (
                          <View style={styles.mediaThumb}>
                            <Image
                              source={{ uri: m.thumbnailUri }}
                              style={styles.mediaThumb}
                            />
                            <View style={styles.videoOverlay}>
                              <VideoIcon size={20} strokeWidth={2.2} color="#FFF" />
                            </View>
                          </View>
                        ) : (
                          <View style={[styles.mediaThumb, styles.videoThumb]}>
                            <VideoIcon size={28} strokeWidth={1.8} color="#FFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeMedia(i)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                      >
                        <X size={14} color="#FFFFFF" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          );
        })()}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>{t(reviewsText.writeRatingTitle)}</Text>
            <Text style={styles.stepSubtitle}>{t(reviewsText.writeRatingSubtitle)}</Text>
            <View style={styles.bigStars}>
              {[1, 2, 3, 4, 5].map((s) => {
                const filled = rating >= s;
                return (
                  <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Star
                      size={42}
                      strokeWidth={1.5}
                      color={filled ? colors.accent : '#E8E4DD'}
                      fill={filled ? colors.accent : 'none'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.ratingLabel}>
              {rating === 0 ? t(reviewsText.pickStar) :
               rating === 5 ? t(reviewsText.rating5) :
               rating === 4 ? t(reviewsText.rating4) :
               rating === 3 ? t(reviewsText.rating3) :
               rating === 2 ? t(reviewsText.rating2) :
               t(reviewsText.rating1)}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <TouchableOpacity
          style={[styles.nextBtn, (!canProceed() || submitting) && styles.nextBtnDisabled]}
          onPress={next}
          disabled={!canProceed() || submitting}
        >
          {submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.nextBtnText}>Mengunggah…</Text>
            </View>
          ) : (
            <Text style={styles.nextBtnText}>
              {step === TOTAL_STEPS - 1 ? t(reviewsText.submitReview) : t(commonText.next)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <MediaZoomModal
        list={zoomState?.list ?? null}
        initialIndex={zoomState?.index ?? 0}
        onClose={() => setZoomState(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  backText: { fontSize: 15, color: colors.primary, fontWeight: '500' },
  skipText: { fontSize: 15, color: colors.textSecondary },
  headerBtnDisabled: { opacity: 0.3 },
  dotsRow: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  dotActive: { backgroundColor: colors.accent, width: 24 },
  dotDone: { backgroundColor: colors.accent },

  stepContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },

  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  optionCard: {
    width: (width - spacing.lg * 2 - spacing.sm) / 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 110,
  },
  optionCardActive: {
    borderColor: colors.accent,
    backgroundColor: '#FDF6EC',
  },
  optionIconWrap: { marginBottom: 8, height: 32, alignItems: 'center', justifyContent: 'center' },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  optionLabelActive: { color: colors.accent },

  facilityChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  facilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  facilityChipActive: {
    borderColor: colors.accent,
    backgroundColor: '#FDF6EC',
  },
  facilityChipIcon: { fontSize: 14, lineHeight: 16 },
  facilityChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1A',
  },
  facilityChipLabelActive: { color: colors.accent },

  emptyFilterText: {
    fontSize: 13,
    color: '#8A8880',
    fontStyle: 'italic',
  },

  textArea: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.primary,
    textAlignVertical: 'top',
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  charCount: { fontSize: 11, color: colors.textSecondary, textAlign: 'right', marginTop: 4 },

  mediaButtonsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  mediaBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent + '50',
  },
  mediaBtnText: { fontSize: 13, fontWeight: '700', color: colors.accent },
  mediaPreview: {
    marginTop: spacing.sm,
    paddingTop: 12,
    paddingRight: 12,
    overflow: 'visible',
  },
  mediaItem: {
    marginRight: spacing.sm,
    position: 'relative',
    overflow: 'visible',
  },
  mediaThumb: { width: 80, height: 80, borderRadius: radius.sm, backgroundColor: colors.surface },
  videoThumb: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: -8, right: -8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  removeBtnText: { color: colors.white, fontSize: 16, fontWeight: '700', lineHeight: 18 },

  bigStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  ratingLabel: { fontSize: 16, fontWeight: '700', color: colors.primary, textAlign: 'center', marginTop: spacing.lg },

  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
