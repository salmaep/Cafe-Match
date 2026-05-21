import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { mapText } from "@shared/i18n/keys";
import CafePhoto from "../../../components/CafePhoto";
import SwipeableCard from "../../../components/SwipeableCard";
import { Cafe } from "../../../types";
import { colors, spacing, radius } from "../../../theme";

const { height } = Dimensions.get("window");

type Props = {
  visible: boolean;
  slideAnim: Animated.Value;
  results: Cafe[];
  isFetching: boolean;
  cardIndex: number;
  cardSize: { w: number; h: number };
  onCardSizeChange: (s: { w: number; h: number }) => void;
  onDismiss: (applyToMap: boolean) => void;
  onSwipeComplete: (dir: "left" | "right") => void;
  onTapCard: (cafe: Cafe) => void;
};

function renderCard(cafe: Cafe, t: (k: string) => string) {
  return (
    <View style={styles.card}>
      <CafePhoto photos={cafe.photos} name={cafe.name} style={styles.image} />
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {cafe.name}
          </Text>
          {cafe.promotionType === "A" && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>{t(mapText.newBadge)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.dist}>
          {cafe.distance} km · {cafe.address}
        </Text>
        <View style={styles.tags}>
          {cafe.purposes.slice(0, 3).map((p) => (
            <View key={p} style={styles.tag}>
              <Text style={styles.tagText}>{p}</Text>
            </View>
          ))}
        </View>
        <View style={styles.facilities}>
          {cafe.facilities.slice(0, 4).map((f) => (
            <Text key={f} style={styles.facility}>
              • {f}
            </Text>
          ))}
        </View>
        <View style={styles.hint}>
          <Text style={styles.hintText}>{t(mapText.swipeHint)}</Text>
        </View>
      </View>
    </View>
  );
}

function SearchPopup({
  visible,
  slideAnim,
  results,
  isFetching,
  cardIndex,
  cardSize,
  onCardSizeChange,
  onDismiss,
  onSwipeComplete,
  onTapCard,
}: Props) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.popup, { transform: [{ translateY: slideAnim }] }]}
    >
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => onDismiss(false)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 44 }}>
          <Text style={styles.title}>{t(mapText.aiSearchResults)}</Text>
          <Text style={styles.sub}>{t(mapText.cafesMatched, { count: results.length })}</Text>
        </View>
      </View>

      <View
        style={styles.swiperContainer}
        onLayout={(e) =>
          onCardSizeChange({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
      >
        {isFetching && results.length === 0 ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.emptyText, { marginTop: 16 }]}>
              {t(mapText.aiSearching)}
            </Text>
            <Text style={styles.hintLine}>
              {t(mapText.aiFirstSearchHint)}
            </Text>
          </View>
        ) : results.length > 0 && cardSize.w > 0 ? (
          <>
            {results[cardIndex + 1] && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: cardSize.w,
                  height: cardSize.h,
                }}
                pointerEvents="none"
              >
                {renderCard(results[cardIndex + 1], t)}
              </View>
            )}
            {results[cardIndex] && (
              <SwipeableCard
                key={`search-${cardIndex}`}
                top={0}
                left={0}
                width={cardSize.w}
                height={cardSize.h}
                leftLabel={t(mapText.swipeSkip)}
                rightLabel={t(mapText.swipeShortlist)}
                onTap={() => onTapCard(results[cardIndex])}
                onSwipeComplete={onSwipeComplete}
              >
                {renderCard(results[cardIndex], t)}
              </SwipeableCard>
            )}
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {t(mapText.noMatchSearch)}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.85,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    zIndex: 50,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  closeBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 10,
  },
  closeText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.primary },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  swiperContainer: { flex: 1, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    height: height * 0.54,
  },
  image: { width: "100%", height: "42%", resizeMode: "cover" },
  info: { flex: 1, padding: spacing.md },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  name: { fontSize: 18, fontWeight: "800", color: colors.primary, flex: 1 },
  newBadge: {
    backgroundColor: colors.newCafePin,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: { fontSize: 10, fontWeight: "800", color: colors.white },
  dist: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.sm,
  },
  tag: {
    backgroundColor: colors.accent + "18",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: { fontSize: 12, fontWeight: "600", color: colors.accent },
  facilities: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.sm,
  },
  facility: { fontSize: 12, color: colors.textSecondary },
  hint: {
    position: "absolute",
    bottom: spacing.md,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintText: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  emptyText: { fontSize: 16, color: colors.textSecondary, textAlign: "center" },
  hintLine: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
});

export default SearchPopup;
