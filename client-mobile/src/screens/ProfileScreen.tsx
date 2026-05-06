import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useShortlist } from '../context/ShortlistContext';
import { usePreferences } from '../context/PreferencesContext';
import CafeMatchLogo from '../components/CafeMatchLogo';
import { colors, spacing, radius } from '../theme';
import { APP_VERSION } from '../constant/version';

export default function ProfileScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { clearShortlist } = useShortlist();
  const { setPreferences, setWizardCompleted } = usePreferences();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Kamu yakin mau logout? Semua data lokal (shortlist, preferensi) akan dihapus.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            await clearShortlist();
            // Reset in-memory wizard state so next login starts fresh
            setPreferences(null);
            setWizardCompleted(false);
            // Reset the entire navigation stack to the Splash screen
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
          <Text style={styles.guestTitle}>Welcome to CafeMatch</Text>
          <Text style={styles.guestSubtitle}>Login to access your profile and saved cafes</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('AuthModal')}
          >
            <Text style={styles.loginBtnText}>Login / Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Owner sign-in temporarily hidden — set to true to restore Owner UI access.
  const OWNER_UI_ENABLED = false;
  const isOwner = OWNER_UI_ENABLED && user.role === 'owner';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        {isOwner && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Cafe Owner</Text>
          </View>
        )}
      </View>

      <View style={styles.menuList}>
        {/* Fix 7: Owner Dashboard button */}
        {isOwner && (
          <TouchableOpacity
            style={[styles.menuItem, styles.ownerMenuItem]}
            onPress={() => navigation.navigate('OwnerDashboard')}
          >
            <Text style={styles.menuIcon}>📊</Text>
            <Text style={[styles.menuLabel, { color: colors.accent }]}>Owner Dashboard</Text>
            <Text style={styles.menuArrow}>→</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Favorites')}
        >
          <Text style={styles.menuIcon}>❤️</Text>
          <Text style={styles.menuLabel}>My Favorites</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Bookmarks')}
        >
          <Text style={styles.menuIcon}>🔖</Text>
          <Text style={styles.menuLabel}>My Bookmarks</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Friends')}
        >
          <Text style={styles.menuIcon}>👥</Text>
          <Text style={styles.menuLabel}>Teman</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Achievements')}
        >
          <Text style={styles.menuIcon}>🏆</Text>
          <Text style={styles.menuLabel}>Achievements</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={styles.menuLabel}>Notifikasi</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Recap')}
        >
          <Text style={styles.menuIcon}>📊</Text>
          <Text style={styles.menuLabel}>Recap {new Date().getFullYear()}</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuLabel}>Settings</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>CafeMatch v{APP_VERSION}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.lg,
  },
  guestSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  loginBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: colors.white },
  userName: { fontSize: 20, fontWeight: '700', color: colors.primary },
  userEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  roleBadge: {
    backgroundColor: colors.accent + '20',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 3,
    marginTop: spacing.xs,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: colors.accent },
  menuList: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  ownerMenuItem: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.accent + '08',
  },
  menuIcon: { fontSize: 20, marginRight: spacing.md },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.primary },
  menuArrow: { fontSize: 16, color: colors.textSecondary },
  logoutBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  logoutText: { color: colors.error, fontWeight: '600', fontSize: 15 },
  versionText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: spacing.lg,
  },
});
