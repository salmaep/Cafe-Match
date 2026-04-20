import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, AppState, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { fetchUnreadCount } from '../services/api';
import { colors, spacing, radius } from '../theme';

/**
 * Global in-app notification banner.
 * Polls the unread count every 30s when app is foregrounded.
 * Shows a drop-down banner when new notifications arrive.
 * Wrap this at the root level (inside NavigationContainer).
 */
export default function InAppNotificationBanner({ onTap }: { onTap?: () => void }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [lastUnread, setLastUnread] = useState(0);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = useCallback(
    (msg: string) => {
      setMessage(msg);
      setVisible(true);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
      // Auto-hide after 4s
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        Animated.timing(slideAnim, { toValue: -100, duration: 250, useNativeDriver: true }).start(() =>
          setVisible(false),
        );
      }, 4000);
    },
    [slideAnim],
  );

  // Poll unread count every 30s (only when app is active + user logged in)
  useEffect(() => {
    if (!user) return;

    const check = async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const count = await fetchUnreadCount();
        if (count > lastUnread && lastUnread > 0) {
          // New notifications arrived while app is open
          const diff = count - lastUnread;
          showBanner(`${diff} notifikasi baru`);
        }
        setLastUnread(count);
      } catch {}
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [user, lastUnread, showBanner]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity
        style={styles.bannerContent}
        activeOpacity={0.9}
        onPress={() => {
          setVisible(false);
          onTap?.();
        }}
      >
        <Text style={styles.bellIcon}>🔔</Text>
        <Text style={styles.bannerText} numberOfLines={1}>{message}</Text>
        <Text style={styles.tapHint}>Tap untuk buka</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    elevation: 30,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
  },
  bellIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  bannerText: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  tapHint: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
});
