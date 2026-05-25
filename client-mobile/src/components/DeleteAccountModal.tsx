import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { profileText } from '@shared/i18n/keys';
import { useAuth } from '../context/AuthContext';
import { deleteAccountApi } from '../services/api';
import { colors, spacing, radius } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteAccountModal({ visible, onClose, onDeleted }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [credential, setCredential] = useState('');
  const [acknowledge, setAcknowledge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const isOAuth = !!user.provider && user.provider !== 'local';
  const needsEmail = isOAuth;
  const isValid = credential.trim().length > 0 && acknowledge && !loading;

  const reset = () => {
    setCredential('');
    setAcknowledge(false);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await deleteAccountApi({
        ...(needsEmail
          ? { emailConfirmation: credential.trim() }
          : { password: credential }),
        acknowledge,
      });
      reset();
      onDeleted();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? t(profileText.deleteAccountGenericError);
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>{t(profileText.deleteAccountTitle)}</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>
                ⚠️ {t(profileText.deleteAccountWarningTitle)}
              </Text>
              <Text style={styles.warningItem}>
                • {t(profileText.deleteAccountWarning1)}
              </Text>
              <Text style={styles.warningItem}>
                • {t(profileText.deleteAccountWarning2)}
              </Text>
              <Text style={styles.warningItem}>
                • {t(profileText.deleteAccountWarning3)}
              </Text>
            </View>

            <View>
              <Text style={styles.fieldLabel}>
                {needsEmail
                  ? t(profileText.deleteAccountEmailLabel, { email: user.email })
                  : t(profileText.deleteAccountPasswordLabel)}
              </Text>
              <TextInput
                style={styles.input}
                value={credential}
                onChangeText={(v) => {
                  setCredential(v);
                  setError(null);
                }}
                placeholder={needsEmail ? user.email : '••••••••'}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!needsEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={needsEmail ? 'email-address' : 'default'}
                autoComplete={needsEmail ? 'email' : 'current-password'}
              />
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAcknowledge((v) => !v)}
              activeOpacity={0.7}
            >
              <View
                style={[styles.checkbox, acknowledge && styles.checkboxChecked]}
              >
                {acknowledge && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                {t(profileText.deleteAccountAcknowledge)}
              </Text>
            </TouchableOpacity>

            {!!error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>
                  {t(profileText.deleteAccountCancel)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.deleteBtn,
                  !isValid && styles.deleteBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!isValid}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.deleteBtnText}>
                    {t(profileText.deleteAccountConfirm)}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const DANGER = '#DC2626';
const DANGER_BG = '#FEF2F2';
const DANGER_BORDER = '#FECACA';

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: 40,
    maxHeight: '92%',
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  title: { fontSize: 17, fontWeight: '700', color: DANGER },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 18, color: colors.textSecondary },

  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },

  warningBox: {
    backgroundColor: DANGER_BG,
    borderWidth: 1,
    borderColor: DANGER_BORDER,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
    marginBottom: 4,
  },
  warningItem: { fontSize: 12, color: DANGER, lineHeight: 18 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.primary,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: DANGER,
    borderColor: DANGER,
  },
  checkmark: { color: colors.white, fontSize: 13, fontWeight: '700' },
  checkboxLabel: { flex: 1, fontSize: 12, color: '#5C5A52', lineHeight: 18 },

  errorBanner: {
    backgroundColor: DANGER_BG,
    borderWidth: 1,
    borderColor: DANGER_BORDER,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  errorText: { fontSize: 13, color: DANGER },

  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  cancelBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  deleteBtn: { backgroundColor: DANGER },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
