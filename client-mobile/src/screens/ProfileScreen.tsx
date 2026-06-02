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
import { useTranslation } from 'react-i18next';
import { commonText, profileText } from '@shared/i18n/keys';
import { useAuth } from '../context/AuthContext';
import { useShortlist } from '../context/ShortlistContext';
import { usePreferences } from '../context/PreferencesContext';
import CafeMatchLogo from '../components/CafeMatchLogo';
import DeleteAccountModal from '../components/DeleteAccountModal';
import StatusBarScrim from '../components/StatusBarScrim';
import { fetchUnreadCount } from '../services/api';
import { colors, spacing, radius } from '../theme';
import { APP_VERSION } from '../constant/version';
import {
  Heart,
  Bookmark,
  Star,
  Settings,
  LogOut,
  Trash2,
  Users,
  Trophy,
  Award,
  Bell,
  BarChart3,
  Camera,
  Pencil,
  Ticket,
  ChevronRight,
  RotateCcw,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

export default function ProfileScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { clearShortlist } = useShortlist();
  const { setPreferences, setWizardCompleted, clearPreferences, wizardCompleted, preferences } =
    usePreferences();
  const [unread, setUnread] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount()
      .then((c) => setUnread(c))
      .catch(() => setUnread(0));
  }, [user]);

  const handleAccountDeleted = async () => {
    setDeleteOpen(false);
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
  };

  const handleClearPreferences = () => {
    clearPreferences();
    // Re-onboard from the wizard (mirrors web navigating to /discover, which
    // reshows the wizard once preferences are cleared).
    navigation.navigate('Wizard');
  };

  const handleLogout = () => {
    Alert.alert(
      t(profileText.logoutTitle),
      t(profileText.logoutBody),
      [
        { text: t(commonText.cancel), style: 'cancel' },
        {
          text: t(profileText.logoutAction),
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
          <Text style={styles.guestTitle}>{t(profileText.guestWelcome)}</Text>
          <Text style={styles.guestSubtitle}>
            {t(profileText.guestSubtitle)}
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('AuthModal')}
          >
            <Text style={styles.loginBtnText}>{t(profileText.guestLoginBtn)}</Text>
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
        message: t(profileText.shareMessage, { code: friendCode }),
      });
    } catch {}
  };

  const shareWhatsApp = async () => {
    if (!friendCode) return;
    const text = t(profileText.shareMessage, { code: friendCode });
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
    <View style={styles.screen}>
      <StatusBarScrim />
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
            <Camera size={12} color="#FFFFFF" strokeWidth={2.2} />
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
              <Pencil size={14} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
          {/* Friend code hidden — social/friends feature disabled for now. */}
          {false && !!friendCode && (
            <View style={styles.friendCodeBadge}>
              <Ticket size={11} color={colors.accent} strokeWidth={2.2} />
              <Text style={styles.friendCodeText}>{friendCode}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Invite card hidden — social/friends feature disabled for now. */}
      {false && !!friendCode && (
        <View style={styles.inviteCard}>
          <View>
            <Text style={styles.cardTitle}>{t(profileText.inviteTitle)}</Text>
            <Text style={styles.cardSubtitle}>
              {t(profileText.inviteSubtitle)}
            </Text>
          </View>

          <View style={styles.codeRow}>
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>{t(profileText.friendCodeLabel)}</Text>
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
              <Text style={styles.copyBtnText}>{t(profileText.copy)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.shareRow}>
            <TouchableOpacity
              style={[styles.shareBtn, styles.waBtn]}
              onPress={shareWhatsApp}
            >
              <Text style={styles.shareBtnTextWhite} numberOfLines={1}>
                {t(profileText.shareWhatsApp)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, styles.nativeBtn]}
              onPress={shareNative}
            >
              <Text style={styles.shareBtnTextWhite} numberOfLines={1}>
                {t(profileText.shareNative)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick actions — Friends, Leaderboard & Recap hidden */}
      <View style={styles.quickGrid}>
        {false && (
          <QuickAction
            Icon={Users}
            label={t(profileText.quickFriends)}
            onPress={() => navigation.navigate('Friends')}
          />
        )}
        {false && (
          <QuickAction
            Icon={Trophy}
            label={t(profileText.quickLeaderboard)}
            onPress={() => navigation.navigate('GlobalLeaderboard')}
          />
        )}
        <QuickAction
          Icon={Award}
          label={t(profileText.quickAchievement)}
          onPress={() => navigation.navigate('Achievements')}
        />
        <QuickAction
          Icon={Bell}
          label={t(profileText.quickNotifications)}
          badge={unread > 0 ? unread : undefined}
          onPress={() => navigation.navigate('Notifications')}
        />
        {false && (
          <QuickAction
            Icon={BarChart3}
            label={t(profileText.quickRecap)}
            onPress={() =>
              navigation.navigate('Recap', { year: new Date().getFullYear() })
            }
          />
        )}
      </View>

      {/* Cafe Saya */}
      <Section title={t(profileText.sectionMyCafe)}>
        <MenuItem
          Icon={Heart}
          label={t(profileText.menuFavorites)}
          subtitle={t(profileText.menuFavoritesSub)}
          onPress={() => navigation.navigate('Favorites')}
        />
        {/* Bookmark menu hidden — mirrors web removing bookmarks. */}
        {false && (
          <MenuItem
            Icon={Bookmark}
            label={t(profileText.menuBookmarks)}
            subtitle={t(profileText.menuBookmarksSub)}
            onPress={() => navigation.navigate('Bookmarks')}
          />
        )}
        <MenuItem
          Icon={Star}
          label={t(profileText.menuShortlist)}
          subtitle={t(profileText.menuShortlistSub)}
          onPress={() => navigation.navigate('ShortlistModal')}
          isLast
        />
      </Section>

      {/* Akun */}
      <Section title={t(profileText.sectionAccount)}>
        <MenuItem
          Icon={Settings}
          label={t(profileText.menuEditProfile)}
          subtitle={t(profileText.menuEditProfileSub)}
          onPress={() => navigation.navigate('EditProfileModal')}
        />
        {wizardCompleted && !!preferences && (
          <MenuItem
            Icon={RotateCcw}
            label={t(profileText.menuClearPrefs)}
            subtitle={t(profileText.menuClearPrefsSub)}
            onPress={handleClearPreferences}
          />
        )}
        <MenuItem
          Icon={LogOut}
          label={t(profileText.menuLogout)}
          subtitle={t(profileText.menuLogoutSub)}
          onPress={handleLogout}
          danger
        />
        <MenuItem
          Icon={Trash2}
          label={t(profileText.menuDeleteAccount)}
          subtitle={t(profileText.menuDeleteAccountSub)}
          onPress={() => setDeleteOpen(true)}
          danger
          isLast
        />
      </Section>

      <Text style={styles.versionText}>{t(profileText.appVersion, { version: APP_VERSION })}</Text>

      <DeleteAccountModal
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={handleAccountDeleted}
      />
      </ScrollView>
    </View>
  );
}

function QuickAction({
  Icon,
  label,
  badge,
  onPress,
}: {
  Icon: LucideIcon;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickItem} onPress={onPress}>
      <Icon size={22} color={colors.primary} strokeWidth={2} />
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
  Icon,
  label,
  subtitle,
  onPress,
  isLast,
  danger,
}: {
  Icon: LucideIcon;
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
      <View style={styles.menuIconWrap}>
        <Icon size={18} color={danger ? '#E94B4B' : colors.primary} strokeWidth={2} />
      </View>
      <View style={styles.menuTexts}>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
          {label}
        </Text>
        {!!subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <ChevronRight size={20} color={colors.textSecondary} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const CARD_BORDER = '#F0EDE8';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
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
  profileInfo: { flex: 1, minWidth: 0 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 18, fontWeight: '700', color: colors.primary, flexShrink: 1 },
  userEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  friendCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  menuIconWrap: { width: 24, alignItems: 'center' },
  menuTexts: { flex: 1, minWidth: 0 },
  menuLabel: { fontSize: 14, fontWeight: '700', color: colors.primary },
  menuLabelDanger: { color: colors.error },
  menuSubtitle: { fontSize: 11, color: '#A8A59C', marginTop: 1 },

  versionText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 11, fontWeight: '600',
    marginTop: spacing.md,
  },
});
