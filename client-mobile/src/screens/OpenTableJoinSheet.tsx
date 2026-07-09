import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Users, Clock, Check, Loader2, XCircle } from 'lucide-react-native';
import {
  listTablesByCafeApi,
  requestJoinTableApi,
  closeTableApi,
  CafeTableRow,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useOpenTables } from '../context/OpenTablesContext';
import { colors, spacing, radius } from '../theme';

type Params = {
  OpenTableJoinSheet: { cafeId: string; cafeName: string };
};

function formatCountdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

function genderRuleLabel(rule: string): string | null {
  if (rule === 'female_only') return 'Cewe only';
  if (rule === 'male_only') return 'Cowo only';
  return null;
}

export default function OpenTableJoinSheet() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<Params, 'OpenTableJoinSheet'>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refresh } = useOpenTables();
  const { cafeId, cafeName } = route.params;

  const [tables, setTables] = useState<CafeTableRow[] | null>(null);
  const [busyRowId, setBusyRowId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await listTablesByCafeApi(cafeId);
      setTables(rows);
    } catch {
      setTables([]);
    }
  }, [cafeId]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [load]);

  const handleAction = async (table: CafeTableRow) => {
    if (!user) {
      navigation.navigate('AuthModal');
      return;
    }
    setBusyRowId(table.id);
    try {
      if (table.isMine) {
        Alert.alert(
          'Tutup table?',
          'Yakin mau tutup open table lo?',
          [
            { text: 'Batal', style: 'cancel', onPress: () => setBusyRowId(null) },
            {
              text: 'Tutup',
              style: 'destructive',
              onPress: async () => {
                try {
                  await closeTableApi(table.id);
                  await refresh();
                  await load();
                } catch (err: any) {
                  Alert.alert(
                    'Gagal',
                    err?.response?.data?.message || 'Gagal tutup table',
                  );
                } finally {
                  setBusyRowId(null);
                }
              },
            },
          ],
        );
        return;
      }
      if (table.myRequestStatus === 'pending') {
        Alert.alert('Menunggu', 'Request lo lagi diproses host.');
        setBusyRowId(null);
        return;
      }
      if (table.acceptedCount >= table.maxGuests) {
        Alert.alert('Penuh', 'Table ini udah penuh.');
        setBusyRowId(null);
        return;
      }
      await requestJoinTableApi(table.id);
      Alert.alert('Request terkirim', 'Nunggu host confirm.');
      await load();
    } catch (err: any) {
      Alert.alert(
        'Gagal',
        err?.response?.data?.message || err?.message || 'Gagal request join',
      );
    } finally {
      setBusyRowId(null);
    }
  };

  const empty = tables !== null && tables.length === 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={() => navigation.goBack()}
      />
      <View style={[styles.sheet, { paddingBottom: 32 + insets.bottom }]}>
        <View style={styles.handleBar} />

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Open Tables</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              di {cafeName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
          >
            <X size={18} color={colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {tables === null ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : empty ? (
          <View style={styles.empty}>
            <Users size={48} color={colors.textSecondary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Belum ada open table</Text>
            <Text style={styles.emptySubtitle}>
              Jadi yang pertama! Buka table biar orang lain bisa join.
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => {
                navigation.goBack();
                setTimeout(() => {
                  navigation.navigate('OpenTableCreateModal', {
                    cafeId,
                    cafeName,
                  });
                }, 200);
              }}
            >
              <Text style={styles.emptyCtaText}>Open Table</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {tables!.map((table) => (
              <TableRow
                key={table.id}
                table={table}
                busy={busyRowId === table.id}
                onPressAction={() => handleAction(table)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function TableRow({
  table,
  busy,
  onPressAction,
}: {
  table: CafeTableRow;
  busy: boolean;
  onPressAction: () => void;
}) {
  const initials = table.host.name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const genderTag = genderRuleLabel(table.genderRule);
  const full = table.acceptedCount >= table.maxGuests;

  let btnStyle = styles.joinBtn;
  let btnLabel: React.ReactNode = 'Join';
  let disabled = false;

  if (table.isMine) {
    btnStyle = { ...styles.joinBtn, ...styles.joinBtnDanger };
    btnLabel = 'Tutup';
  } else if (table.myRequestStatus === 'accepted') {
    btnStyle = { ...styles.joinBtn, ...styles.joinBtnJoined };
    btnLabel = (
      <>
        <Check size={13} color={colors.white} strokeWidth={2.6} />
        <Text style={styles.joinBtnText}>Joined</Text>
      </>
    );
    disabled = true;
  } else if (table.myRequestStatus === 'pending') {
    btnStyle = { ...styles.joinBtn, ...styles.joinBtnPending };
    btnLabel = (
      <>
        <Loader2 size={13} color={colors.white} strokeWidth={2.6} />
        <Text style={styles.joinBtnText}>Pending</Text>
      </>
    );
  } else if (table.myRequestStatus === 'declined') {
    btnStyle = { ...styles.joinBtn, ...styles.joinBtnDisabled };
    btnLabel = (
      <>
        <XCircle size={13} color={colors.white} strokeWidth={2.4} />
        <Text style={styles.joinBtnText}>Declined</Text>
      </>
    );
    disabled = true;
  } else if (full) {
    btnStyle = { ...styles.joinBtn, ...styles.joinBtnDisabled };
    btnLabel = 'Penuh';
    disabled = true;
  }

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        {table.host.avatarUrl ? (
          <Image
            source={{ uri: table.host.avatarUrl }}
            style={styles.avatarImg}
          />
        ) : (
          <Text style={styles.avatarText}>{initials}</Text>
        )}
      </View>
      <View style={styles.rowInfo}>
        <View style={styles.rowNameLine}>
          <Text style={styles.rowName} numberOfLines={1}>
            {table.host.name}
          </Text>
          {!!table.host.username && (
            <Text style={styles.rowHandle} numberOfLines={1}>
              @{table.host.username}
            </Text>
          )}
          {table.isMine && (
            <View style={styles.mineBadge}>
              <Text style={styles.mineBadgeText}>KAMU</Text>
            </View>
          )}
          {!!genderTag && (
            <View style={styles.genderBadge}>
              <Text style={styles.genderBadgeText}>{genderTag}</Text>
            </View>
          )}
        </View>
        {!!table.title && (
          <Text style={styles.rowNote} numberOfLines={2}>
            {table.title}
          </Text>
        )}
        <View style={styles.rowMeta}>
          <View style={styles.metaChip}>
            <Users size={11} color={colors.textSecondary} strokeWidth={2.2} />
            <Text style={styles.metaText}>
              {table.acceptedCount} / {table.maxGuests}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Clock size={11} color={colors.textSecondary} strokeWidth={2.2} />
            <Text style={styles.metaText}>
              {formatCountdown(table.expiresAt)} lagi
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={btnStyle}
        onPress={onPressAction}
        disabled={disabled || busy}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : typeof btnLabel === 'string' ? (
          <Text style={styles.joinBtnText}>{btnLabel}</Text>
        ) : (
          btnLabel
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
    maxHeight: '80%',
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.primary },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyCta: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
  emptyCtaText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  rowName: { fontSize: 14, fontWeight: '800', color: colors.primary },
  rowHandle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  mineBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  mineBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  genderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: '#7C3AED18',
    borderRadius: radius.full,
  },
  genderBadgeText: {
    color: '#7C3AED',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rowNote: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    lineHeight: 16,
  },
  rowMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    minWidth: 76,
    justifyContent: 'center',
  },
  joinBtnDanger: { backgroundColor: colors.error },
  joinBtnJoined: { backgroundColor: colors.success },
  joinBtnPending: { backgroundColor: '#F59E0B' },
  joinBtnDisabled: { backgroundColor: colors.textSecondary, opacity: 0.6 },
  joinBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
