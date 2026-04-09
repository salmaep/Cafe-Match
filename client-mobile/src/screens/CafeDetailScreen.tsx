import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Linking,
  ActivityIndicator,
  Modal,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useShortlist } from '../context/ShortlistContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { toggleBookmark, toggleFavorite, trackAnalytics, fetchCafeDetail } from '../services/api';
import { haversineKm } from '../services/api';
import { Cafe } from '../types';
import { colors, spacing, radius } from '../theme';

const { width, height } = Dimensions.get('window');

const FACILITY_ICONS: Record<string, string> = {
  WiFi: '📶',
  'Power Outlet': '🔌',
  Mushola: '🕌',
  Parking: '🅿️',
  'Kid-Friendly': '👶',
  'Quiet Atmosphere': '🤫',
  'Large Tables': '🪑',
  'Outdoor Area': '🌿',
};

type RouteParams = { CafeDetail: { cafe: Cafe } };

export default function CafeDetailScreen() {
  const route = useRoute<RouteProp<RouteParams, 'CafeDetail'>>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { cafe: initialCafe } = route.params;
  const { addToShortlist, removeFromShortlist, isInShortlist } = useShortlist();
  const { user } = useAuth();
  const { latitude: userLat, longitude: userLng } = useLocation();

  // Fix 7: Start with nav param data, then enrich with full backend detail
  const [cafe, setCafe] = useState<Cafe>(initialCafe);
  const [detailLoading, setDetailLoading] = useState(
    !initialCafe.menu?.length || !initialCafe.facilities?.length,
  );
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const inShortlist = isInShortlist(cafe.id);

  // Fullscreen photo zoom modal
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoomListRef = useRef<FlatList<string>>(null);

  const openZoom = (index: number) => {
    setZoomIndex(index);
    setZoomVisible(true);
  };

  const closeZoom = () => setZoomVisible(false);

  useEffect(() => {
    // Always fetch full detail to get complete menu, facilities, photos
    fetchCafeDetail(initialCafe.id).then((full) => {
      if (full) setCafe(full);
    }).finally(() => setDetailLoading(false));
    trackAnalytics(initialCafe.id, 'view');
  }, [initialCafe.id]);

  const realDistance = haversineKm(userLat, userLng, cafe.latitude, cafe.longitude);

  const openMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${cafe.latitude},${cafe.longitude}`;
    Linking.openURL(url);
  };

  const handleFavorite = async () => {
    if (!user) {
      navigation.navigate('AuthModal');
      return;
    }
    try {
      const result = await toggleFavorite(cafe.id);
      setIsFavorited(result);
    } catch {
      setIsFavorited(!isFavorited);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      navigation.navigate('AuthModal');
      return;
    }
    try {
      const result = await toggleBookmark(cafe.id);
      setIsBookmarked(result);
    } catch {
      setIsBookmarked(!isBookmarked);
    }
  };

  const handleShortlist = () => {
    if (inShortlist) {
      removeFromShortlist(cafe.id);
    } else {
      addToShortlist(cafe);
    }
  };

  const formatPrice = (price: number) =>
    'Rp ' + price.toLocaleString('id-ID');

  return (
    <View style={styles.container}>
      {detailLoading && (
        <View style={styles.detailLoadingBar}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            data={cafe.photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentPhoto(idx);
            }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => openZoom(index)}
              >
                <Image source={{ uri: item }} style={styles.photo} />
              </TouchableOpacity>
            )}
          />
          <View style={styles.photoDots}>
            {cafe.photos.map((_, i) => (
              <View key={i} style={[styles.photoDot, i === currentPhoto && styles.photoDotActive]} />
            ))}
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.photoCounter}>
            <Text style={styles.photoCounterText}>
              {currentPhoto + 1} / {cafe.photos.length}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.cafeName}>{cafe.name}</Text>
          <Text style={styles.distance}>{realDistance} km from your location</Text>

          {cafe.description ? (
            <Text style={styles.description}>{cafe.description}</Text>
          ) : null}

          <TouchableOpacity style={styles.addressRow} onPress={openMaps}>
            <Text style={styles.addressIcon}>📍</Text>
            <Text style={styles.addressText}>{cafe.address}</Text>
            <Text style={styles.openMaps}>Open in Maps →</Text>
          </TouchableOpacity>

          <View style={styles.tagsRow}>
            {cafe.purposes.map((p) => (
              <View key={p} style={styles.purposeTag}>
                <Text style={styles.purposeTagText}>{p}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Facilities</Text>
          <View style={styles.facilitiesRow}>
            {cafe.facilities.map((f) => (
              <View key={f} style={styles.facilityChip}>
                <Text style={styles.facilityIcon}>{FACILITY_ICONS[f] || '✓'}</Text>
                <Text style={styles.facilityLabel}>{f}</Text>
              </View>
            ))}
            {cafe.wifiAvailable && cafe.wifiSpeedMbps ? (
              <View style={styles.facilityChip}>
                <Text style={styles.facilityIcon}>⚡</Text>
                <Text style={styles.facilityLabel}>{cafe.wifiSpeedMbps} Mbps</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{cafe.favoritesCount}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{cafe.bookmarksCount}</Text>
              <Text style={styles.statLabel}>Bookmarks</Text>
            </View>
            {cafe.matchScore ? (
              <>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={[styles.statNumber, { color: colors.accent }]}>{cafe.matchScore}%</Text>
                  <Text style={styles.statLabel}>Match</Text>
                </View>
              </>
            ) : null}
          </View>

          {cafe.menu.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Menu</Text>
              {cafe.menu.map((category) => (
                <View key={category.category} style={styles.menuCategory}>
                  <Text style={styles.menuCategoryTitle}>{category.category}</Text>
                  {category.items.map((item) => (
                    <View key={item.name} style={styles.menuItem}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <Text style={styles.menuItemPrice}>{formatPrice(item.price)}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Fullscreen photo zoom modal */}
      <Modal
        visible={zoomVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={closeZoom}
        statusBarTranslucent
      >
        <StatusBar hidden />
        <View style={styles.zoomContainer}>
          <FlatList
            ref={zoomListRef}
            data={cafe.photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => 'zoom-' + i}
            initialScrollIndex={zoomIndex}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setZoomIndex(idx);
            }}
            renderItem={({ item }) => (
              <ScrollView
                style={{ width, height }}
                contentContainerStyle={styles.zoomScrollContent}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                pinchGestureEnabled
                centerContent
              >
                <Image source={{ uri: item }} style={styles.zoomImage} resizeMode="contain" />
              </ScrollView>
            )}
          />
          <TouchableOpacity style={styles.zoomCloseBtn} onPress={closeZoom} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.zoomCloseText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.zoomCounter}>
            <Text style={styles.zoomCounterText}>
              {zoomIndex + 1} / {cafe.photos.length}
            </Text>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleFavorite}>
          <Text style={styles.actionIcon}>{isFavorited ? '❤️' : '🤍'}</Text>
          <Text style={styles.actionLabel}>Favorite</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleBookmark}>
          <Text style={styles.actionIcon}>{isBookmarked ? '🔖' : '📑'}</Text>
          <Text style={styles.actionLabel}>Bookmark</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shortlistBtn, inShortlist && styles.shortlistBtnActive]}
          onPress={handleShortlist}
        >
          <Text style={styles.shortlistBtnText}>
            {inShortlist ? 'Added ✓' : 'Add to Shortlist'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  detailLoadingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    backgroundColor: colors.background,
    paddingVertical: 6,
    alignItems: 'center',
  },
  carouselContainer: { position: 'relative' },
  photo: { width, height: 280, resizeMode: 'cover' },
  photoDots: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  photoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  photoDotActive: { backgroundColor: colors.white, width: 20 },
  backBtn: {
    position: 'absolute',
    top: 48,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { fontSize: 20, color: colors.white },
  photoCounter: {
    position: 'absolute',
    top: 48,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 4,
  },
  photoCounterText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Zoom modal
  zoomContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  zoomScrollContent: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width,
    height: height * 0.85,
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 48,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  zoomCloseText: { color: colors.white, fontSize: 22, fontWeight: '700' },
  zoomCounter: {
    position: 'absolute',
    top: 52,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  zoomCounterText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  content: { padding: spacing.lg },
  cafeName: { fontSize: 24, fontWeight: '700', color: colors.primary },
  distance: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexWrap: 'wrap',
  },
  addressIcon: { fontSize: 16, marginRight: spacing.xs },
  addressText: { fontSize: 14, color: colors.primary, flex: 1 },
  openMaps: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  purposeTag: {
    backgroundColor: '#FDF6EC',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  purposeTagText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  facilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  facilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  facilityIcon: { fontSize: 14, marginRight: spacing.xs },
  facilityLabel: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.textSecondary + '30' },
  menuCategory: { marginBottom: spacing.md },
  menuCategoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
  },
  menuItemName: { fontSize: 15, color: colors.primary },
  menuItemPrice: { fontSize: 15, color: colors.accent, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface,
    gap: spacing.sm,
  },
  actionBtn: { alignItems: 'center', paddingHorizontal: spacing.sm },
  actionIcon: { fontSize: 22 },
  actionLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  shortlistBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  shortlistBtnActive: { backgroundColor: colors.accent },
  shortlistBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
