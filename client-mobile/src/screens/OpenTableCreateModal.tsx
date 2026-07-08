import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Users, Minus, Plus } from 'lucide-react-native';
import { useOpenTables } from '../context/OpenTablesContext';
import { colors, spacing, radius } from '../theme';
import type { TableGenderRule } from '../services/api';

type Params = {
  OpenTableCreateModal: { cafeId: string; cafeName: string };
};

const DEFAULT_CAPACITY = 4;
const MIN_CAPACITY = 1;
const MAX_CAPACITY = 200;

const GENDER_OPTIONS: { key: TableGenderRule; label: string }[] = [
  { key: 'any', label: 'Semua' },
  { key: 'female_only', label: 'Cewe only' },
  { key: 'male_only', label: 'Cowo only' },
];

export default function OpenTableCreateModal() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<Params, 'OpenTableCreateModal'>>();
  const insets = useSafeAreaInsets();
  const { create, myActive } = useOpenTables();
  const { cafeId, cafeName } = route.params;

  const [title, setTitle] = useState('');
  const [maxGuests, setMaxGuests] = useState(DEFAULT_CAPACITY);
  const [genderRule, setGenderRule] = useState<TableGenderRule>('any');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const decCapacity = () =>
    setMaxGuests((v) => Math.max(MIN_CAPACITY, v - 1));
  const incCapacity = () =>
    setMaxGuests((v) => Math.min(MAX_CAPACITY, v + 1));

  const submit = async () => {
    if (submitting) return;
    setError('');
    if (myActive) {
      Alert.alert(
        'Udah hosting',
        `Lo lagi hosting di ${myActive.cafe?.name ?? 'cafe lain'}. Close dulu.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await create({
        cafeId: Number(cafeId),
        title: title.trim() || undefined,
        maxGuests,
        genderRule,
      });
      navigation.goBack();
      setTimeout(() => {
        Alert.alert('Open table dibuka!', `Table lo di ${cafeName} udah live.`);
      }, 250);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Gagal buka table',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => navigation.goBack()}
      />
      <View style={[styles.sheet, { paddingBottom: 32 + insets.bottom }]}>
        <View style={styles.handleBar} />

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Open Table</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              di {cafeName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
          >
            <X size={18} color={colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.fieldLabel}>TITLE (OPSIONAL)</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              placeholder="Vibe apa? WFC, mabar, brainstorm…"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.hint}>{title.length} / 100</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Users size={14} color={colors.accent} strokeWidth={2.2} />
              <Text style={styles.sectionTitle}>Max Guests</Text>
            </View>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                onPress={decCapacity}
                style={[
                  styles.stepBtn,
                  maxGuests <= MIN_CAPACITY && styles.stepBtnDisabled,
                ]}
                disabled={maxGuests <= MIN_CAPACITY}
              >
                <Minus size={18} color={colors.primary} strokeWidth={2.4} />
              </TouchableOpacity>
              <View style={styles.stepValueBox}>
                <Text style={styles.stepValue}>{maxGuests}</Text>
                <Text style={styles.stepValueLabel}>orang</Text>
              </View>
              <TouchableOpacity
                onPress={incCapacity}
                style={[
                  styles.stepBtn,
                  maxGuests >= MAX_CAPACITY && styles.stepBtnDisabled,
                ]}
                disabled={maxGuests >= MAX_CAPACITY}
              >
                <Plus size={18} color={colors.primary} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>1–200 orang · nggak termasuk lo</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gender Rule</Text>
            <View style={styles.chipWrap}>
              {GENDER_OPTIONS.map((o) => {
                const active = genderRule === o.key;
                return (
                  <TouchableOpacity
                    key={o.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setGenderRule(o.key)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active && styles.chipTextActive,
                      ]}
                    >
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.hint}>
              Kalau non-"Semua", gender lo di profile harus di-set.
            </Text>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>Buka Table</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    maxHeight: '90%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary + '40',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.primary },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  section: { gap: spacing.sm },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.primary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 4,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepValueBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  stepValue: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.primary,
    lineHeight: 30,
  },
  stepValueLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 1,
    letterSpacing: 0.8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  chipTextActive: { color: colors.white },
  hint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  submitBtn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
