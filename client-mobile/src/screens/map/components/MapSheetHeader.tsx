import React from "react";
import SelectedCafeCard from "./SelectedCafeCard";
import FeaturedSection from "./FeaturedSection";
import RadiusControls, { ActiveFilter } from "./RadiusControls";
import { Cafe } from "../../../types";

type Props = {
  selectedCafe: Cafe | null;
  onSelectedCafePress: (cafe: Cafe) => void;
  onSelectedCafeDismiss: () => void;
  featuredCafes: Cafe[];
  onFeaturedCafePress: (cafe: Cafe) => void;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  onOpenRadiusModal: () => void;
  activeFilters: ActiveFilter[];
  hasAnyFilter: boolean;
  onResetFilters: () => void;
};

function MapSheetHeader({
  selectedCafe,
  onSelectedCafePress,
  onSelectedCafeDismiss,
  featuredCafes,
  onFeaturedCafePress,
  radiusKm,
  onRadiusChange,
  onOpenRadiusModal,
  activeFilters,
  hasAnyFilter,
  onResetFilters,
}: Props) {
  return (
    <>
      {selectedCafe && (
        <SelectedCafeCard
          cafe={selectedCafe}
          onPress={() => onSelectedCafePress(selectedCafe)}
          onDismiss={onSelectedCafeDismiss}
        />
      )}
      <FeaturedSection
        cafes={featuredCafes}
        onCafePress={onFeaturedCafePress}
      />
      <RadiusControls
        radiusKm={radiusKm}
        onRadiusChange={onRadiusChange}
        onOpenRadiusModal={onOpenRadiusModal}
        activeFilters={activeFilters}
        hasAnyFilter={hasAnyFilter}
        onResetFilters={onResetFilters}
      />
    </>
  );
}

export default React.memo(MapSheetHeader);
