import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import CafeMatchLogo from '../components/CafeMatchLogo';
import { colors, spacing, radius } from '../theme';

export default function ProfileScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { user, logout } = useAuth();

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

  const isOwner = user.role === 'owner';

  return (
    <View style={styles.container}>
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
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuLabel}>Settings</Text>
          <Text style={styles.menuArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
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
    paddingTop: 72,
    paddingBottom: spacing.lg,
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
});
