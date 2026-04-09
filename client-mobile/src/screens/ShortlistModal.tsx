import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useShortlist } from '../context/ShortlistContext';
import { Cafe } from '../types';
import { colors, spacing, radius } from '../theme';

export default function ShortlistModal() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { shortlist, removeFromShortlist } = useShortlist();

  const openDetail = (cafe: Cafe) => {
    navigation.navigate('CafeDetail', { cafe });
  };

  return (
    <View style={styles.container}>
      {/* Handle bar */}
      <View style={styles.handleBar} />

      <View style={styles.header}>
        <Text style={styles.title}>Shortlist</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtn}>Close</Text>
        </TouchableOpacity>
      </View>

      {shortlist.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>☕</Text>
          <Text style={styles.emptyTitle}>No cafes saved yet</Text>
          <Text style={styles.emptySubtitle}>Swipe to save!</Text>
        </View>
      ) : (
        <FlatList
          data={shortlist}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => openDetail(item)}>
              <Image source={{ uri: item.photos[0] }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemDistance}>{item.distance} km away</Text>
                <View style={styles.itemTags}>
                  {item.purposes.slice(0, 2).map((p) => (
                    <View key={p} style={styles.itemTag}>
                      <Text style={styles.itemTagText}>{p}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeFromShortlist(item.id)}
              >
                <Text style={styles.removeIcon}>×</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.primary },
  closeBtn: { fontSize: 15, color: colors.accent, fontWeight: '600' },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  item: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  itemImage: { width: 80, height: 80, resizeMode: 'cover' },
  itemInfo: { flex: 1, padding: spacing.sm, justifyContent: 'center' },
  itemName: { fontSize: 15, fontWeight: '700', color: colors.primary },
  itemDistance: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  itemTags: { flexDirection: 'row', gap: 4, marginTop: spacing.xs },
  itemTag: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemTagText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  removeBtn: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  removeIcon: { fontSize: 22, color: colors.textSecondary },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
});
