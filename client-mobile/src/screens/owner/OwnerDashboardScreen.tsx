import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchOwnerDashboard } from '../../services/api';
import { OwnerDashboard } from '../../types';
import { colors, spacing, radius } from '../../theme';
import MyCafeScreen from './MyCafeScreen';
import PromotionScreen from './PromotionScreen';

const { width } = Dimensions.get('window');

const MOCK_DASHBOARD: OwnerDashboard = {
  hasCafe: true,
  cafe: { id: 1, name: 'My Coffee House', bookmarksCount: 89, favoritesCount: 156 },
  analytics: { totalViews: 1240, totalClicks: 387 },
  activePromotion: {
    id: 1,
    type: 'featured_promo',
    packageName: 'Featured Promo Basic',
    expiresAt: '2026-05-15T00:00:00.000Z',
    daysRemaining: 36,
    status: 'active',
  },
  pendingCount: 0,
};

type TabKey = 'dashboard' | 'mycafe' | 'promotions';

export default function OwnerDashboardScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<OwnerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await fetchOwnerDashboard();
      // Merge with safe defaults so nested fields can never be undefined
      setDashboard({
        hasCafe: data?.hasCafe ?? false,
        cafe: data?.cafe ?? null,
        analytics: data?.analytics ?? { totalViews: 0, totalClicks: 0 },
        activePromotion: data?.activePromotion ?? null,
        pendingCount: data?.pendingCount ?? 0,
      });
    } catch {
      setDashboard(MOCK_DASHBOARD);
    } finally {
      setLoading(false);
    }
  };

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'mycafe', label: 'My Cafe', icon: '☕' },
    { key: 'promotions', label: 'Promotions', icon: '📢' },
  ];

  const headerH = insets.top + 56;

  return (
    <View style={styles.container}>
      {/* Top header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>OWNER</Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {dashboard?.cafe?.name || 'Owner Portal'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.backToAppBtn}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Text style={styles.backToAppText}>← App</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {loading && activeTab === 'dashboard' ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : activeTab === 'dashboard' ? (
        <DashboardTab dashboard={dashboard!} onTabChange={setActiveTab} />
      ) : activeTab === 'mycafe' ? (
        <MyCafeScreen />
      ) : (
        <PromotionScreen />
      )}
    </View>
  );
}

function DashboardTab({
  dashboard,
  onTabChange,
}: {
  dashboard: OwnerDashboard;
  onTabChange: (tab: TabKey) => void;
}) {
  const d = dashboard;
  // Defensive defaults — backend may return null/missing nested fields
  // when owner has no cafe yet or stats haven't been computed.
  const analytics = d?.analytics ?? { totalViews: 0, totalClicks: 0 };
  const cafe = d?.cafe ?? null;
  const activePromotion = d?.activePromotion ?? null;

  const statusColor =
    activePromotion?.status === 'active'
      ? colors.success
      : activePromotion?.status === 'expired'
        ? colors.error
        : colors.accent;

  const stats = [
    { icon: '👁️', label: 'Views (30d)', value: analytics.totalViews ?? 0, color: '#5B9BD5' },
    { icon: '🖱️', label: 'Clicks (30d)', value: analytics.totalClicks ?? 0, color: '#70AD47' },
    { icon: '❤️', label: 'Favorites', value: cafe?.favoritesCount || 0, color: '#E05252' },
    { icon: '🔖', label: 'Bookmarks', value: cafe?.bookmarksCount || 0, color: colors.accent },
  ];

  const ctr =
    (analytics.totalViews ?? 0) > 0
      ? Math.round(((analytics.totalClicks ?? 0) / (analytics.totalViews || 1)) * 1000) / 10
      : 0;

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetingTitle}>Welcome back! 👋</Text>
        <Text style={styles.greetingSubtitle}>Here's how your cafe is performing</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: s.color + '15' }]}>
              <Text style={styles.statCardIcon}>{s.icon}</Text>
            </View>
            <Text style={[styles.statNumber, { color: s.color }]}>{s.value.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* CTR insight */}
      <View style={styles.insightCard}>
        <Text style={styles.insightIcon}>📈</Text>
        <View style={styles.insightText}>
          <Text style={styles.insightTitle}>Click-Through Rate</Text>
          <Text style={styles.insightValue}>{ctr}%</Text>
        </View>
        <Text style={styles.insightHint}>
          {ctr >= 30 ? 'Excellent!' : ctr >= 15 ? 'Good' : 'Room to grow'}
        </Text>
      </View>

      {/* Promotion status */}
      <Text style={styles.sectionTitle}>Active Promotion</Text>
      {activePromotion ? (
        <TouchableOpacity
          style={[styles.promoCard, { borderLeftColor: statusColor }]}
          onPress={() => onTabChange('promotions')}
          activeOpacity={0.8}
        >
          <View style={styles.promoCardTop}>
            <View>
              <Text style={styles.promoCardType}>
                {activePromotion.type === 'new_cafe' ? '🆕  New Cafe Highlight' : '⭐  Featured Promo'}
              </Text>
              <Text style={styles.promoCardPackage}>{activePromotion.packageName ?? 'Promotion'}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusColor + '18' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusLabel, { color: statusColor }]}>
                {(activePromotion.status ?? 'unknown').toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.promoCardBottom}>
            <Text style={styles.promoExpiryLabel}>
              {(activePromotion.daysRemaining ?? 0) > 0
                ? `${activePromotion.daysRemaining} days remaining`
                : 'Expired'}
            </Text>
            <Text style={styles.promoManageLink}>Manage →</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.noPromoCard}
          onPress={() => onTabChange('promotions')}
          activeOpacity={0.8}
        >
          <Text style={styles.noPromoIcon}>📢</Text>
          <Text style={styles.noPromoTitle}>No active promotion</Text>
          <Text style={styles.noPromoHint}>Boost visibility by creating a promotion</Text>
          <View style={styles.noPromoBtn}>
            <Text style={styles.noPromoBtnText}>View Packages →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Quick nav */}
      <Text style={styles.sectionTitle}>Manage</Text>
      <TouchableOpacity style={styles.quickCard} onPress={() => onTabChange('mycafe')} activeOpacity={0.8}>
        <View style={[styles.quickIconBg, { backgroundColor: '#D48B3A18' }]}>
          <Text style={styles.quickIcon}>☕</Text>
        </View>
        <View style={styles.quickText}>
          <Text style={styles.quickTitle}>My Cafe</Text>
          <Text style={styles.quickSubtitle}>View photos, facilities & menu</Text>
        </View>
        <Text style={styles.quickArrow}>→</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickCard} onPress={() => onTabChange('promotions')} activeOpacity={0.8}>
        <View style={[styles.quickIconBg, { backgroundColor: '#5B9BD518' }]}>
          <Text style={styles.quickIcon}>📢</Text>
        </View>
        <View style={styles.quickText}>
          <Text style={styles.quickTitle}>Promotions</Text>
          <Text style={styles.quickSubtitle}>View & manage active campaigns</Text>
        </View>
        <Text style={styles.quickArrow}>→</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  ownerBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginRight: spacing.sm,
  },
  ownerBadgeText: { fontSize: 10, fontWeight: '800', color: colors.white, letterSpacing: 0.8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, flex: 1 },
  backToAppBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  backToAppText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    gap: 4,
    position: 'relative',
  },
  tabActive: {},
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  tabLabelActive: { color: colors.accent },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: { flex: 1, backgroundColor: colors.background },
  tabContentInner: { padding: spacing.lg },

  // Dashboard content
  greeting: { marginBottom: spacing.lg },
  greetingTitle: { fontSize: 22, fontWeight: '700', color: colors.primary },
  greetingSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: (width - spacing.lg * 2 - spacing.sm) / 2,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statCardIcon: { fontSize: 18 },
  statNumber: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  insightIcon: { fontSize: 24, marginRight: spacing.md },
  insightText: { flex: 1 },
  insightTitle: { fontSize: 13, color: colors.textSecondary },
  insightValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
  insightHint: { fontSize: 13, fontWeight: '600', color: colors.accent },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },

  promoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  promoCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  promoCardType: { fontSize: 15, fontWeight: '700', color: colors.primary },
  promoCardPackage: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  promoCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoExpiryLabel: { fontSize: 13, color: colors.textSecondary },
  promoManageLink: { fontSize: 13, color: colors.accent, fontWeight: '600' },

  noPromoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
    borderStyle: 'dashed',
  },
  noPromoIcon: { fontSize: 32, marginBottom: spacing.sm },
  noPromoTitle: { fontSize: 15, fontWeight: '600', color: colors.primary },
  noPromoHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  noPromoBtn: {
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  noPromoBtnText: { fontSize: 14, color: colors.accent, fontWeight: '600' },

  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  quickIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  quickIcon: { fontSize: 22 },
  quickText: { flex: 1 },
  quickTitle: { fontSize: 15, fontWeight: '600', color: colors.primary },
  quickSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  quickArrow: { fontSize: 18, color: colors.textSecondary },
});
