import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  fetchFriendsList, fetchPendingRequests, sendFriendRequest,
  acceptFriendRequest, rejectFriendRequest,
} from '../services/api';
import { colors, spacing, radius } from '../theme';

export default function FriendsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [tab, setTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [friendCode, setFriendCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    const code = (user as any)?.friendCode;
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

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
      Alert.alert('Berhasil!', 'Permintaan pertemanan terkirim');
      setFriendCode('');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Gagal mengirim permintaan');
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
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Teman</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* My friend code */}
      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>Kode Pertemanan Kamu</Text>
        <Text style={styles.codeText}>{(user as any)?.friendCode || '—'}</Text>
        <TouchableOpacity
          style={[styles.copyBtn, copied && styles.copyBtnDone]}
          onPress={handleCopyCode}
          disabled={!(user as any)?.friendCode}
          activeOpacity={0.7}
        >
          <Text style={styles.copyBtnText}>{copied ? '✓ Tersalin' : '📋 Salin Kode'}</Text>
        </TouchableOpacity>
        <Text style={styles.codeHint}>Bagikan kode ini ke teman kamu</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['friends', 'requests', 'add'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'friends' ? `Teman (${friends.length})` : t === 'requests' ? `Permintaan (${requests.length})` : '+ Tambah'}
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
          ListEmptyComponent={<Text style={styles.emptyText}>Belum punya teman. Tambahkan lewat kode!</Text>}
          renderItem={({ item }) => (
            <View style={styles.friendRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.friendName}>{item.name}</Text>
                <Text style={styles.friendCode}>{item.friendCode}</Text>
              </View>
            </View>
          )}
        />
      ) : tab === 'requests' ? (
        <FlatList
          data={requests}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada permintaan masuk</Text>}
          renderItem={({ item }) => (
            <View style={styles.friendRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.sender?.name?.[0] || '?'}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.friendName}>{item.sender?.name || 'Unknown'}</Text>
              </View>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                <Text style={styles.acceptText}>Terima</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
                <Text style={styles.rejectText}>Tolak</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <View style={styles.addSection}>
          <Text style={styles.addLabel}>Masukkan kode teman</Text>
          <TextInput
            style={styles.addInput}
            placeholder="Contoh: AB12CD34"
            placeholderTextColor={colors.textSecondary}
            value={friendCode}
            onChangeText={(t) => setFriendCode(t.toUpperCase())}
            maxLength={8}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleSendRequest} disabled={sending}>
            <Text style={styles.addBtnText}>{sending ? 'Mengirim...' : 'Kirim Permintaan'}</Text>
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
  copyBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  copyBtnDone: { backgroundColor: colors.success },
  copyBtnText: { color: colors.white, fontSize: 13, fontWeight: '700' },
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
