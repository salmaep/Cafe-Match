import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { fetchOwnerPromotions, fetchOwnerCafe } from '../../services/api';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';
import CreatePromotionScreen from './CreatePromotionScreen';

const MOCK_PROMOTIONS = [
  {
    id: 1,
    type: 'featured_promo',
    status: 'active',
    contentTitle: 'Buy 1 Get 1 All Coffee',
    contentDescription: 'Valid for all coffee drinks every Wednesday',
    billingCycle: 'monthly',
    package: { name: 'Featured Promo Basic', priceMonthly: 150000 },
    startedAt: '2026-03-15T00:00:00.000Z',
    expiresAt: '2026-05-15T00:00:00.000Z',
  },
  {
    id: 2,
    type: 'new_cafe',
    status: 'expired',
    contentTitle: null,
    contentDescription: null,
    billingCycle: 'monthly',
    package: { name: 'New Cafe Highlight', priceMonthly: 100000 },
    startedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-02-01T00:00:00.000Z',
  },
];

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  active: { color: colors.success, icon: '✅', label: 'ACTIVE' },
  expired: { color: colors.error, icon: '⏱️', label: 'EXPIRED' },
  pending_review: { color: colors.accent, icon: '🔍', label: 'IN REVIEW' },
  pending_payment: { color: '#9B59B6', icon: '💳', label: 'PENDING PAYMENT' },
  rejected: { color: colors.error, icon: '❌', label: 'REJECTED' },
};

const PROMO_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  new_cafe: { icon: '🆕', label: 'New Cafe Highlight', color: '#5B9BD5' },
  featured_promo: { icon: '⭐', label: 'Featured Promo', color: colors.accent },
};

export default function PromotionScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [ownerCafe, setOwnerCafe] = useState<any>(null);

  useEffect(() => {
    loadPromotions();
    loadOwnerCafe();
  }, []);

  const loadOwnerCafe = async () => {
    try {
      const data = await fetchOwnerCafe();
      setOwnerCafe(data);
    } catch {
      // silently ignore
    }
  };

  const loadPromotions = async () => {
    try {
      const data = await fetchOwnerPromotions();
      setPromotions(data.length > 0 ? data : MOCK_PROMOTIONS);
    } catch {
      setPromotions(MOCK_PROMOTIONS);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDaysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getProgressPct = (startedAt: string, expiresAt: string) => {
    const start = new Date(startedAt).getTime();
    const end = new Date(expiresAt).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  const handleCancelSubmission = (promo: any) => {
    Alert.alert(
      'Cancel Submission',
      'Are you sure you want to cancel this promotion submission? This action cannot be undone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Submission',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/promotions/${promo.id}`);
              setPromotions((prev) => prev.filter((p) => p.id !== promo.id));
            } catch {
              Alert.alert('Error', 'Failed to cancel submission. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleStopSubscription = (promo: any) => {
    Alert.alert(
      'Stop Subscription',
      'Are you sure you want to stop this promotion subscription? It will remain active until the current billing period ends.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Stop Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/promotions/${promo.id}/cancel`, {});
              setPromotions((prev) =>
                prev.map((p) => (p.id === promo.id ? { ...p, status: 'expired' } : p))
              );
            } catch {
              Alert.alert('Error', 'Failed to stop subscription. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header info */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Promotions</Text>
          <Text style={styles.pageSubtitle}>Manage your cafe's visibility campaigns</Text>
        </View>

        {promotions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📢</Text>
            <Text style={styles.emptyTitle}>No promotions yet</Text>
            <Text style={styles.emptyHint}>
              Create a promotion to boost your cafe's visibility on CafeMatch
            </Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setShowCreate(true)}
            >
              <Text style={styles.createBtnText}>+ Create Promotion</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {promotions.map((promo) => {
              const statusCfg = STATUS_CONFIG[promo.status] || {
                color: colors.textSecondary,
                icon: '•',
                label: promo.status.toUpperCase(),
              };
              const typeCfg = PROMO_TYPE_CONFIG[promo.type] || {
                icon: '📢',
                label: promo.type,
                color: colors.accent,
              };
              const isActive = promo.status === 'active';
              const isPendingReview = promo.status === 'pending_review';
              const isRejected = promo.status === 'rejected';
              const daysLeft = promo.expiresAt ? getDaysRemaining(promo.expiresAt) : 0;
              const progressPct =
                isActive && promo.startedAt && promo.expiresAt
                  ? getProgressPct(promo.startedAt, promo.expiresAt)
                  : promo.status === 'expired'
                    ? 100
                    : 0;

              return (
                <View key={promo.id} style={styles.promoCard}>
                  {/* Card header */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.typeIconBg, { backgroundColor: typeCfg.color + '18' }]}>
                      <Text style={styles.typeIcon}>{typeCfg.icon}</Text>
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.promoType}>{typeCfg.label}</Text>
                      <Text style={styles.packageName}>
                        {promo.package?.name || 'Standard Package'}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusCfg.color + '15' }]}>
                      <Text style={styles.statusIcon}>{statusCfg.icon}</Text>
                      <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>

                  {/* Promo content preview (featured_promo only) */}
                  {promo.contentTitle && (
                    <View style={styles.contentPreview}>
                      <Text style={styles.contentLabel}>PROMO CONTENT</Text>
                      <Text style={styles.contentTitle}>{promo.contentTitle}</Text>
                      {promo.contentDescription && (
                        <Text style={styles.contentDesc} numberOfLines={2}>
                          {promo.contentDescription}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Rejection reason */}
                  {isRejected && promo.rejectionReason && (
                    <View style={styles.rejectionBox}>
                      <Text style={styles.rejectionLabel}>REJECTION REASON</Text>
                      <Text style={styles.rejectionText}>{promo.rejectionReason}</Text>
                    </View>
                  )}

                  {/* Timeline progress */}
                  {promo.startedAt && promo.expiresAt && (
                    <View style={styles.timeline}>
                      <View style={styles.timelineHeader}>
                        <View>
                          <Text style={styles.timelineLabel}>Started</Text>
                          <Text style={styles.timelineDate}>{formatDate(promo.startedAt)}</Text>
                        </View>
                        {isActive && (
                          <View style={styles.daysRemainingBadge}>
                            <Text style={styles.daysRemainingText}>
                              {daysLeft} days left
                            </Text>
                          </View>
                        )}
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.timelineLabel}>
                            {isActive ? 'Expires' : 'Expired'}
                          </Text>
                          <Text style={styles.timelineDate}>{formatDate(promo.expiresAt)}</Text>
                        </View>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${progressPct}%` as any,
                              backgroundColor: isActive ? colors.success : colors.textSecondary + '60',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}

                  {/* Billing */}
                  {promo.package?.priceMonthly && (
                    <View style={styles.billingRow}>
                      <Text style={styles.billingLabel}>Monthly cost</Text>
                      <Text style={styles.billingValue}>
                        Rp {Number(promo.package.priceMonthly).toLocaleString('id-ID')}
                        <Text style={styles.billingCycle}>/month</Text>
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  {isActive && (
                    <View style={styles.actionGroup}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnOutline]}
                        onPress={() => navigation.navigate('PromotionDetail', { promo })}
                      >
                        <Text style={[styles.actionBtnText, styles.actionBtnTextActive]}>View Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnActive]}
                        onPress={() => handleStopSubscription(promo)}
                      >
                        <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>
                          Stop Subscription
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isPendingReview && (
                    <View style={styles.actionGroup}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnOutline]}
                        onPress={() => navigation.navigate('PromotionDetail', { promo })}
                      >
                        <Text style={styles.actionBtnText}>Manage Promotion</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnDanger]}
                        onPress={() => handleCancelSubmission(promo)}
                      >
                        <Text style={styles.actionBtnTextWhite}>Cancel Submission</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isRejected && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnActive]}
                      onPress={() => setShowCreate(true)}
                    >
                      <Text style={[styles.actionBtnText, styles.actionBtnTextActive]}>
                        Edit & Resubmit
                      </Text>
                    </TouchableOpacity>
                  )}

                  {!isActive && !isPendingReview && !isRejected && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => navigation.navigate('PromotionDetail', { promo })}
                    >
                      <Text style={styles.actionBtnText}>View Details</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Create new CTA */}
            <TouchableOpacity
              style={styles.newPromoBtn}
              onPress={() => setShowCreate(true)}
            >
              <Text style={styles.newPromoBtnIcon}>+</Text>
              <Text style={styles.newPromoBtnText}>Create New Promotion</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <CreatePromotionScreen
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        ownerCafe={ownerCafe}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  pageHeader: { marginBottom: spacing.lg },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.primary },
  pageSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  emptyState: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.primary },
  emptyHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
  createBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
  },
  createBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  promoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  typeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  typeIcon: { fontSize: 22 },
  cardHeaderText: { flex: 1 },
  promoType: { fontSize: 15, fontWeight: '700', color: colors.primary },
  packageName: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    gap: 4,
  },
  statusIcon: { fontSize: 12 },
  statusLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  contentPreview: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  contentLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  contentTitle: { fontSize: 14, fontWeight: '700', color: colors.accent },
  contentDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },

  // Rejection box
  rejectionBox: {
    backgroundColor: colors.error + '10',
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  rejectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.error,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  rejectionText: { fontSize: 13, color: colors.error, lineHeight: 18 },

  timeline: { marginBottom: spacing.md },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  timelineLabel: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  timelineDate: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 1 },
  daysRemainingBadge: {
    backgroundColor: colors.success + '18',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  daysRemainingText: { fontSize: 12, fontWeight: '700', color: colors.success },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface,
  },
  billingLabel: { fontSize: 13, color: colors.textSecondary },
  billingValue: { fontSize: 15, fontWeight: '700', color: colors.primary },
  billingCycle: { fontSize: 12, fontWeight: '400', color: colors.textSecondary },

  // Action buttons
  actionGroup: {
    gap: spacing.xs,
  },
  actionBtn: {
    borderWidth: 1.5,
    borderColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionBtnOutline: {
    borderColor: colors.surface,
    backgroundColor: 'transparent',
  },
  actionBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '08',
  },
  actionBtnDanger: {
    borderColor: colors.error,
    backgroundColor: colors.error,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  actionBtnTextActive: { color: colors.accent },
  actionBtnTextDanger: { color: colors.error, fontWeight: '700' },
  actionBtnTextWhite: { fontSize: 14, fontWeight: '700', color: colors.white },

  newPromoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent + '60',
    borderRadius: radius.md,
    borderStyle: 'dashed',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  newPromoBtnIcon: { fontSize: 18, color: colors.accent, fontWeight: '700' },
  newPromoBtnText: { fontSize: 15, fontWeight: '600', color: colors.accent },
});
