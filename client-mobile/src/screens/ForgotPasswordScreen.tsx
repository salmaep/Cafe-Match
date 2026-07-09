import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { forgotPasswordApi, resetPasswordApi } from '../services/api';
import { colors, spacing, radius } from '../theme';

type Step = 'email' | 'reset';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordMismatch = !!confirmPassword && newPassword !== confirmPassword;

  const submitEmail = async () => {
    setError('');
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Format email tidak valid');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPasswordApi(trimmed);
      setEmailHint(res.emailHint);
      if (res.otpId) {
        setOtpId(res.otpId);
        setStep('reset');
      } else {
        Alert.alert(
          'Kode dikirim',
          'Kalau email ini terdaftar, kode reset udah dikirim ke inbox kamu. Cek email dulu ya.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Gagal kirim kode. Coba lagi.',
      );
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    setError('');
    if (!/^\d{4,8}$/.test(code)) {
      setError('Kode harus 4–8 digit angka');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setError('Password harus ada huruf besar, huruf kecil, dan angka');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password nggak sama');
      return;
    }
    if (!otpId) {
      setError('Sesi tidak valid, minta kode baru');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordApi({ otpId, code, newPassword });
      Alert.alert(
        'Password berhasil diganti',
        'Silakan login pakai password baru kamu.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Gagal reset password. Coba lagi.',
      );
    } finally {
      setLoading(false);
    }
  };

  const goBackStep = () => {
    if (step === 'reset') {
      setStep('email');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={goBackStep} style={styles.backBtn}>
          <ChevronLeft size={22} color={colors.primary} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.stepBadge}>
          Langkah {step === 'email' ? '1' : '2'} / 2
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconCircle}>
          {step === 'email' ? (
            <Mail size={26} color={colors.accent} strokeWidth={2.2} />
          ) : (
            <Lock size={26} color={colors.accent} strokeWidth={2.2} />
          )}
        </View>

        <Text style={styles.title}>
          {step === 'email' ? 'Lupa Password?' : 'Reset Password'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'email'
            ? 'Masukin email akun kamu, kita kirimin kode ke inbox buat reset password.'
            : `Kode reset udah dikirim ke ${emailHint}. Masukin kode + password baru kamu.`}
        </Text>

        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {step === 'email' ? (
          <>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError('');
              }}
              placeholder="kamu@email.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={submitEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitText}>Kirim Kode</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>KODE OTP</Text>
            <TextInput
              style={styles.otpInput}
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, '').slice(0, 8));
                setError('');
              }}
              placeholder="••••••"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={8}
              autoComplete="one-time-code"
            />

            <Text style={styles.label}>PASSWORD BARU</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={[styles.input, styles.inputWithEye]}
                value={newPassword}
                onChangeText={(v) => {
                  setNewPassword(v);
                  setError('');
                }}
                placeholder="Min 8, huruf besar/kecil + angka"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.textSecondary} strokeWidth={2} />
                ) : (
                  <Eye size={18} color={colors.textSecondary} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>KONFIRMASI PASSWORD</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputWithEye,
                  passwordMismatch && styles.inputError,
                ]}
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  setError('');
                }}
                placeholder="Ulangi password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirm}
                autoComplete="new-password"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showConfirm ? (
                  <EyeOff size={18} color={colors.textSecondary} strokeWidth={2} />
                ) : (
                  <Eye size={18} color={colors.textSecondary} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
            {passwordMismatch && (
              <Text style={styles.mismatchHint}>Password nggak sama</Text>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={submitReset}
              disabled={loading || passwordMismatch}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    textTransform: 'uppercase',
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 60,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent + '18',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  inputError: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  otpInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    fontSize: 22,
    color: colors.primary,
    marginBottom: spacing.md,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '800',
  },
  pwWrap: { position: 'relative' },
  inputWithEye: { paddingRight: 44 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  mismatchHint: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
