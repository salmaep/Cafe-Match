import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3084/api/v1';

WebBrowser.maybeCompleteAuthSession();

interface OtpChallenge {
  otpId: string;
  phoneHint?: string;
  expiresAt?: string;
}

const RESEND_COOLDOWN_MS = 60_000;

function fmtTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AuthModal() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { login, register, loginWithToken, verify2fa, resend2fa } = useAuth();

  // ─── Form state ──────────────────────────────────────────────────────────
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  // ─── Inline feedback ─────────────────────────────────────────────────────
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ─── 2FA / OTP ───────────────────────────────────────────────────────────
  const [otpChallenge, setOtpChallenge] = useState<OtpChallenge | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpNow, setOtpNow] = useState(Date.now());
  const lastSentAt = useRef(Date.now());
  const [resending, setResending] = useState(false);

  // Live clock for OTP countdown / resend cooldown
  useEffect(() => {
    if (!otpChallenge) return;
    const t = setInterval(() => setOtpNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [otpChallenge]);

  const expiresMs = otpChallenge?.expiresAt
    ? new Date(otpChallenge.expiresAt).getTime() - otpNow
    : Infinity;
  const otpExpired = expiresMs !== Infinity && expiresMs <= 0;
  const cooldownLeft = Math.max(0, RESEND_COOLDOWN_MS - (otpNow - lastSentAt.current));

  // ─── Real-time validation ─────────────────────────────────────────────────
  const passwordMismatch = !isLogin && !!confirmPassword && password !== confirmPassword;

  // ─── Switch between login / register ─────────────────────────────────────
  const switchMode = () => {
    setIsLogin(!isLogin);
    setErrorMsg('');
    setSuccessMsg('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  // ─── Main submit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (isLogin) {
      if (!email || !password) {
        setErrorMsg('Please fill in all fields');
        return;
      }
      setLoading(true);
      const result = await login(email, password);
      setLoading(false);

      if (result.success) {
        navigation.goBack();
        return;
      }
      if (result.twoFaChallenge) {
        setOtpChallenge({
          otpId: result.twoFaChallenge.otpId,
          phoneHint: result.twoFaChallenge.phoneHint,
          expiresAt: result.twoFaChallenge.expiresAt,
        });
        setOtpCode('');
        lastSentAt.current = Date.now();
        setOtpNow(Date.now());
        return;
      }
      setErrorMsg(result.error || 'Login failed');

    } else {
      if (!name || !email || !password || !confirmPassword) {
        setErrorMsg('Please fill in all fields');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters');
        return;
      }
      setLoading(true);
      const result = await register(name, email, password);
      setLoading(false);

      if (result.success) {
        // Match web: don't auto-login — switch to login form with success notice
        setSuccessMsg('Account created! Please log in.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        return;
      }
      setErrorMsg(result.error || 'Registration failed');
    }
  };

  // ─── OTP verify ───────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otpChallenge) return;
    setOtpError('');
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError('Kode harus 6 digit angka.');
      return;
    }
    setOtpLoading(true);
    const result = await verify2fa(otpChallenge.otpId, otpCode.trim());
    setOtpLoading(false);
    if (result.success) {
      setOtpChallenge(null);
      navigation.goBack();
    } else {
      setOtpError(result.error || 'Verifikasi gagal.');
    }
  };

  // ─── OTP resend ───────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (!otpChallenge || cooldownLeft > 0 || resending) return;
    setOtpError('');
    setResending(true);
    const result = await resend2fa(otpChallenge.otpId);
    setResending(false);
    if (result.success && result.otpId) {
      setOtpChallenge({
        ...otpChallenge,
        otpId: result.otpId,
        expiresAt: result.expiresAt ?? otpChallenge.expiresAt,
      });
      setOtpCode('');
      lastSentAt.current = Date.now();
      setOtpNow(Date.now());
    } else {
      setOtpError(result.error || 'Tidak dapat mengirim ulang kode.');
    }
  };

  // ─── Social login ─────────────────────────────────────────────────────────
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      setErrorMsg('');
      setSocialLoading(provider);
      const redirectUrl = Linking.createURL('auth/callback');
      const authUrl = `${API_BASE}/auth/${provider}?mobile_redirect=${encodeURIComponent(redirectUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type !== 'success') {
        setSocialLoading(null);
        return;
      }

      const url = new URL(result.url);
      const token = url.searchParams.get('token');
      const twoFaRequired = url.searchParams.get('twoFaRequired');
      const otpId = url.searchParams.get('otpId');
      const phoneHint = url.searchParams.get('phoneHint') ?? undefined;
      const expiresAt = url.searchParams.get('expiresAt') ?? undefined;

      if (twoFaRequired === '1' && otpId) {
        setOtpChallenge({ otpId, phoneHint, expiresAt });
        setOtpCode('');
        lastSentAt.current = Date.now();
        setOtpNow(Date.now());
        setSocialLoading(null);
        return;
      }

      if (!token) {
        setErrorMsg('Login gagal: token tidak diterima dari server.');
        setSocialLoading(null);
        return;
      }

      const r = await loginWithToken(token);
      setSocialLoading(null);
      if (r.success) {
        navigation.goBack();
      } else {
        setErrorMsg(r.error || 'Login gagal. Coba lagi.');
      }
    } catch (err: any) {
      setSocialLoading(null);
      setErrorMsg(err?.message || `Login dengan ${provider} gagal.`);
    }
  };

  // ─── OTP Screen ───────────────────────────────────────────────────────────
  if (otpChallenge) {
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
        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          <View style={styles.otpIcon}>
            <Text style={styles.otpIconText}>💬</Text>
          </View>
          <Text style={styles.title}>Verifikasi WhatsApp</Text>
          <Text style={styles.subtitle}>
            Masukkan kode 6-digit yang kami kirim ke{' '}
            <Text style={styles.phoneHint}>
              {otpChallenge.phoneHint || 'WhatsApp Anda'}
            </Text>
          </Text>

          {!!otpError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{otpError}</Text>
            </View>
          )}

          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="••••••"
            placeholderTextColor={colors.textSecondary}
            value={otpCode}
            onChangeText={(t) => setOtpCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoFocus
            maxLength={6}
          />

          <View style={styles.otpMeta}>
            <Text style={styles.otpMetaLeft}>
              {otpExpired ? (
                <Text style={styles.expiredText}>Kode kedaluwarsa</Text>
              ) : expiresMs !== Infinity ? (
                <>
                  <Text>Kedaluwarsa dalam </Text>
                  <Text style={styles.expiryTime}>{fmtTime(expiresMs)}</Text>
                </>
              ) : null}
            </Text>
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={cooldownLeft > 0 || resending}
            >
              <Text style={[styles.resendBtn, (cooldownLeft > 0 || resending) && styles.resendBtnDisabled]}>
                {cooldownLeft > 0
                  ? `Kirim ulang (${Math.ceil(cooldownLeft / 1000)}s)`
                  : resending
                    ? 'Mengirim…'
                    : 'Kirim ulang'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (otpLoading || otpExpired || otpCode.length !== 6) && styles.submitBtnDisabled,
            ]}
            onPress={handleVerifyOtp}
            disabled={otpLoading || otpExpired || otpCode.length !== 6}
          >
            {otpLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Verifikasi</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setOtpChallenge(null);
              setOtpCode('');
              setOtpError('');
            }}
          >
            <Text style={styles.cancelText}>Batal — kembali ke login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── Login / Register Screen ──────────────────────────────────────────────
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
      <View style={styles.sheet}>
        <View style={styles.handleBar} />

        <Text style={styles.title}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </Text>
        <Text style={styles.subtitle}>
          {isLogin
            ? 'Login to save your favorites'
            : 'Join CafeMatch to save your favorites'}
        </Text>

        {/* Inline error banner */}
        {!!errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        )}

        {/* Success banner (shown after register) */}
        {!!successMsg && (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{successMsg}</Text>
          </View>
        )}

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={(t) => { setName(t); setErrorMsg(''); }}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
          secureTextEntry
          autoComplete={isLogin ? 'current-password' : 'new-password'}
        />

        {!isLogin && (
          <>
            <TextInput
              style={[
                styles.input,
                passwordMismatch && styles.inputError,
              ]}
              placeholder="Confirm Password"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setErrorMsg(''); }}
              secureTextEntry
              autoComplete="new-password"
            />
            {passwordMismatch && (
              <Text style={styles.mismatchHint}>Passwords do not match</Text>
            )}
          </>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || socialLoading !== null}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>
              {isLogin ? 'Login' : 'Register'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Social login — only shown on login view (matches web pattern) */}
        {isLogin && (
          <>
            <View style={styles.socialDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>atau lanjutkan dengan</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.socialBtn, styles.googleBtn]}
              onPress={() => handleSocialLogin('google')}
              disabled={socialLoading !== null || loading}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <GoogleIcon />
                  <Text style={styles.googleText}>Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialBtn, styles.fbBtn]}
              onPress={() => handleSocialLogin('facebook')}
              disabled={socialLoading !== null || loading}
            >
              {socialLoading === 'facebook' ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <FacebookIcon />
                  <Text style={styles.fbText}>Facebook</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.switchBtn} onPress={switchMode}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Text style={styles.switchLink}>
              {isLogin ? 'Register' : 'Login'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <Text style={{ fontSize: 16, fontWeight: '900', color: '#4285F4' }}>G</Text>
  );
}

function FacebookIcon() {
  return (
    <Text
      style={{
        fontSize: 18,
        fontWeight: '900',
        color: colors.white,
        fontFamily: Platform.OS === 'ios' ? 'Helvetica' : undefined,
      }}
    >
      f
    </Text>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary + '40',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  // ─── Error / success banners ────────────────────────────────────────────
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#DC2626',
  },
  successBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  successBannerText: {
    fontSize: 13,
    color: '#16A34A',
  },

  // ─── Inputs ──────────────────────────────────────────────────────────────
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  inputError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  mismatchHint: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
    marginLeft: 2,
  },

  // ─── Submit ───────────────────────────────────────────────────────────────
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },

  // ─── Social ───────────────────────────────────────────────────────────────
  socialDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.surface },
  dividerText: { fontSize: 12, color: colors.textSecondary },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md - 2,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  googleBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  googleText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  fbBtn: { backgroundColor: '#1877F2' },
  fbText: { color: colors.white, fontSize: 15, fontWeight: '600' },

  // ─── Switch login/register ────────────────────────────────────────────────
  switchBtn: { alignItems: 'center', marginTop: spacing.md },
  switchText: { fontSize: 14, color: colors.textSecondary },
  switchLink: { color: colors.accent, fontWeight: '600' },

  // ─── OTP screen ──────────────────────────────────────────────────────────
  otpIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF1E0',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  otpIconText: { fontSize: 24 },
  phoneHint: {
    fontWeight: '700',
    color: colors.primary,
  },
  otpInput: {
    letterSpacing: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  otpMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  otpMetaLeft: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  expiredText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  expiryTime: {
    fontWeight: '600',
    color: colors.primary,
  },
  resendBtn: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  resendBtnDisabled: {
    opacity: 0.4,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  cancelText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
