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
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { profileText } from '@shared/i18n/keys';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, X, User as UserIcon, Lock } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { updateProfileApi, changePasswordApi, uploadAvatar } from '../services/api';
import { colors, spacing, radius } from '../theme';

type Tab = 'profile' | 'password';

export default function EditProfileModal() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('profile');
  const insets = useSafeAreaInsets();

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
      <View style={[styles.sheet, { paddingBottom: 40 + insets.bottom }]}>
        <View style={styles.handleBar} />

        <View style={styles.header}>
          <Text style={styles.title}>{t(profileText.editProfile)}</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
          >
            <X size={18} color={colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsRow}>
          <TabBtn
            active={tab === 'profile'}
            onPress={() => setTab('profile')}
            icon={
              <UserIcon
                size={14}
                color={tab === 'profile' ? colors.primary : colors.textSecondary}
                strokeWidth={2.2}
              />
            }
            label="Profil"
          />
          <TabBtn
            active={tab === 'password'}
            onPress={() => setTab('password')}
            icon={
              <Lock
                size={14}
                color={tab === 'password' ? colors.primary : colors.textSecondary}
                strokeWidth={2.2}
              />
            }
            label="Password"
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.tabBody}
          keyboardShouldPersistTaps="handled"
        >
          {tab === 'profile' ? <ProfileTab /> : <PasswordTab />}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function TabBtn({
  active,
  onPress,
  icon,
  label,
}: {
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tabBtn}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {icon}
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
        {label}
      </Text>
      {active && <View style={styles.tabBtnUnderline} />}
    </TouchableOpacity>
  );
}

function ProfileTab() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl || '');
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');

  const initials = (user?.name || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const pickImage = async () => {
    setError('');
    setPicking(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError(t(profileText.galleryPermissionDenied));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setError(t(profileText.imageLoadFailed));
        return;
      }

      const resized = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 512 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      const uploaded = await uploadAvatar(resized.uri);
      setAvatarUrl(uploaded.url);
    } catch (err: any) {
      setError(err?.message || t(profileText.imagePickFailed));
    } finally {
      setPicking(false);
    }
  };

  const submit = async () => {
    setError('');
    if (!name.trim()) {
      setError(t(profileText.nameRequired));
      return;
    }
    setSubmitting(true);
    try {
      await updateProfileApi({ name: name.trim(), avatarUrl });
      await refresh();
      navigation.goBack();
    } catch (err: any) {
      setError(err?.response?.data?.message || t(profileText.profileSaveFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.avatarBlock}>
        <TouchableOpacity
          onPress={pickImage}
          disabled={picking}
          activeOpacity={0.85}
          style={styles.avatarLargeWrap}
        >
          <View style={styles.avatarLarge}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarLargeText}>{initials}</Text>
            )}
          </View>
          <View style={styles.avatarBadge}>
            {picking ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Camera size={16} color={colors.white} strokeWidth={2.4} />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Ketuk foto untuk ganti</Text>
        {!!avatarUrl && (
          <TouchableOpacity
            onPress={() => setAvatarUrl('')}
            disabled={picking}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.avatarActionRemove}>{t(profileText.removeAvatar)}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <View>
        <Text style={styles.fieldLabel}>{t(profileText.fieldName)}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(t) => { setName(t); setError(''); }}
          maxLength={100}
          placeholder={t(profileText.namePlaceholder)}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View>
        <Text style={styles.fieldLabel}>{t(profileText.fieldEmail)}</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={user?.email || ''}
          editable={false}
        />
        <Text style={styles.helpText}>
          Email gak bisa diubah. Hubungi support kalo perlu ganti.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={submit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.submitText}>{t(profileText.saveChanges)}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function PasswordTab() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (newPassword !== confirmPassword) {
      setError(t(profileText.confirmPasswordMismatch));
      return;
    }
    if (newPassword.length < 8) {
      setError(t(profileText.newPasswordMin8));
      return;
    }
    setSubmitting(true);
    try {
      await changePasswordApi({ currentPassword, newPassword });
      Alert.alert(t(profileText.successTitle), t(profileText.passwordChanged));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.response?.data?.message || t(profileText.changePasswordFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <View>
        <Text style={styles.fieldLabel}>{t(profileText.fieldOldPassword)}</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={(t) => { setCurrentPassword(t); setError(''); }}
          secureTextEntry
          autoComplete="current-password"
        />
      </View>
      <View>
        <Text style={styles.fieldLabel}>{t(profileText.fieldNewPassword)}</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={(t) => { setNewPassword(t); setError(''); }}
          secureTextEntry
          autoComplete="new-password"
        />
      </View>
      <View>
        <Text style={styles.fieldLabel}>{t(profileText.fieldConfirmPassword)}</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
          secureTextEntry
          autoComplete="new-password"
        />
      </View>

      <Text style={styles.helpText}>
        Min. 8 karakter, harus ada huruf besar, huruf kecil, sama angka.
      </Text>

      <TouchableOpacity
        style={[
          styles.submitBtn,
          (submitting || !currentPassword || !newPassword || !confirmPassword) &&
            styles.submitBtnDisabled,
        ]}
        onPress={submit}
        disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.submitText}>{t(profileText.changePassword)}</Text>
        )}
      </TouchableOpacity>
    </View>
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
  title: { fontSize: 17, fontWeight: '700', color: colors.primary },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    gap: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
    position: 'relative',
  },
  tabBtnText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  tabBtnTextActive: { color: colors.accent },
  tabBtnUnderline: {
    position: 'absolute',
    bottom: -1, left: 8, right: 8,
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },

  tabBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  avatarBlock: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  avatarLargeWrap: {
    position: 'relative',
    width: 104,
    height: 104,
    marginBottom: 4,
  },
  avatarLarge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLargeText: { fontSize: 36, fontWeight: '800', color: colors.white },
  avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarHint: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  avatarActionRemove: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
    marginTop: 2,
  },

  fieldLabel: {
    fontSize: 11, fontWeight: '700',
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
  inputDisabled: { color: colors.textSecondary, opacity: 0.7 },
  helpText: {
    fontSize: 11, color: colors.textSecondary,
    marginTop: 4,
  },

  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  errorBannerText: { fontSize: 13, color: '#DC2626' },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
