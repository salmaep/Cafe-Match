import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';

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

type RouteParams = { promo: any };

export default function PromotionDetailScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const insets = useSafeAreaInsets();
  const { promo } = route.params;

  const statusCfg = STATUS_CONFIG[promo.status] || {
    color: colors.textSecondary,
    icon: '•',
    label: promo.status?.toUpperCase() || 'UNKNOWN',
  };
  const typeCfg = PROMO_TYPE_CONFIG[promo.type] || {
    icon: '📢',
    label: promo.type,
    color: colors.accent,
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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

  const handleStopSubscription = () => {
    Alert.alert(
      'Stop Subscription',
      'Are you sure you want to stop this promotion? It remains active until the billing period ends.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Stop Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.patch(`/promotions/${promo.id}/cancel`, {});
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to stop subscription. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCancelSubmission = () => {
    Alert.alert(
      'Cancel Submission',
      'Cancel this promotion submission? This cannot be undone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/promotions/${promo.id}`);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to cancel submission.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Promotion Detail</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Type + status header */}
        <View style={styles.headerCard}>
          <View style={[styles.typeIconBg, { backgroundColor: typeCfg.color + '20' }]}>
            <Text style={styles.typeIcon}>{typeCfg.icon}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.typeLabel}>{typeCfg.label}</Text>
            <Text style={styles.packageName}>{promo.package?.name || 'Standard Package'}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusCfg.color + '18' }]}>
            <Text style={styles.statusIcon}>{statusCfg.icon}</Text>
            <Text style={[styles.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* Type B: Promo content preview */}
        {promo.type === 'featured_promo' && (promo.contentTitle || promo.promotionContent) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PROMO CONTENT</Text>
            {promo.promotionContent?.promoPhoto || promo.promoPhoto ? (
              <Image
                source={{ uri: promo.promotionContent?.promoPhoto || promo.promoPhoto }}
                style={styles.promoPhoto}
              />
            ) : null}
            <Text style={styles.promoTitle}>
              {promo.promotionContent?.title || promo.contentTitle}
            </Text>
            {(promo.promotionContent?.description || promo.contentDescription) ? (
              <Text style={styles.promoDesc}>
                {promo.promotionContent?.description || promo.contentDescription}
              </Text>
            ) : null}
            {promo.promotionContent?.validHours && (
              <View style={styles.promoMetaRow}>
                <Text style={styles.promoMetaKey}>Valid Hours</Text>
                <Text style={styles.promoMetaVal}>{promo.promotionContent.validHours}</Text>
              </View>
            )}
            {promo.promotionContent?.validDays && (
              <View style={styles.promoMetaRow}>
                <Text style={styles.promoMetaKey}>Valid Days</Text>
                <Text style={styles.promoMetaVal}>{promo.promotionContent.validDays}</Text>
              </View>
            )}
          </View>
        )}

        {/* Type A: New cafe content */}
        {promo.type === 'new_cafe' && promo.newCafeContent && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NEW CAFE DETAILS</Text>
            {promo.newCafeContent.promoPhoto && (
              <Image source={{ uri: promo.newCafeContent.promoPhoto }} style={styles.promoPhoto} />
            )}
            <Text style={styles.promoTitle}>{promo.newCafeContent.highlightText}</Text>
            <View style={styles.promoMetaRow}>
              <Text style={styles.promoMetaKey}>Opening Since</Text>
              <Text style={styles.promoMetaVal}>{promo.newCafeContent.openingSince}</Text>
            </View>
            {promo.newCafeContent.keunggulan?.length > 0 && (
              <View style={styles.keunggulanBox}>
                <Text style={styles.keunggulanTitle}>Highlights</Text>
                {promo.newCafeContent.keunggulan.map((k: string, i: number) => (
                  <Text key={i} style={styles.keunggulanItem}>✓ {k}</Text>
                ))}
              </View>
            )}
            {promo.newCafeContent.promoOffer && (
              <View style={styles.promoOfferBox}>
                <Text style={styles.promoOfferText}>{promo.newCafeContent.promoOffer}</Text>
              </View>
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

        {/* Timeline */}
        {promo.startedAt && promo.expiresAt && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TIMELINE</Text>
            <View style={styles.timelineRow}>
              <View>
                <Text style={styles.timelineSmall}>Started</Text>
                <Text style={styles.timelineDate}>{formatDate(promo.startedAt)}</Text>
              </View>
              {isActive && (
                <View style={styles.daysLeft}>
                  <Text style={styles.daysLeftNum}>{daysLeft}</Text>
                  <Text style={styles.daysLeftLabel}>days left</Text>
                </View>
              )}
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.timelineSmall}>{isActive ? 'Expires' : 'Expired'}</Text>
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
            <Text style={styles.progressLabel}>{progressPct}% used</Text>
          </View>
        )}

        {/* Billing */}
        {promo.package?.priceMonthly && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BILLING</Text>
            <View style={styles.billingRow}>
              <Text style={styles.billingKey}>Package</Text>
              <Text style={styles.billingVal}>{promo.package.name}</Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingKey}>Monthly Cost</Text>
              <Text style={[styles.billingVal, { color: colors.accent, fontWeight: '800' }]}>
                Rp {Number(promo.package.priceMonthly).toLocaleString('id-ID')}/month
              </Text>
            </View>
            {promo.billingCycle && (
              <View style={styles.billingRow}>
                <Text style={styles.billingKey}>Billing Cycle</Text>
                <Text style={styles.billingVal}>{promo.billingCycle}</Text>
              </View>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {isActive && (
            <TouchableOpacity style={styles.btnDanger} onPress={handleStopSubscription}>
              <Text style={styles.btnDangerText}>Stop Subscription</Text>
            </TouchableOpacity>
          )}
          {isPendingReview && (
            <>
              <TouchableOpacity style={styles.btnOutline} onPress={() => Alert.alert('In Review', 'Your promotion is being reviewed by our team. You will be notified once approved.')}>
                <Text style={styles.btnOutlineText}>Check Review Status</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDanger} onPress={handleCancelSubmission}>
                <Text style={styles.btnDangerText}>Cancel Submission</Text>
              </TouchableOpacity>
            </>
          )}
          {isRejected && (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.goBack()}>
              <Text style={styles.btnPrimaryText}>Edit & Resubmit</Text>
            </TouchableOpacity>
          )}
          {!isActive && !isPendingReview && !isRejected && (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.goBack()}>
              <Text style={styles.btnPrimaryText}>Create New Promotion</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 + insets.bottom }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
    backgroundColor: colors.white,
  },
  backBtn: { paddingHorizontal: 4 },
  backText: { fontSize: 16, color: colors.accent, fontWeight: '600' },
  navTitle: { fontSize: 16, fontWeight: '700', color: colors.primary },

  content: { padding: spacing.lg },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  typeIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  typeIcon: { fontSize: 26 },
  headerText: { flex: 1 },
  typeLabel: { fontSize: 16, fontWeight: '700', color: colors.primary },
  packageName: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    gap: 4,
  },
  statusIcon: { fontSize: 13 },
  statusLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },

  section: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },

  promoPhoto: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    resizeMode: 'cover',
    marginBottom: spacing.sm,
  },
  promoTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  promoDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm },
  promoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface,
  },
  promoMetaKey: { fontSize: 13, color: colors.textSecondary },
  promoMetaVal: { fontSize: 13, fontWeight: '600', color: colors.primary },

  keunggulanBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  keunggulanTitle: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  keunggulanItem: { fontSize: 13, color: colors.primary, lineHeight: 22 },

  promoOfferBox: {
    backgroundColor: colors.accent + '15',
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  promoOfferText: { fontSize: 14, fontWeight: '600', color: colors.accent, lineHeight: 20 },

  rejectionBox: {
    backgroundColor: colors.error + '10',
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rejectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.error,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  rejectionText: { fontSize: 14, color: colors.error, lineHeight: 20 },

  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  timelineSmall: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  timelineDate: { fontSize: 14, fontWeight: '600', color: colors.primary, marginTop: 2 },
  daysLeft: { alignItems: 'center' },
  daysLeftNum: { fontSize: 22, fontWeight: '800', color: colors.success },
  daysLeftLabel: { fontSize: 11, color: colors.success, fontWeight: '600' },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 11, color: colors.textSecondary, textAlign: 'right' },

  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
  },
  billingKey: { fontSize: 13, color: colors.textSecondary },
  billingVal: { fontSize: 14, fontWeight: '600', color: colors.primary },

  actions: { gap: spacing.sm, marginTop: spacing.xs },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: colors.white },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  btnOutlineText: { fontSize: 15, fontWeight: '600', color: colors.accent },
  btnDanger: {
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    backgroundColor: colors.error + '08',
  },
  btnDangerText: { fontSize: 15, fontWeight: '700', color: colors.error },
});
