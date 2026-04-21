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
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../theme';
import api from '../../services/api';

export default function OwnerRegisterScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cafeName, setCafeName] = useState('');
  const [cafeAddress, setCafeAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !cafeName || !cafeAddress) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register/owner', {
        name,
        email,
        password,
        cafeName,
        cafeAddress,
        phone: phone || undefined,
      });
      Alert.alert(
        'Registration Successful!',
        'Your owner account has been created. Please login to access your dashboard.',
        [
          {
            text: 'Login Now',
            onPress: () => navigation.replace('OwnerLogin'),
          },
        ],
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>Owner Portal</Text>
        </View>
        <Text style={styles.title}>Register Cafe</Text>
        <Text style={styles.subtitle}>Create your owner account to start managing your cafe</Text>

        {/* Owner Info */}
        <Text style={styles.groupLabel}>Your Information</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="owner@mycafe.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Password *</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cafe Info */}
        <Text style={[styles.groupLabel, { marginTop: spacing.lg }]}>Cafe Information</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Cafe Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Kopi Kenangan Sudirman"
            placeholderTextColor={colors.textSecondary}
            value={cafeName}
            onChangeText={setCafeName}
            autoCapitalize="words"
          />
          <Text style={styles.label}>Cafe Address *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Full address of your cafe"
            placeholderTextColor={colors.textSecondary}
            value={cafeAddress}
            onChangeText={setCafeAddress}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+62 812 3456 7890"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.registerBtn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.registerBtnText}>Create Owner Account</Text>
          )}
        </TouchableOpacity>

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an owner account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('OwnerLogin')}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backArrow: { fontSize: 20, color: colors.primary, marginRight: spacing.xs },
  backLabel: { fontSize: 15, color: colors.primary, fontWeight: '500' },
  badge: {
    backgroundColor: colors.accent + '20',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.accent, letterSpacing: 0.5 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  form: { gap: spacing.xs },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.primary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  passwordInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: 15,
    color: colors.primary,
  },
  eyeBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  eyeIcon: { fontSize: 18 },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  registerBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  btnDisabled: { opacity: 0.6 },
  registerBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginText: { fontSize: 14, color: colors.textSecondary },
  loginLink: { fontSize: 14, color: colors.accent, fontWeight: '600' },
});
