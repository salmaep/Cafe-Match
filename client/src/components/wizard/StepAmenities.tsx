import FilterPanel from '../search/FilterPanel';

interface Props {
  facilities: string[];
  onFacilitiesChange: (next: string[]) => void;
  priceRange: string;
  onPriceRangeChange: (next: string) => void;
}

export default function StepAmenities({
  facilities,
  onFacilitiesChange,
  priceRange,
  onPriceRangeChange,
}: Props) {
  return (
    <div className="w-full px-6 pt-6 pb-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1C1A] mb-1">
        Anything specific you need?
      </h2>
      <p className="text-sm sm:text-base text-[#8A8880] mb-5">
        Pilih fasilitas atau biarkan kosong — kami tunjukkan semua
      </p>

      <FilterPanel
        variant="sidebar"
        facilities={facilities}
        onFacilitiesChange={onFacilitiesChange}
        priceRange={priceRange}
        onPriceRangeChange={onPriceRangeChange}
        hideHeader
      />
    </div>
  );
}
