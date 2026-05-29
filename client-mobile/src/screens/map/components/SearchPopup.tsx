import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Clock, MapPin, X } from "lucide-react-native";
import { mapText } from "@shared/i18n/keys";
import CafePhoto from "../../../components/CafePhoto";
import SwipeableCard from "../../../components/SwipeableCard";
import { Cafe } from "../../../types";
import { AutocompleteHit } from "../../../queries/cafes/types";
import { colors, spacing, radius } from "../../../theme";
import { cleanAddress } from "../../../utils/address";

const { height } = Dimensions.get("window");
const MIN_QUERY_LEN = 2;

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
  // Typeahead / recent / did-you-mean.
  query: string;
  searchActive: boolean;
  suggestions: AutocompleteHit[];
  suggestionsLoading: boolean;
  history: string[];
  didYouMean: string | null;
  onPickSuggestion: (hit: AutocompleteHit) => void;
  onPickRecent: (term: string) => void;
  onRemoveRecent: (term: string) => void;
  onClearRecent: () => void;
  onPickDidYouMean: (term: string) => void;
};

function suggestionMeta(hit: AutocompleteHit): string {
  const locality = cleanAddress(hit.district || hit.city || "");
  const distanceKm =
    hit.distanceMeters != null
      ? `${(hit.distanceMeters / 1000).toFixed(1)} km`
      : null;
  return [locality, distanceKm].filter(Boolean).join("  ·  ");
}

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
  query,
  searchActive,
  suggestions,
  suggestionsLoading,
  history,
  didYouMean,
  onPickSuggestion,
  onPickRecent,
  onRemoveRecent,
  onClearRecent,
  onPickDidYouMean,
}: Props) {
  const { t } = useTranslation();
  if (!visible) return null;

  const showSuggestions = query.trim().length >= MIN_QUERY_LEN;

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
        <X size={18} color={colors.primary} strokeWidth={2.5} />
      </TouchableOpacity>

      {!searchActive ? (
        // ── Typeahead / recent mode (before submit) ──
        showSuggestions ? (
          <View style={styles.listWrap}>
            <Text style={styles.sectionHeader}>
              {t(mapText.suggestionsHeader)}
            </Text>
            {suggestionsLoading && suggestions.length === 0 ? (
              <View style={styles.empty}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : suggestions.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{t(mapText.noSuggestions)}</Text>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                {suggestions.map((hit) => {
                  const meta = suggestionMeta(hit);
                  return (
                    <TouchableOpacity
                      key={hit.id}
                      style={styles.suggestRow}
                      onPress={() => onPickSuggestion(hit)}
                      activeOpacity={0.7}
                    >
                      <MapPin
                        size={18}
                        color={colors.accent}
                        strokeWidth={2}
                        style={styles.rowIcon}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestName} numberOfLines={1}>
                          {hit.name}
                        </Text>
                        {!!meta && (
                          <Text style={styles.suggestMeta} numberOfLines={1}>
                            {meta}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : history.length > 0 ? (
          <View style={styles.listWrap}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>{t(mapText.recentHeader)}</Text>
              <TouchableOpacity onPress={onClearRecent} hitSlop={8}>
                <Text style={styles.clearAll}>{t(mapText.clearAll)}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {history.map((term) => (
                <View key={term} style={styles.recentRow}>
                  <TouchableOpacity
                    style={styles.recentMain}
                    onPress={() => onPickRecent(term)}
                    activeOpacity={0.7}
                  >
                    <Clock
                      size={16}
                      color={colors.textSecondary}
                      strokeWidth={2}
                      style={styles.rowIcon}
                    />
                    <Text style={styles.recentText} numberOfLines={1}>
                      {term}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onRemoveRecent(term)}
                    hitSlop={8}
                  >
                    <X size={16} color={colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t(mapText.searchPrompt)}</Text>
          </View>
        )
      ) : (
        // ── Results carousel mode (after submit) ──
        <>
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 44 }}>
              <Text style={styles.title}>{t(mapText.searchResultsTitle)}</Text>
              <Text style={styles.sub}>
                {t(mapText.cafesMatched, { count: results.length })}
              </Text>
            </View>
          </View>

          {didYouMean && (
            <TouchableOpacity
              style={styles.didYouMean}
              onPress={() => onPickDidYouMean(didYouMean)}
              activeOpacity={0.8}
            >
              <Text style={styles.didYouMeanText}>
                {t(mapText.didYouMean)}{" "}
                <Text style={styles.didYouMeanTerm}>{didYouMean}</Text>?
              </Text>
            </TouchableOpacity>
          )}

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
                  {t(mapText.searching)}
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
                <Text style={styles.emptyText}>{t(mapText.noMatchSearch)}</Text>
              </View>
            )}
          </View>
        </>
      )}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.primary },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  swiperContainer: { flex: 1, marginBottom: spacing.sm },

  // Typeahead / recent list
  listWrap: { flex: 1, paddingTop: spacing.xs, paddingRight: 44 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  clearAll: { fontSize: 13, fontWeight: "700", color: colors.accent },
  rowIcon: { marginRight: spacing.sm },
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  suggestName: { fontSize: 15, fontWeight: "600", color: colors.primary },
  suggestMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  recentMain: { flex: 1, flexDirection: "row", alignItems: "center" },
  recentText: { fontSize: 15, color: colors.primary, flex: 1 },

  // Did-you-mean banner
  didYouMean: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  didYouMeanText: { fontSize: 14, color: colors.primary },
  didYouMeanTerm: { fontWeight: "800", color: colors.accent },

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
});

export default SearchPopup;
