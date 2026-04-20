import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, Dimensions,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { createReview } from '../services/api';
import { colors, spacing, radius } from '../theme';

const { width } = Dimensions.get('window');

type RouteParams = { WriteReview: { cafeId: string; cafeName: string } };

// ── Step definitions ───────────────────────────────────────────────────────
const MOODS = [
  { key: 'me-time', label: 'Me Time', emoji: '🧘' },
  { key: 'date', label: 'Date', emoji: '💑' },
  { key: 'family', label: 'Family Time', emoji: '👨‍👩‍👧' },
  { key: 'group-work', label: 'Group Study', emoji: '📚' },
  { key: 'wfc', label: 'WFC', emoji: '💻' },
];

const FACILITIES = [
  { key: 'wifi', label: 'WiFi', icon: '📶' },
  { key: 'power_outlet', label: 'Power Outlet', icon: '🔌' },
  { key: 'mushola', label: 'Mushola', icon: '🕌' },
  { key: 'parking', label: 'Parking', icon: '🅿️' },
  { key: 'kid_friendly', label: 'Kid-Friendly', icon: '👶' },
  { key: 'quiet_atmosphere', label: 'Quiet', icon: '🤫' },
  { key: 'large_tables', label: 'Large Tables', icon: '🪑' },
  { key: 'outdoor_area', label: 'Outdoor', icon: '🌿' },
];

const TOTAL_STEPS = 5;

type MediaItem = { uri: string; type: 'photo' | 'video' };

export default function WriteReviewScreen() {
  const route = useRoute<RouteProp<RouteParams, 'WriteReview'>>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { cafeId, cafeName } = route.params;

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
      case 1: return true; // facilities optional
      case 2: return true; // text optional
      case 3: return true; // media optional
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
      Alert.alert('Maksimal 5 foto', 'Kamu sudah mencapai batas foto.');
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
      Alert.alert('Maksimal 2 video', 'Kamu sudah mencapai batas video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
      videoMaxDuration: 30,
    });
    if (!result.canceled && result.assets[0]) {
      setMedia((prev) => [...prev, { uri: result.assets[0].uri, type: 'video' }]);
    }
  };

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
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
      // Filter out invalid/empty URIs. For MVP we store the local file:// URI —
      // it's just a string path so payload stays tiny. True upload (multipart to
      // S3/Cloudinary) is a production-phase feature.
      const mediaPayload = media
        .filter((m) => m && m.uri && typeof m.uri === 'string' && m.uri.length < 2000)
        .map((m) => ({
          mediaType: m.type,
          url: m.uri,
        }));
      await createReview(cafeId, {
        text: text.trim() || undefined,
        ratings,
        media: mediaPayload.length > 0 ? mediaPayload : undefined,
      });
      // Pop back to the previous screen (CafeDetail) and inject a timestamp
      // signal via setParams so the original route params (cafe) stay intact.
      // Using goBack + setParams is safer than navigate(CafeDetail) which may
      // clobber the cafe param despite merge:true.
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
      const msg = err?.response?.data?.message || 'Gagal mengirim review';
      Alert.alert('Error', typeof msg === 'string' ? msg : msg[0]);
      setSubmitting(false);
    }
  };

  // ── Step renderers ───────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Mood kamu pas di sini?</Text>
            <Text style={styles.stepHint}>Pilih satu yang paling cocok</Text>
            <View style={styles.optionsGrid}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.optionCard, mood === m.key && styles.optionCardActive]}
                  onPress={() => setMood(m.key)}
                >
                  <Text style={styles.optionEmoji}>{m.emoji}</Text>
                  <Text style={[styles.optionLabel, mood === m.key && styles.optionLabelActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Fasilitas apa yang kamu pake?</Text>
            <Text style={styles.stepHint}>Pilih semua yang relevan</Text>
            <View style={styles.facilityGrid}>
              {FACILITIES.map((f) => {
                const active = facilities.includes(f.key);
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.facChip, active && styles.facChipActive]}
                    onPress={() => toggleFacility(f.key)}
                  >
                    <Text style={styles.facIcon}>{f.icon}</Text>
                    <Text style={[styles.facLabel, active && styles.facLabelActive]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Ceritain pengalaman kamu</Text>
            <Text style={styles.stepHint}>Opsional — skip aja kalau ga mau nulis</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={6}
              placeholder="Cafe ini bikin ku ..."
              placeholderTextColor={colors.textSecondary}
              value={text}
              onChangeText={setText}
              maxLength={2000}
            />
            <Text style={styles.charCount}>{text.length} / 2000</Text>
          </View>
        );

      case 3: {
        const photoCount = media.filter((m) => m.type === 'photo').length;
        const videoCount = media.filter((m) => m.type === 'video').length;
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Upload foto & video</Text>
            <Text style={styles.stepHint}>Maksimal 5 foto, 2 video · opsional</Text>
            <View style={styles.mediaButtonsRow}>
              <TouchableOpacity style={styles.mediaBtn} onPress={pickPhoto} disabled={photoCount >= 5}>
                <Text style={styles.mediaBtnIcon}>📷</Text>
                <Text style={styles.mediaBtnText}>Foto ({photoCount}/5)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaBtn} onPress={pickVideo} disabled={videoCount >= 2}>
                <Text style={styles.mediaBtnIcon}>🎥</Text>
                <Text style={styles.mediaBtnText}>Video ({videoCount}/2)</Text>
              </TouchableOpacity>
            </View>

            {media.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreview}>
                {media.map((m, i) => (
                  <View key={i} style={styles.mediaItem}>
                    {m.type === 'photo' ? (
                      <Image source={{ uri: m.uri }} style={styles.mediaThumb} />
                    ) : (
                      <View style={[styles.mediaThumb, styles.videoThumb]}>
                        <Text style={styles.videoEmoji}>🎥</Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeMedia(i)}>
                      <Text style={styles.removeBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        );
      }

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Rating overall</Text>
            <Text style={styles.stepHint}>Seberapa bagus cafe ini?</Text>
            <View style={styles.bigStars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Text style={[styles.bigStar, rating >= s && styles.bigStarActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {rating === 0 ? 'Pilih bintang' :
               rating === 5 ? '🔥 Mantap jiwa!' :
               rating === 4 ? '😊 Bagus banget' :
               rating === 3 ? '👍 Oke lah' :
               rating === 2 ? '😐 Biasa aja' :
               '😕 Kurang'}
            </Text>
          </View>
        );

      default: return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Backdrop area — taps here = dismiss */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => navigation.goBack()} />

      {/* Card modal */}
      <View style={[styles.card, { marginBottom: insets.bottom + spacing.md }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.closeX}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review {cafeName}</Text>
          <Text style={styles.stepNum}>{step + 1}/{TOTAL_STEPS}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
        </View>

        {/* Step body — scrollable */}
        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {renderStep()}
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnBack, step === 0 && styles.navBtnDisabled]}
            onPress={prev}
            disabled={step === 0}
          >
            <Text style={styles.navBtnBackText}>‹ Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnNext, (!canProceed() || submitting) && styles.navBtnDisabled]}
            onPress={next}
            disabled={!canProceed() || submitting}
          >
            <Text style={styles.navBtnNextText}>
              {submitting ? '...' : step === TOTAL_STEPS - 1 ? 'Kirim Review' : 'Next ›'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  backdrop: { flex: 1 },

  card: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    marginHorizontal: spacing.md,
    maxHeight: '85%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  closeX: { fontSize: 22, color: colors.textSecondary, fontWeight: '700', width: 32 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.primary, flex: 1, textAlign: 'center' },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.accent, width: 32, textAlign: 'right' },

  progressBg: {
    height: 4,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },

  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  stepContent: { paddingVertical: spacing.md, minHeight: 280 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  stepHint: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.lg },

  // Mood grid
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionCard: {
    width: (width - spacing.md * 2 - spacing.lg * 2 - spacing.sm) / 2,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardActive: { borderColor: colors.accent, backgroundColor: '#FDF6EC' },
  optionEmoji: { fontSize: 30, marginBottom: 6 },
  optionLabel: { fontSize: 14, fontWeight: '700', color: colors.primary },
  optionLabelActive: { color: colors.accent },

  // Facility grid
  facilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  facChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  facChipActive: { borderColor: colors.accent, backgroundColor: '#FDF6EC' },
  facIcon: { fontSize: 16, marginRight: 6 },
  facLabel: { fontSize: 13, fontWeight: '600', color: colors.primary },
  facLabelActive: { color: colors.accent },

  // Text area
  textArea: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.primary,
    textAlignVertical: 'top',
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  charCount: { fontSize: 11, color: colors.textSecondary, textAlign: 'right', marginTop: 4 },

  // Media step
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
  mediaBtnIcon: { fontSize: 28, marginBottom: 4 },
  mediaBtnText: { fontSize: 13, fontWeight: '700', color: colors.accent },
  mediaPreview: { marginTop: spacing.sm },
  mediaItem: { marginRight: spacing.sm, position: 'relative' },
  mediaThumb: { width: 80, height: 80, borderRadius: radius.sm, backgroundColor: colors.surface },
  videoThumb: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },
  videoEmoji: { fontSize: 28 },
  removeBtn: {
    position: 'absolute',
    top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.error,
    justifyContent: 'center', alignItems: 'center',
  },
  removeBtnText: { color: colors.white, fontSize: 16, fontWeight: '700', lineHeight: 18 },

  // Rating
  bigStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  bigStar: { fontSize: 48, color: colors.surface },
  bigStarActive: { color: colors.accent },
  ratingLabel: { fontSize: 16, fontWeight: '700', color: colors.primary, textAlign: 'center', marginTop: spacing.lg },

  // Nav bar
  navBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface,
    gap: spacing.sm,
  },
  navBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  navBtnBack: {
    backgroundColor: colors.surface,
  },
  navBtnBackText: { color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
  navBtnNext: { backgroundColor: colors.accent },
  navBtnNextText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  navBtnDisabled: { opacity: 0.5 },
});
