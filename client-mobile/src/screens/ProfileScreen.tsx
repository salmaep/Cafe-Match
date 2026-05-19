import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Share,
  Linking,
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useShortlist } from '../context/ShortlistContext';
import { usePreferences } from '../context/PreferencesContext';
import CafeMatchLogo from '../components/CafeMatchLogo';
import { fetchUnreadCount } from '../services/api';
import { colors, spacing, radius } from '../theme';
import { APP_VERSION } from '../constant/version';

export default function ProfileScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { clearShortlist } = useShortlist();
  const { setPreferences, setWizardCompleted } = usePreferences();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount()
      .then((c) => setUnread(c))
      .catch(() => setUnread(0));
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Yakin mau logout? Semua data lokal bakal kehapus.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            await clearShortlist();
            setPreferences(null);
            setWizardCompleted(false);
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Splash' }],
              }),
            );
          },
        },
      ],
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <CafeMatchLogo size={40} />
          <Text style={styles.guestTitle}>Selamat datang di CafeMatch</Text>
          <Text style={styles.guestSubtitle}>
            Login dulu buat akses profil sama cafe yang udah kamu simpen
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('AuthModal')}
          >
            <Text style={styles.loginBtnText}>Masuk / Daftar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const initials = (user.name || user.email || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const friendCode = user.friendCode;

  const shareNative = async () => {
    if (!friendCode) return;
    try {
      await Share.share({
        message: `Yuk gabung CafeMatch! Pakai friend code ku: ${friendCode}\n\nDownload di salma.imola.ai`,
      });
    } catch {}
  };

  const shareWhatsApp = async () => {
    if (!friendCode) return;
    const text = `Yuk gabung CafeMatch! Pakai friend code ku: ${friendCode}\n\nDownload di salma.imola.ai`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Share.share({ message: text });
      }
    } catch {
      await Share.share({ message: text });
    }
  };

  const copyCode = async () => {
    if (!friendCode) return;
    // Fallback to share sheet — clipboard would need expo-clipboard dep
    await Share.share({ message: friendCode });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: spacing.md,
        gap: spacing.md,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => navigation.navigate('EditProfileModal')}
        >
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>📷</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <View style={styles.profileNameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {user.name}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditProfileModal')}
            >
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
          {!!friendCode && (
            <View style={styles.friendCodeBadge}>
              <Text style={styles.friendCodeText}>🎫 {friendCode}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Invite card */}
      {!!friendCode && (
        <View style={styles.inviteCard}>
          <View>
            <Text style={styles.cardTitle}>Ajak teman ke CafeMatch</Text>
            <Text style={styles.cardSubtitle}>
              Share friend code biar bisa saling check-in
            </Text>
          </View>

          <View style={styles.codeRow}>
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>FRIEND CODE</Text>
              <Text
                style={styles.codeValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {friendCode}
              </Text>
            </View>
            <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
              <Text style={styles.copyBtnText}>📋 Salin</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.shareRow}>
            <TouchableOpacity
              style={[styles.shareBtn, styles.waBtn]}
              onPress={shareWhatsApp}
            >
              <Text style={styles.shareBtnTextWhite} numberOfLines={1}>
                💬 WhatsApp
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, styles.nativeBtn]}
              onPress={shareNative}
            >
              <Text style={styles.shareBtnTextWhite} numberOfLines={1}>
                📤 Bagikan
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.quickGrid}>
        <QuickAction
          icon="👥"
          label="Teman"
          onPress={() => navigation.navigate('Friends')}
        />
        <QuickAction
          icon="🏆"
          label="Leaderboard"
          onPress={() => navigation.navigate('GlobalLeaderboard')}
        />
        <QuickAction
          icon="🎖️"
          label="Achievement"
          onPress={() => navigation.navigate('Achievements')}
        />
        <QuickAction
          icon="🔔"
          label="Notifikasi"
          badge={unread > 0 ? unread : undefined}
          onPress={() => navigation.navigate('Notifications')}
        />
        <QuickAction
          icon="📊"
          label="Recap"
          onPress={() =>
            navigation.navigate('Recap', { year: new Date().getFullYear() })
          }
        />
      </View>

      {/* Cafe Saya */}
      <Section title="CAFE KAMU">
        <MenuItem
          icon="❤️"
          label="Favorit Kamu"
          subtitle="Cafe yang kamu suka"
          onPress={() => navigation.navigate('Favorites')}
        />
        <MenuItem
          icon="🔖"
          label="Bookmark Kamu"
          subtitle="Buat dikunjungi nanti"
          onPress={() => navigation.navigate('Bookmarks')}
        />
        <MenuItem
          icon="⭐"
          label="Shortlist"
          subtitle="Hasil swipe Discover"
          onPress={() => navigation.navigate('ShortlistModal')}
          isLast
        />
      </Section>

      {/* Akun */}
      <Section title="AKUN">
        <MenuItem
          icon="⚙️"
          label="Edit Profil"
          subtitle="Nama, foto, password"
          onPress={() => navigation.navigate('EditProfileModal')}
        />
        <MenuItem
          icon="🚪"
          label="Logout"
          subtitle="Keluar dari akun"
          onPress={handleLogout}
          danger
          isLast
        />
      </Section>

      <Text style={styles.versionText}>CafeMatch v{APP_VERSION}</Text>
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: string;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickItem} onPress={onPress}>
      <Text style={styles.quickIcon}>{icon}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
      {badge != null && (
        <View style={styles.quickBadge}>
          <Text style={styles.quickBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  isLast,
  danger,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, !isLast && styles.menuRowDivider]}
      onPress={onPress}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <View style={styles.menuTexts}>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
          {label}
        </Text>
        {!!subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

const CARD_BORDER = '#F0EDE8';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  guestTitle: {
    fontSize: 22, fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.lg,
  },
  guestSubtitle: {
    fontSize: 15, color: colors.textSecondary,
    textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  loginBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: CARD_BORDER,
    padding: spacing.md,
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  cardSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  avatarBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 22, fontWeight: '800', color: colors.white },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.white,
  },
  avatarBadgeText: { fontSize: 9 },
  profileInfo: { flex: 1, minWidth: 0 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 18, fontWeight: '700', color: colors.primary, flexShrink: 1 },
  editIcon: { fontSize: 14 },
  userEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  friendCodeBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: '#F0EDE8',
    borderRadius: 6,
  },
  friendCodeText: {
    fontSize: 11, fontWeight: '700',
    color: '#5C5A52',
    letterSpacing: 1.5,
  },

  // Invite card — vertical stack (separate from the row-flex profile .card)
  inviteCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: CARD_BORDER,
    padding: spacing.md,
    gap: spacing.sm,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  codeBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: CARD_BORDER,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  codeLabel: {
    fontSize: 9, fontWeight: '700',
    color: colors.textSecondary, letterSpacing: 1.5,
  },
  codeValue: {
    fontSize: 16, fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.5, marginTop: 2,
  },
  copyBtn: {
    paddingHorizontal: spacing.sm + 4,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: CARD_BORDER,
    minWidth: 80,
  },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  shareRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  shareBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  waBtn: { backgroundColor: '#25D366' },
  nativeBtn: { backgroundColor: colors.primary },
  shareBtnTextWhite: { color: colors.white, fontWeight: '700', fontSize: 13 },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickItem: {
    flexBasis: '30.5%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: CARD_BORDER,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center', justifyContent: 'center',
    gap: 4,
    position: 'relative',
  },
  quickIcon: { fontSize: 20 },
  quickLabel: {
    fontSize: 11, fontWeight: '700',
    color: '#5C5A52', textAlign: 'center',
  },
  quickBadge: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  quickBadgeText: { color: colors.white, fontSize: 9, fontWeight: '800' },

  sectionTitle: {
    fontSize: 11, fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 6, marginLeft: 4,
  },
  sectionBody: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: CARD_BORDER,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    gap: spacing.sm,
  },
  menuRowDivider: { borderBottomWidth: 1, borderBottomColor: CARD_BORDER },
  menuIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  menuTexts: { flex: 1, minWidth: 0 },
  menuLabel: { fontSize: 14, fontWeight: '700', color: colors.primary },
  menuLabelDanger: { color: colors.error },
  menuSubtitle: { fontSize: 11, color: '#A8A59C', marginTop: 1 },
  menuArrow: { fontSize: 18, color: colors.textSecondary },

  versionText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 11, fontWeight: '600',
    marginTop: spacing.md,
  },
});
