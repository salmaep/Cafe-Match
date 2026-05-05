import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3084/api/v1';

WebBrowser.maybeCompleteAuthSession();

export default function AuthModal() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { login, register, loginWithToken } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!isLogin && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    let result: { success: boolean; error?: string };
    if (isLogin) {
      result = await login(email, password);
    } else {
      result = await register(name, email, password);
    }
    setLoading(false);

    if (result.success) {
      navigation.goBack();
    } else {
      Alert.alert('Error', result.error || 'Something went wrong');
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
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

      if (twoFaRequired === '1') {
        Alert.alert(
          '2FA belum didukung di mobile',
          'Akun Anda mengaktifkan 2FA. Silakan login lewat web dulu.',
        );
        setSocialLoading(null);
        return;
      }

      if (!token) {
        Alert.alert('Login gagal', 'Token tidak diterima dari server.');
        setSocialLoading(null);
        return;
      }

      const r = await loginWithToken(token);
      setSocialLoading(null);
      if (r.success) {
        navigation.goBack();
      } else {
        Alert.alert('Login gagal', r.error || 'Coba lagi.');
      }
    } catch (err: any) {
      setSocialLoading(null);
      Alert.alert('Error', err?.message || 'Login dengan ' + provider + ' gagal.');
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

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

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

        {/* Social login */}
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
              <Text style={styles.googleIcon}>G</Text>
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
              <Text style={styles.fbIcon}>f</Text>
              <Text style={styles.fbText}>Facebook</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Text style={styles.switchLink}>
              {isLogin ? 'Register' : 'Login'}
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

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
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },

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
  googleIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleText: { color: colors.primary, fontSize: 15, fontWeight: '600' },

  fbBtn: { backgroundColor: '#1877F2' },
  fbIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.white,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica' : undefined,
  },
  fbText: { color: colors.white, fontSize: 15, fontWeight: '600' },

  switchBtn: { alignItems: 'center', marginTop: spacing.md },
  switchText: { fontSize: 14, color: colors.textSecondary },
  switchLink: { color: colors.accent, fontWeight: '600' },
  closeBtn: { alignItems: 'center', marginTop: spacing.md },
  closeText: { fontSize: 14, color: colors.textSecondary },
});
