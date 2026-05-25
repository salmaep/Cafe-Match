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
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { authText } from '@shared/i18n/keys';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';
import {
  socialEnrollPhoneApi,
  socialVerifyPhoneApi,
  googleIdTokenLoginApi,
  facebookTokenLoginApi,
  isTwoFaChallenge,
  isPhoneEnrollChallenge,
} from '../services/api';


interface OtpChallenge {
  otpId: string;
  phoneHint?: string;
  expiresAt?: string;
  mode?: 'login' | 'social-enroll';
  enrollmentId?: string;
  phone?: string;
}

interface EnrollChallenge {
  enrollmentId: string;
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
  const { t } = useTranslation();
  const { login, register, loginWithToken, verify2fa, resend2fa } = useAuth();

  // ─── Form state ──────────────────────────────────────────────────────────
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  // ─── Social phone enrollment (OAuth users without phone) ────────────────
  const [enrollChallenge, setEnrollChallenge] = useState<EnrollChallenge | null>(null);
  const [enrollPhone, setEnrollPhone] = useState('');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState('');

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
        setErrorMsg(t(authText.fillAllFields));
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
      setErrorMsg(result.error || 'Login gagal');

    } else {
      if (!name || !email || !password || !confirmPassword) {
        setErrorMsg(t(authText.fillAllFields));
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(t(authText.passwordMismatch));
        return;
      }
      if (password.length < 6) {
        setErrorMsg(t(authText.passwordMin6));
        return;
      }
      setLoading(true);
      const result = await register(name, email, password);
      setLoading(false);

      if (result.success) {
        // Match web: don't auto-login — switch to login form with success notice
        setSuccessMsg(t(authText.accountCreated));
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        return;
      }
      setErrorMsg(result.error || 'Daftar gagal');
    }
  };

  // ─── OTP verify ───────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otpChallenge) return;
    setOtpError('');
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError('Kode harus 6 digit angka ya.');
      return;
    }
    setOtpLoading(true);
    try {
      if (otpChallenge.mode === 'social-enroll' && otpChallenge.enrollmentId && otpChallenge.phone) {
        const auth = await socialVerifyPhoneApi(
          otpChallenge.enrollmentId,
          otpChallenge.otpId,
          otpCode.trim(),
          otpChallenge.phone,
        );
        const r = await loginWithToken(auth.accessToken);
        if (r.success) {
          setOtpChallenge(null);
          setEnrollChallenge(null);
          navigation.goBack();
        } else {
          setOtpError(r.error || 'Verifikasi gagal');
        }
      } else {
        const result = await verify2fa(otpChallenge.otpId, otpCode.trim());
        if (result.success) {
          setOtpChallenge(null);
          navigation.goBack();
        } else {
          setOtpError(result.error || 'Verifikasi gagal');
        }
      }
    } catch (err: any) {
      setOtpError(err?.response?.data?.message || err?.message || 'Verifikasi gagal');
    } finally {
      setOtpLoading(false);
    }
  };

  // ─── Submit phone for social enrollment → request OTP ───────────────────
  const handleSubmitEnrollPhone = async () => {
    if (!enrollChallenge) return;
    setEnrollError('');
    const phone = enrollPhone.trim();
    if (!/^[0-9+\-\s]{8,20}$/.test(phone)) {
      setEnrollError('Nomor telepon gak valid.');
      return;
    }
    setEnrollLoading(true);
    try {
      const { otpId, expiresAt } = await socialEnrollPhoneApi(enrollChallenge.enrollmentId, phone);
      setOtpChallenge({
        otpId,
        expiresAt,
        phoneHint: phone,
        mode: 'social-enroll',
        enrollmentId: enrollChallenge.enrollmentId,
        phone,
      });
      setOtpCode('');
      lastSentAt.current = Date.now();
      setOtpNow(Date.now());
    } catch (err: any) {
      setEnrollError(err?.response?.data?.message || err?.message || 'Gagal kirim OTP.');
    } finally {
      setEnrollLoading(false);
    }
  };

  // ─── OTP resend ───────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (!otpChallenge || cooldownLeft > 0 || resending) return;
    setOtpError('');
    setResending(true);
    try {
      if (otpChallenge.mode === 'social-enroll' && otpChallenge.enrollmentId && otpChallenge.phone) {
        const { otpId, expiresAt } = await socialEnrollPhoneApi(
          otpChallenge.enrollmentId,
          otpChallenge.phone,
        );
        setOtpChallenge({ ...otpChallenge, otpId, expiresAt });
        setOtpCode('');
        lastSentAt.current = Date.now();
        setOtpNow(Date.now());
      } else {
        const result = await resend2fa(otpChallenge.otpId);
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
          setOtpError(result.error || 'Gagal kirim ulang kode.');
        }
      }
    } catch (err: any) {
      setOtpError(err?.response?.data?.message || err?.message || 'Gagal kirim ulang kode.');
    } finally {
      setResending(false);
    }
  };

  // ─── Google Sign-In (native SDK) ──────────────────────────────────────
  // We use the native Google Sign-In SDK directly (same one Kotlin Firebase
  // Auth wraps) rather than expo-auth-session's web-flow, because:
  //   1) The audience claim is always the Web client ID — server only needs
  //      to know one audience to verify, regardless of platform.
  //   2) No "redirect URI mismatch" errors — the SDK handshakes directly with
  //      Google using the package + SHA-1 registered against the Android
  //      OAuth client.
  // Configure once when the modal mounts.
  useEffect(() => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(
        '[Google] webClientId =',
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '(MISSING — restart Metro with -c)',
      );
    }
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      offlineAccess: false,
      scopes: ['openid', 'profile', 'email'],
    });
  }, []);


  // Common server-response handler — same shapes (twoFa / phoneEnroll /
  // success) the legacy redirect flow returned, just received via JSON now.
  const consumeSocialResult = async (
    result: Awaited<ReturnType<typeof googleIdTokenLoginApi>>,
  ) => {
    if (isPhoneEnrollChallenge(result)) {
      setEnrollChallenge({
        enrollmentId: result.enrollmentId,
        expiresAt: result.expiresAt,
      });
      setEnrollPhone('');
      setEnrollError('');
      return;
    }
    if (isTwoFaChallenge(result)) {
      setOtpChallenge({
        otpId: result.otpId,
        phoneHint: result.phoneHint,
        expiresAt: result.expiresAt,
        mode: 'login',
      });
      setOtpCode('');
      lastSentAt.current = Date.now();
      setOtpNow(Date.now());
      return;
    }
    const r = await loginWithToken(result.accessToken);
    if (r.success) navigation.goBack();
    else setErrorMsg(r.error || 'Login gagal, coba lagi yuk.');
  };

  // Google sign-in via native SDK — kicked off from handleSocialLogin below.

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setSocialLoading('google');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // signOut first so the account picker always shows — without this, a
      // previous session is reused silently and users can't switch accounts.
      try {
        await GoogleSignin.signOut();
      } catch {
        // first-run / nothing to sign out — ignore
      }
      const userInfo = await GoogleSignin.signIn();
      // The SDK shape changed in v13: idToken now lives under .data.idToken.
      const idToken =
        (userInfo as any)?.data?.idToken ?? (userInfo as any)?.idToken ?? null;
      if (!idToken) {
        throw new Error('id_token tidak diterima dari Google.');
      }
      const r = await googleIdTokenLoginApi(idToken);
      await consumeSocialResult(r);
    } catch (err: any) {
      const code = err?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        // User backed out — silent, no error banner
      } else if (code === statusCodes.IN_PROGRESS) {
        setErrorMsg(t(authText.googleAlreadyRunning));
      } else if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMsg(t(authText.googlePlayUnavailable));
      } else {
        setErrorMsg(
          err?.response?.data?.message || err?.message || 'Login Google gagal.',
        );
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    if (provider === 'google') {
      await handleGoogleLogin();
      return;
    }
    setErrorMsg('');
    setSocialLoading('facebook');
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) {
        setSocialLoading(null);
        return;
      }
      const data = await AccessToken.getCurrentAccessToken();
      if (!data?.accessToken) {
        setErrorMsg(t(authText.facebookTokenFailed));
        setSocialLoading(null);
        return;
      }
      const r = await facebookTokenLoginApi(data.accessToken);
      await consumeSocialResult(r);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Login Facebook gagal.');
    } finally {
      setSocialLoading(null);
    }
  };

  // ─── Phone Enrollment Screen (social users without phone) ────────────────
  // Rendered as a full-page screen (not bottom-sheet) — feels more substantial
  // for what is effectively account-setup, and gives the keyboard more room.
  if (enrollChallenge && !otpChallenge) {
    return (
      <KeyboardAvoidingView
        style={styles.fullPage}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.fullPageHeader}>
          <TouchableOpacity
            style={styles.fullPageBackBtn}
            onPress={() => {
              setEnrollChallenge(null);
              setEnrollPhone('');
              setEnrollError('');
            }}
          >
            <Text style={styles.fullPageBackIcon}>‹</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fullPageBody}>
          <View style={styles.otpIcon}>
            <Text style={styles.otpIconText}>📱</Text>
          </View>
          <Text style={styles.title}>{t(authText.phoneEnrollTitle)}</Text>
          <Text style={styles.subtitle}>
            {t(authText.phoneEnrollSubtitle)}
          </Text>

          {!!enrollError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{enrollError}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder={t(authText.phonePlaceholder)}
            placeholderTextColor={colors.textSecondary}
            value={enrollPhone}
            onChangeText={(t) => { setEnrollPhone(t); setEnrollError(''); }}
            keyboardType="phone-pad"
            autoFocus
            maxLength={20}
          />

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (enrollLoading || enrollPhone.trim().length < 8) && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmitEnrollPhone}
            disabled={enrollLoading || enrollPhone.trim().length < 8}
          >
            {enrollLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>{t(authText.sendWhatsAppCode)}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── OTP Screen ───────────────────────────────────────────────────────────
  // Full-page (not bottom-sheet) so the 6-digit input + countdown have space
  // and keyboard doesn't crowd the layout.
  if (otpChallenge) {
    return (
      <KeyboardAvoidingView
        style={styles.fullPage}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.fullPageHeader}>
          <TouchableOpacity
            style={styles.fullPageBackBtn}
            onPress={() => {
              setOtpChallenge(null);
              setOtpCode('');
              setOtpError('');
            }}
          >
            <Text style={styles.fullPageBackIcon}>‹</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fullPageBody}>
          <View style={styles.otpIcon}>
            <Text style={styles.otpIconText}>💬</Text>
          </View>
          <Text style={styles.title}>{t(authText.otpTitle)}</Text>
          <Text style={styles.subtitle}>
            {t(authText.otpSubtitleBefore)}
            <Text style={styles.phoneHint}>
              {otpChallenge.phoneHint || t(authText.yourWhatsApp)}
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
                <Text style={styles.expiredText}>{t(authText.codeExpired)}</Text>
              ) : expiresMs !== Infinity ? (
                <>
                  <Text>{t(authText.expiresIn)}</Text>
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
                  ? t(authText.resendCooldown, { sec: Math.ceil(cooldownLeft / 1000) })
                  : resending
                    ? t(authText.resending)
                    : t(authText.resend)}
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
              <Text style={styles.submitText}>{t(authText.verify)}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── Login / Register Screen ──────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.sheetScroll}
        contentContainerStyle={styles.sheet}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handleBar} />

        <Text style={styles.title}>
          {isLogin ? t(authText.welcomeBack) : t(authText.createAccount)}
        </Text>
        <Text style={styles.subtitle}>
          {isLogin ? t(authText.loginSubtitle) : t(authText.registerSubtitle)}
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
            placeholder={t(authText.namePlaceholder)}
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={(t) => { setName(t); setErrorMsg(''); }}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder={t(authText.emailPlaceholder)}
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, styles.inputWithEye]}
            placeholder={t(authText.passwordPlaceholder)}
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
            secureTextEntry={!showPassword}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        {!isLogin && (
          <>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputWithEye,
                  passwordMismatch && styles.inputError,
                ]}
                placeholder={t(authText.confirmPasswordPlaceholder)}
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setErrorMsg(''); }}
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirmPassword((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.eyeIcon}>
                  {showConfirmPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
            {passwordMismatch && (
              <Text style={styles.mismatchHint}>{t(authText.passwordMismatch)}</Text>
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
              {isLogin ? t(authText.loginBtn) : t(authText.registerBtn)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Social login — only shown on login view (matches web pattern) */}
        {isLogin && (
          <>
            <View style={styles.socialDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t(authText.orContinueWith)}</Text>
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
                  <Text style={styles.googleText}>{t(authText.google)}</Text>
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
                  <Text style={styles.fbText}>{t(authText.facebook)}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.switchBtn} onPress={switchMode}>
          <Text style={styles.switchText}>
            {isLogin ? t(authText.noAccount) : t(authText.hasAccount)}
            <Text style={styles.switchLink}>
              {isLogin ? t(authText.switchToRegister) : t(authText.switchToLogin)}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

// Real Google + Facebook brand SVGs — match the web LoginForm exactly so the
// two surfaces feel like the same product.
function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.35-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.67-2.83z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.67 2.83C6.72 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function FacebookIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85V15.47H7.08V12h3.05V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.69.23 2.69.23v2.96h-1.51c-1.49 0-1.96.93-1.96 1.87V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // ─── Full-page (OTP + phone enrollment) ─────────────────────────────────
  // Used instead of the bottom-sheet for screens where we want more vertical
  // space (keyboard input, countdown timer, etc.). No backdrop, no handle bar.
  fullPage: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullPageHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  fullPageBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPageBackIcon: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '600',
    marginTop: -4,
  },
  fullPageBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  // ScrollView wrapper — `flexGrow: 0` keeps the sheet hugging the bottom
  // (like the old fixed `<View>`); when the keyboard pushes content up the
  // scrollable area lets the user reach the password / submit row.
  sheetScroll: {
    flexGrow: 0,
    maxHeight: '92%',
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
  // Password field wrapper — relative positioning lets the eye toggle overlay
  // the right edge of the input without affecting input metrics.
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithEye: {
    paddingRight: spacing.md + 28,
  },
  eyeBtn: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  eyeIcon: { fontSize: 18 },
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
  // Mirrors web LoginForm: divider with "atau lanjutkan dengan", then a white
  // Google button with border + a #1877F2 Facebook button. Font weight 600,
  // py-3 (12px), gap 8px between icon and label, rounded-xl (12px).
  socialDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#F0EDE8' },
  dividerText: { fontSize: 12, color: '#8A8880' },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: spacing.xs + 2,
    gap: 8,
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E4DD',
  },
  googleText: {
    color: '#1C1C1A',
    fontSize: 14,
    fontWeight: '600',
  },
  fbBtn: { backgroundColor: '#1877F2' },
  fbText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

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
