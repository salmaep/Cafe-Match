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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { updateProfileApi, changePasswordApi } from '../services/api';
import { colors, spacing, radius } from '../theme';

type Tab = 'profile' | 'password';

export default function EditProfileModal() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [tab, setTab] = useState<Tab>('profile');

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

        <View style={styles.header}>
          <Text style={styles.title}>Edit Profil</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsRow}>
          <TabBtn active={tab === 'profile'} onPress={() => setTab('profile')}>
            👤 Profil
          </TabBtn>
          <TabBtn active={tab === 'password'} onPress={() => setTab('password')}>
            🔒 Password
          </TabBtn>
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
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.tabBtn}>
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
        {children}
      </Text>
      {active && <View style={styles.tabBtnUnderline} />}
    </TouchableOpacity>
  );
}

function ProfileTab() {
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
        setError('Izin akses galeri ditolak nih.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.55,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.base64) {
        setError('Gagal muat gambar.');
        return;
      }
      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
      // Rough byte estimate: base64 string length * 3/4
      if (asset.base64.length * 0.75 > 65_000) {
        setError('Gambarnya kegedean. Pilih yang lain ya.');
        return;
      }
      setAvatarUrl(dataUrl);
    } catch (err: any) {
      setError(err?.message || 'Gagal pilih gambar.');
    } finally {
      setPicking(false);
    }
  };

  const submit = async () => {
    setError('');
    if (!name.trim()) {
      setError('Nama gak boleh kosong.');
      return;
    }
    setSubmitting(true);
    try {
      await updateProfileApi({ name: name.trim(), avatarUrl });
      await refresh();
      navigation.goBack();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal nyimpen profil.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.avatarBlock}>
        <View style={styles.avatarLarge}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarLargeText}>{initials}</Text>
          )}
        </View>
        <View style={styles.avatarActions}>
          <TouchableOpacity
            onPress={pickImage}
            disabled={picking}
            style={styles.avatarActionBtn}
          >
            {picking ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Text style={styles.avatarActionText}>📷 Upload foto</Text>
            )}
          </TouchableOpacity>
          {!!avatarUrl && (
            <>
              <Text style={styles.avatarActionDivider}>·</Text>
              <TouchableOpacity onPress={() => setAvatarUrl('')}>
                <Text style={styles.avatarActionRemove}>Hapus</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <View>
        <Text style={styles.fieldLabel}>NAMA</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(t) => { setName(t); setError(''); }}
          maxLength={100}
          placeholder="Nama lengkap"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View>
        <Text style={styles.fieldLabel}>EMAIL</Text>
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
          <Text style={styles.submitText}>Simpan Perubahan</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function PasswordTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password gak cocok.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }
    setSubmitting(true);
    try {
      await changePasswordApi({ currentPassword, newPassword });
      Alert.alert('Berhasil', 'Password berhasil diubah!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal ganti password.');
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
        <Text style={styles.fieldLabel}>PASSWORD LAMA</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={(t) => { setCurrentPassword(t); setError(''); }}
          secureTextEntry
          autoComplete="current-password"
        />
      </View>
      <View>
        <Text style={styles.fieldLabel}>PASSWORD BARU</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={(t) => { setNewPassword(t); setError(''); }}
          secureTextEntry
          autoComplete="new-password"
        />
      </View>
      <View>
        <Text style={styles.fieldLabel}>KONFIRMASI PASSWORD</Text>
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
          <Text style={styles.submitText}>Ubah Password</Text>
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
  closeText: { fontSize: 18, color: colors.textSecondary },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    gap: spacing.xs,
  },
  tabBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, position: 'relative' },
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

  avatarBlock: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatarLarge: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLargeText: { fontSize: 32, fontWeight: '800', color: colors.white },
  avatarImg: { width: '100%', height: '100%' },
  avatarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  avatarActionBtn: { paddingVertical: 4 },
  avatarActionText: { fontSize: 13, fontWeight: '700', color: colors.accent },
  avatarActionDivider: { color: colors.textSecondary, marginHorizontal: 4 },
  avatarActionRemove: { fontSize: 13, fontWeight: '700', color: colors.error },

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
