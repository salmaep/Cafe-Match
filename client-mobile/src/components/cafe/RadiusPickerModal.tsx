// Radius picker bottom-sheet modal — used by both WizardScreen step 2 and
// the Explore (MapScreen) bottom sheet so the UX is identical in both.
// Shows quick-pick pills + a manual-input field, capped 0.5–10 km.
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { commonText, filtersText } from '@shared/i18n/keys';
import { colors, spacing, radius } from '../../theme';

interface Props {
  visible: boolean;
  initial: number;
  onClose: () => void;
  onApply: (v: number) => void;
}

const ALL_OPTIONS = [0.5, 1, 2, 3, 5, 7, 10];

export default function RadiusPickerModal({
  visible,
  initial,
  onClose,
  onApply,
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = React.useState<string>(String(initial));

  React.useEffect(() => {
    if (visible) setDraft(String(initial));
  }, [visible, initial]);

  const parsed = (() => {
    if (draft === '' || draft === '.') return null;
    const n = Number(draft.replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    return Math.max(0.5, Math.min(10, n));
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>{t(filtersText.radiusTitle)}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>{t(filtersText.quickPick)}</Text>
          <View style={styles.pillRow}>
            {ALL_OPTIONS.map((r) => {
              const active = parsed === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setDraft(String(r))}
                >
                  <Text
                    style={[styles.pillText, active && styles.pillTextActive]}
                  >
                    {r} km
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>{t(filtersText.manualInput)}</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={draft}
              placeholder={t(filtersText.radiusInputPlaceholder)}
              placeholderTextColor="#A8A59C"
              onChangeText={setDraft}
              maxLength={5}
              autoFocus
            />
            <Text style={styles.unit}>km</Text>
          </View>
          <Text style={styles.helpText}>{t(filtersText.radiusHelp)}</Text>

          <TouchableOpacity
            style={[styles.applyBtn, parsed === null && styles.applyBtnDisabled]}
            onPress={() => parsed !== null && onApply(parsed)}
            disabled={parsed === null}
          >
            <Text style={styles.applyBtnText}>
              {parsed !== null ? t(filtersText.applyWithValue, { value: parsed }) : t(commonText.apply)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D9D6CE',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.primary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 18, color: colors.textSecondary },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: spacing.sm,
    marginBottom: 8,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: '#FDF6EC',
    borderColor: colors.accent,
  },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  pillTextActive: { color: colors.accent },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    paddingVertical: 12,
  },
  unit: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  helpText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
  },

  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnDisabled: { opacity: 0.5 },
  applyBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
