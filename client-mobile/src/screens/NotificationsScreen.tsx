import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';
import { AppNotification } from '../types';
import { colors, spacing, radius } from '../theme';

const TYPE_ICONS: Record<string, string> = {
  rank_change: '🏆',
  friend_request: '👋',
  friend_nearby: '📍',
  friend_same_cafe: '🎉',
  achievement_unlocked: '⭐',
  together_bomb: '💥',
  emoji_spam: '😜',
};

// A grouped notification item — either a single notif or a bundle of emoji_spam
// from the same sender, collapsed into one row with a count.
type GroupedItem =
  | { kind: 'single'; notif: AppNotification }
  | {
      kind: 'emoji_group';
      senderId: number;
      senderName: string;
      items: AppNotification[];
      latest: AppNotification;
      emojis: string[];
      totalCount: number;
    };

function groupEmojiSpam(notifs: AppNotification[]): GroupedItem[] {
  const result: GroupedItem[] = [];
  const emojiBySender = new Map<number, AppNotification[]>();

  // Collect emoji_spam by senderId
  for (const n of notifs) {
    if (n.type === 'emoji_spam' && n.data?.senderId != null) {
      const key = Number(n.data.senderId);
      if (!emojiBySender.has(key)) emojiBySender.set(key, []);
      emojiBySender.get(key)!.push(n);
    }
  }

  // Track which emoji_spam IDs are consumed by a group
  const grouped = new Set<number>();
  for (const items of emojiBySender.values()) {
    if (items.length > 1) {
      for (const i of items) grouped.add(Number(i.id));
    }
  }

  // Walk notifs once, emitting singles for non-grouped items and one group per sender
  const emittedGroups = new Set<number>();
  for (const n of notifs) {
    if (n.type === 'emoji_spam' && grouped.has(Number(n.id))) {
      const senderId = Number(n.data.senderId);
      if (emittedGroups.has(senderId)) continue;
      emittedGroups.add(senderId);
      const items = emojiBySender.get(senderId)!;
      const latest = items[0];
      result.push({
        kind: 'emoji_group',
        senderId,
        senderName: latest.data?.senderName || 'Seorang teman',
        items,
        latest,
        emojis: items.map((i) => i.data?.emoji || '').filter(Boolean),
        totalCount: items.length,
      });
    } else {
      result.push({ kind: 'single', notif: n });
    }
  }
  return result;
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [emojiGroupDetail, setEmojiGroupDetail] = useState<Extract<GroupedItem, { kind: 'emoji_group' }> | null>(null);

  useEffect(() => {
    fetchNotifications()
      .then((res) => setNotifications(res.data || res))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => groupEmojiSpam(notifications), [notifications]);

  const markItemsRead = async (items: AppNotification[]) => {
    const unread = items.filter((i) => !i.isRead);
    for (const i of unread) {
      try { await markNotificationRead(i.id); } catch {}
    }
    setNotifications((prev) =>
      prev.map((n) => (items.some((i) => i.id === n.id) ? { ...n, isRead: true } : n)),
    );
  };

  const handleTap = async (item: GroupedItem) => {
    if (item.kind === 'emoji_group') {
      setEmojiGroupDetail(item);
      await markItemsRead(item.items);
    } else {
      if (!item.notif.isRead) {
        try { await markNotificationRead(item.notif.id); } catch {}
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.notif.id ? { ...n, isRead: true } : n)),
        );
      }
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifikasi</Text>
        <TouchableOpacity onPress={handleMarkAll}>
          <Text style={styles.readAll}>Baca semua</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 60 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>Belum ada notifikasi</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) =>
            item.kind === 'single'
              ? 'single-' + item.notif.id
              : 'group-' + item.senderId
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => {
            if (item.kind === 'emoji_group') {
              const anyUnread = item.items.some((i) => !i.isRead);
              const latestEmojis = item.emojis.slice(0, 3).join(' ');
              return (
                <TouchableOpacity
                  style={[styles.row, anyUnread && styles.rowUnread]}
                  onPress={() => handleTap(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.icon}>😜</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {item.senderName} mengirim {item.totalCount} emoji
                    </Text>
                    <Text style={styles.rowBody} numberOfLines={1}>
                      {latestEmojis}
                      {item.totalCount > 3 ? ` +${item.totalCount - 3} lagi` : ''}
                    </Text>
                    <Text style={styles.rowTime}>
                      Tap untuk lihat detail
                    </Text>
                  </View>
                  {anyUnread && <View style={styles.dot} />}
                </TouchableOpacity>
              );
            }
            const n = item.notif;
            return (
              <TouchableOpacity
                style={[styles.row, !n.isRead && styles.rowUnread]}
                onPress={() => handleTap(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.icon}>{TYPE_ICONS[n.type] || '📌'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{n.title}</Text>
                  <Text style={styles.rowBody} numberOfLines={2}>{n.body}</Text>
                  <Text style={styles.rowTime}>
                    {new Date(n.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {!n.isRead && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Emoji group detail modal */}
      <Modal
        visible={!!emojiGroupDetail}
        transparent
        animationType="fade"
        onRequestClose={() => setEmojiGroupDetail(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setEmojiGroupDetail(null)}
        >
          <TouchableOpacity style={styles.modalBox} activeOpacity={1}>
            {emojiGroupDetail && (
              <>
                <Text style={styles.modalTitle}>
                  {emojiGroupDetail.totalCount} emoji dari{' '}
                  {emojiGroupDetail.senderName}
                </Text>
                <View style={styles.emojiWall}>
                  {emojiGroupDetail.emojis.map((e, i) => (
                    <Text key={i} style={styles.emojiWallItem}>{e}</Text>
                  ))}
                </View>
                <Text style={styles.modalSubtitle}>
                  Mulai dari{' '}
                  {new Date(
                    emojiGroupDetail.items[emojiGroupDetail.items.length - 1].createdAt,
                  ).toLocaleString('id-ID', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setEmojiGroupDetail(null)}
                >
                  <Text style={styles.modalCloseText}>Tutup</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surface,
    backgroundColor: colors.white,
  },
  back: { fontSize: 15, color: colors.accent, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: colors.primary },
  readAll: { fontSize: 13, color: colors.accent, fontWeight: '600' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { fontSize: 16, color: colors.textSecondary },

  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
  },
  rowUnread: { backgroundColor: colors.accent + '08' },
  icon: { fontSize: 28, marginRight: spacing.sm },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  rowBody: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  rowTime: { fontSize: 11, color: colors.textSecondary + '80', marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginLeft: spacing.sm },

  // Emoji group detail modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    minWidth: 300,
    maxWidth: '90%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emojiWall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    maxWidth: 260,
  },
  emojiWallItem: {
    fontSize: 30,
  },
  modalCloseBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
  },
  modalCloseText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
