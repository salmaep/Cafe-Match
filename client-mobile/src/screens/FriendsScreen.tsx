import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { notificationsText, socialText } from '@shared/i18n/keys';
import { useAuth } from '../context/AuthContext';
import {
  fetchFriendsList, fetchPendingRequests, sendFriendRequest,
  acceptFriendRequest, rejectFriendRequest,
} from '../services/api';
import { colors, spacing, radius } from '../theme';

export default function FriendsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [tab, setTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [friendCode, setFriendCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [f, r] = await Promise.all([fetchFriendsList(), fetchPendingRequests()]);
      setFriends(f);
      setRequests(r);
    } catch {}
    setLoading(false);
  };

  const handleSendRequest = async () => {
    if (!friendCode.trim()) return;
    setSending(true);
    try {
      await sendFriendRequest(friendCode.trim().toUpperCase());
      Alert.alert(t(socialText.successTitle), t(socialText.friendRequestSent));
      setFriendCode('');
    } catch (err: any) {
      Alert.alert(t(socialText.errorTitle), err?.response?.data?.message || t(socialText.friendRequestFailed));
    }
    setSending(false);
  };

  const handleAccept = async (id: number) => {
    try {
      await acceptFriendRequest(id);
      await loadData();
    } catch {}
  };

  const handleReject = async (id: number) => {
    try {
      await rejectFriendRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{t(notificationsText.back)}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t(socialText.friendsTitle)}</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* My friend code */}
      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>{t(socialText.yourFriendCode)}</Text>
        <Text style={styles.codeText}>{(user as any)?.friendCode || '—'}</Text>
        <Text style={styles.codeHint}>{t(socialText.shareCodeHint)}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['friends', 'requests', 'add'] as const).map((tabKey) => (
          <TouchableOpacity key={tabKey} style={[styles.tab, tab === tabKey && styles.tabActive]} onPress={() => setTab(tabKey)}>
            <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
              {tabKey === 'friends'
                ? t(socialText.tabFriends, { count: friends.length })
                : tabKey === 'requests'
                  ? t(socialText.tabRequests, { count: requests.length })
                  : t(socialText.tabAdd)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : tab === 'friends' ? (
        <FlatList
          data={friends}
          keyExtractor={(f) => String(f.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>{t(socialText.noFriendsYet)}</Text>}
          renderItem={({ item }) => {
            const displayName = (item.name || '').trim() || 'Unknown';
            const code = item.friendCode || '';
            return (
              <View style={styles.friendRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{displayName[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.friendName} numberOfLines={1}>{displayName}</Text>
                  {!!code && (
                    <Text style={styles.friendCode} numberOfLines={1}>🔖 {code}</Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      ) : tab === 'requests' ? (
        <FlatList
          data={requests}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>{t(socialText.noPendingRequests)}</Text>}
          renderItem={({ item }) => {
            // Defensive: server returns the full FriendRequest with `sender`
            // populated, but if the join ever drops it we still want a
            // readable row instead of an empty card with just "?". Fall back
            // to senderId / friendCode so the user knows *something* about
            // who's asking.
            const senderName = (item.sender?.name || '').trim();
            const senderCode = item.sender?.friendCode || '';
            const displayName =
              senderName ||
              senderCode ||
              (item.senderId ? `User #${item.senderId}` : 'Unknown');
            return (
              <View style={styles.friendRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{displayName[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.friendName} numberOfLines={1}>{displayName}</Text>
                  {!!senderCode && senderName && (
                    <Text style={styles.friendCode} numberOfLines={1}>🔖 {senderCode}</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                  <Text style={styles.acceptText}>{t(socialText.accept)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
                  <Text style={styles.rejectText}>{t(socialText.reject)}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      ) : (
        <View style={styles.addSection}>
          <Text style={styles.addLabel}>{t(socialText.addByCode)}</Text>
          <TextInput
            style={styles.addInput}
            placeholder={t(socialText.codePlaceholder)}
            placeholderTextColor={colors.textSecondary}
            value={friendCode}
            onChangeText={(val) => setFriendCode(val.toUpperCase())}
            maxLength={8}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleSendRequest} disabled={sending}>
            <Text style={styles.addBtnText}>{sending ? t(socialText.sending) : t(socialText.sendRequest)}</Text>
          </TouchableOpacity>
        </View>
      )}
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

  codeBox: {
    backgroundColor: colors.accent + '12', margin: spacing.md, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.accent + '30',
  },
  codeLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  codeText: { fontSize: 28, fontWeight: '900', color: colors.accent, letterSpacing: 4, marginVertical: spacing.xs },
  codeHint: { fontSize: 11, color: colors.textSecondary },

  tabs: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.xs, marginBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.full, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.white },

  list: { padding: spacing.md, paddingBottom: 40 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, fontSize: 14, marginTop: 40 },

  friendRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, elevation: 1,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  avatarText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  friendName: { fontSize: 15, fontWeight: '700', color: colors.primary },
  friendCode: { fontSize: 12, color: colors.textSecondary },
  acceptBtn: { backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
  acceptText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  rejectBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 6 },
  rejectText: { color: colors.error, fontWeight: '600', fontSize: 12 },

  addSection: { padding: spacing.lg },
  addLabel: { fontSize: 15, fontWeight: '600', color: colors.primary, marginBottom: spacing.sm },
  addInput: {
    backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md,
    fontSize: 22, fontWeight: '700', color: colors.primary, textAlign: 'center',
    letterSpacing: 6, borderWidth: 1, borderColor: colors.surface,
  },
  addBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  addBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
