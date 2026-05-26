import { useState } from "react";
import PlacesAutocompleteInput from "./PlacesAutocompleteInput";
import { MapPin, Search } from "../../utils/lucideIcon";

interface Props {
  lat: number | null;
  lng: number | null;
  userLat: number | null;
  userLng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}

export default function StepLocation({
  lat,
  userLat,
  userLng,
  onChange,
}: Props) {
  const [mode, setMode] = useState<"current" | "custom">(
    lat !== null && lat !== userLat ? "custom" : "current",
  );

  const selectCurrent = () => {
    setMode("current");
    onChange(userLat, userLng);
  };

  const selectCustom = () => {
    setMode("custom");
    onChange(null, null);
  };

  const handlePlaceSelect = (selLat: number, selLng: number) => {
    onChange(selLat, selLng);
  };

  return (
    <div className="w-full px-6 pt-8">
      <h2 className="text-3xl font-bold text-[#1C1C1A] mb-1">
        Mau ngopi di mana?
      </h2>
      <p className="text-base text-[#8A8880] mb-6">
        Kita cariin kafe terdekat buat kamu
      </p>

      <div className="inline-flex p-1 bg-[#F0EDE8] rounded-full mb-4">
        <button
          type="button"
          onClick={selectCurrent}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            mode === "current"
              ? "bg-white text-[#D48B3A] shadow-sm"
              : "text-[#8A8880] hover:text-[#1C1C1A]"
          }`}
        >
          <MapPin size={14} strokeWidth={2} /> Lokasi sekarang
        </button>
        <button
          type="button"
          onClick={selectCustom}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            mode === "custom"
              ? "bg-white text-[#D48B3A] shadow-sm"
              : "text-[#8A8880] hover:text-[#1C1C1A]"
          }`}
        >
          <Search size={14} strokeWidth={2} /> Cari alamat
        </button>
      </div>
      {mode === "custom" && (
        <PlacesAutocompleteInput onSelect={handlePlaceSelect} />
      )}
    </div>
  );
}
