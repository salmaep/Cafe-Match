import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { mapText } from "@shared/i18n/keys";
import { Cafe } from "../../../types";
import { colors, spacing } from "../../../theme";
import { isNewCafePromo } from "../utils";

type Props = {
  cafes: Cafe[];
  onCafePress: (cafe: Cafe) => void;
};

function FeaturedSection({ cafes, onCafePress }: Props) {
  const { t } = useTranslation();
  if (cafes.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t(mapText.todayPicks)}</Text>
      <GHScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        directionalLockEnabled
        decelerationRate="fast"
        contentContainerStyle={styles.scroll}
      >
        {cafes.map((cafe) => {
          const isNewCafe = isNewCafePromo(cafe);
          const promoImage =
            cafe.promotionContent?.promoPhoto ||
            cafe.newCafeContent?.promoPhoto ||
            cafe.promoPhoto ||
            cafe.photos?.[0] ||
            "";
          const promoTitle =
            cafe.promotionContent?.title ||
            (isNewCafe ? cafe.newCafeContent?.promoOffer : cafe.promoTitle) ||
            null;
          const description =
            cafe.promotionContent?.description ||
            cafe.newCafeContent?.highlightText ||
            cafe.promoDescription ||
            "";

          return (
            <TouchableOpacity
              key={cafe.id}
              activeOpacity={0.85}
              style={styles.card}
              onPress={() => onCafePress(cafe)}
            >
              <View style={styles.imageWrap}>
                <Image
                  source={{ uri: promoImage }}
                  style={styles.image}
                  cachePolicy="memory-disk"
                  transition={200}
                  contentFit="cover"
                />
                {isNewCafe && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>{t(mapText.newCafeTag)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {cafe.name}
                </Text>
                {!!promoTitle && (
                  <Text style={styles.promoTitle} numberOfLines={1}>
                    {promoTitle}
                  </Text>
                )}
                {!!description && (
                  <Text style={styles.promoDesc} numberOfLines={2}>
                    {description}
                  </Text>
                )}
                {!!cafe.address && (
                  <Text style={styles.address} numberOfLines={1}>
                    📍 {cafe.address}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </GHScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.sm },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  scroll: { paddingRight: spacing.md, gap: 12 },
  card: {
    width: 256,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FDE3B8",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  imageWrap: { position: "relative" },
  image: {
    width: "100%",
    height: 128,
    resizeMode: "cover",
    backgroundColor: "#F0EDE8",
  },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.newCafePin,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.4,
  },
  info: { padding: 12, gap: 2 },
  name: { fontSize: 14, fontWeight: "700", color: colors.primary },
  promoTitle: { fontSize: 12, fontWeight: "700", color: "#B45309" },
  promoDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  address: { fontSize: 11, color: "#A8A59C", marginTop: 4 },
});

export default FeaturedSection;
