import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Check,
  X,
  Users,
  Clock,
  Coffee,
} from 'lucide-react-native';
import { useOpenTables } from '../context/OpenTablesContext';
import { useAuth } from '../context/AuthContext';
import { JoinRequestStatus } from '../services/api';
import { colors, spacing, radius } from '../theme';

type Tab = 'mine' | 'requests';

const STATUS_LABEL: Record<JoinRequestStatus, string> = {
  pending: 'Menunggu',
  accepted: 'Diterima',
  declined: 'Ditolak',
  canceled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
};

const STATUS_STYLE: Record<
  JoinRequestStatus,
  { bg: string; fg: string; border: string }
> = {
  pending: { bg: '#FEF3C7', fg: '#B45309', border: '#FDE68A' },
  accepted: { bg: '#D1FAE5', fg: '#047857', border: '#A7F3D0' },
  declined: { bg: '#FEE2E2', fg: '#DC2626', border: '#FECACA' },
  canceled: { bg: colors.surface, fg: colors.textSecondary, border: '#E8E4DD' },
  expired: { bg: colors.surface, fg: colors.textSecondary, border: '#E8E4DD' },
};

function formatCountdown(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'berakhir';
  const total = Math.floor(ms / 60_000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}j ${m}m lagi` : `${m}m lagi`;
}

function initialsOf(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Avatar({
  name,
  url,
  size = 40,
}: {
  name?: string | null;
  url?: string | null;
  size?: number;
}) {
  const fontSize = Math.round(size * 0.36);
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize }]}>{initialsOf(name)}</Text>
    </View>
  );
}

export default function MyTablesScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    myActive,
    myRequests,
    refresh,
    closeMine,
    acceptRequest,
    declineRequest,
    cancelRequest,
  } = useOpenTables();

  const [tab, setTab] = useState<Tab>('mine');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const withBusy = async (
    id: number,
    fn: () => Promise<unknown>,
    successMsg: string,
  ) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await fn();
      Alert.alert('OK', successMsg);
    } catch (err: any) {
      Alert.alert(
        'Gagal',
        err?.response?.data?.message || err?.message || 'Gagal memproses',
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader onBack={() => navigation.goBack()} />
        <View style={styles.emptyBig}>
          <Text style={styles.emoji}>🪑</Text>
          <Text style={styles.emptyTitle}>Open Table</Text>
          <Text style={styles.emptyText}>
            Login dulu buat open table atau lihat request kamu.
          </Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() => navigation.navigate('AuthModal')}
          >
            <Text style={styles.emptyCtaText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const pendingCount = myActive?.pendingRequests?.length ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader onBack={() => navigation.goBack()} />

      <View style={styles.tabsRow}>
        <TabBtn
          label="Meja Saya"
          active={tab === 'mine'}
          badge={pendingCount}
          onPress={() => setTab('mine')}
        />
        <TabBtn
          label="Request Saya"
          active={tab === 'requests'}
          onPress={() => setTab('requests')}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: insets.bottom + 40,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'mine' ? (
          !myActive ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emoji}>☕</Text>
              <Text style={styles.emptyCardTitle}>Kamu belum open table</Text>
              <Text style={styles.emptyCardText}>
                Buka table dari halaman cafe atau pin di map buat ngajak
                nongkrong bareng.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.activeCard}>
                <View style={styles.activeCardHead}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.activeTag}>MEJA AKTIF</Text>
                    {myActive.cafe ? (
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('CafeDetail', {
                            cafe: {
                              id: String(myActive.cafe!.id),
                              name: myActive.cafe!.name,
                              slug: myActive.cafe!.slug ?? undefined,
                            },
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={styles.activeCafe}>
                          {myActive.cafe.name}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.activeCafe}>Cafe</Text>
                    )}
                    {!!myActive.title && (
                      <Text style={styles.activeTitle}>
                        “{myActive.title}”
                      </Text>
                    )}
                  </View>
                  <View style={styles.countPill}>
                    <Users size={13} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.countText}>
                      {myActive.acceptedCount}/{myActive.maxGuests}
                    </Text>
                  </View>
                </View>

                <View style={styles.timeRow}>
                  <Clock size={12} color={colors.textSecondary} strokeWidth={2} />
                  <Text style={styles.timeText}>
                    {formatCountdown(myActive.expiresAt, now)}
                  </Text>
                </View>

                {myActive.members.length > 0 && (
                  <View style={styles.membersBlock}>
                    <Text style={styles.sectionLabel}>SUDAH JOIN</Text>
                    <View style={{ gap: spacing.sm }}>
                      {myActive.members.map(
                        (m) =>
                          m && (
                            <View key={m.id} style={styles.memberRow}>
                              <Avatar
                                name={m.name}
                                url={m.avatarUrl}
                                size={32}
                              />
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  style={styles.memberName}
                                  numberOfLines={1}
                                >
                                  {m.name}
                                </Text>
                                {!!m.username && (
                                  <Text
                                    style={styles.memberHandle}
                                    numberOfLines={1}
                                  >
                                    @{m.username}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ),
                      )}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.closeBtn,
                    busyId === myActive.id && styles.btnDisabled,
                  ]}
                  onPress={() =>
                    withBusy(myActive.id, () => closeMine(), 'Meja ditutup')
                  }
                  disabled={busyId === myActive.id}
                >
                  {busyId === myActive.id ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Text style={styles.closeBtnText}>Close Table</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionLabel}>REQUEST MASUK</Text>
                {myActive.pendingRequests.length === 0 ? (
                  <Text style={styles.emptyInline}>
                    Belum ada yang request join.
                  </Text>
                ) : (
                  <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
                    {myActive.pendingRequests.map((r) => (
                      <View key={r.id} style={styles.reqRow}>
                        <Avatar
                          name={r.user?.name}
                          url={r.user?.avatarUrl}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.reqName} numberOfLines={1}>
                            {r.user?.name ?? 'User'}
                          </Text>
                          {(r.user?.username || r.message) && (
                            <Text style={styles.reqSub} numberOfLines={2}>
                              {r.user?.username ? `@${r.user.username}` : ''}
                              {r.message ? ` · “${r.message}”` : ''}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.iconBtn,
                            styles.acceptBtn,
                            busyId === r.id && styles.btnDisabled,
                          ]}
                          onPress={() =>
                            withBusy(
                              r.id,
                              () => acceptRequest(r.id),
                              'Request diterima!',
                            )
                          }
                          disabled={busyId === r.id}
                        >
                          <Check size={16} color={colors.white} strokeWidth={2.6} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.iconBtn,
                            styles.declineBtn,
                            busyId === r.id && styles.btnDisabled,
                          ]}
                          onPress={() =>
                            withBusy(
                              r.id,
                              () => declineRequest(r.id),
                              'Request ditolak',
                            )
                          }
                          disabled={busyId === r.id}
                        >
                          <X size={16} color={colors.textSecondary} strokeWidth={2.6} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )
        ) : myRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emoji}>📨</Text>
            <Text style={styles.emptyCardTitle}>Belum ada request</Text>
            <Text style={styles.emptyCardText}>
              Tap pin hijau di map buat lihat open table dan request join.
            </Text>
          </View>
        ) : (
          myRequests.map((r) => {
            const style = STATUS_STYLE[r.status];
            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.reqRow}>
                  <Avatar
                    name={r.table?.host?.name}
                    url={r.table?.host?.avatarUrl}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.cafeNameRow}>
                      <Coffee
                        size={12}
                        color={colors.textSecondary}
                        strokeWidth={2.2}
                      />
                      <Text style={styles.cafeName} numberOfLines={1}>
                        {r.table?.cafe?.name ?? 'Cafe'}
                      </Text>
                    </View>
                    <Text style={styles.reqSub} numberOfLines={1}>
                      Host: {r.table?.host?.name ?? '-'}
                      {r.table?.host?.username
                        ? ` (@${r.table.host.username})`
                        : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusChip,
                      { backgroundColor: style.bg, borderColor: style.border },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: style.fg }]}>
                      {STATUS_LABEL[r.status]}
                    </Text>
                  </View>
                </View>
                {r.status === 'pending' && (
                  <TouchableOpacity
                    style={[
                      styles.cancelBtn,
                      busyId === r.id && styles.btnDisabled,
                    ]}
                    onPress={() =>
                      withBusy(
                        r.id,
                        () => cancelRequest(r.id),
                        'Request dibatalkan',
                      )
                    }
                    disabled={busyId === r.id}
                  >
                    {busyId === r.id ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.textSecondary}
                      />
                    ) : (
                      <Text style={styles.cancelBtnText}>Batalkan</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <ChevronLeft size={22} color={colors.primary} strokeWidth={2.2} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Meja Saya</Text>
      <View style={styles.backBtn} />
    </View>
  );
}

function TabBtn({
  label,
  active,
  badge,
  onPress,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
      {!!badge && badge > 0 && (
        <View style={styles.tabBadge}>
          <Text style={styles.tabBadgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const CARD_BORDER = '#F0EDE8';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: { fontSize: 13, fontWeight: '800', color: colors.primary },
  tabTextActive: { color: colors.white },
  tabBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
  },

  emptyBig: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  emoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    fontWeight: '500',
  },
  emptyCta: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  emptyCtaText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 4,
  },
  emptyCardText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    fontWeight: '500',
  },
  emptyInline: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  activeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: spacing.md,
  },
  activeCardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 4,
  },
  activeTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  activeCafe: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  activeTitle: {
    fontSize: 13,
    color: '#5C5A52',
    marginTop: 2,
    fontStyle: 'italic',
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm + 2,
  },
  timeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.2,
  },
  membersBlock: {
    marginBottom: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  memberHandle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
  },
  closeBtnText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '800',
  },
  btnDisabled: { opacity: 0.6 },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: spacing.md,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reqName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  reqSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 15,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: colors.success,
  },
  declineBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },

  cafeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cafeName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },

  avatarFallback: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontWeight: '900',
  },
});
