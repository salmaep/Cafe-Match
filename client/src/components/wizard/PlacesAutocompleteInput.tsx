/* eslint-disable react-hooks/refs */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Check, MapPin } from "../../utils/lucideIcon";

interface Props {
  onSelect: (lat: number, lng: number, label: string) => void;
  placeholder?: string;
  country?: string;
}

interface Prediction {
  placeId: string;
  description: string;
}

export default function PlacesAutocompleteInput({
  onSelect,
  placeholder = "Cari alamat atau nama tempat…",
  country = "id",
}: Props) {
  const placesLib = useMapsLibrary("places");
  const [input, setInput] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );
  const placesServiceDivRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open || predictions.length === 0) return;
    const update = () => {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const spaceBelow = vh - r.bottom - 16;
      const maxHeight = Math.max(140, Math.min(320, spaceBelow));
      setDropdownRect({
        left: r.left,
        top: r.bottom + 4,
        width: r.width,
        maxHeight,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, predictions.length]);

  const autocompleteService = useMemo(() => {
    if (!placesLib) return null;
    return new placesLib.AutocompleteService();
  }, [placesLib]);

  const placesService = useMemo(() => {
    if (!placesLib) return null;
    if (!placesServiceDivRef.current) {
      placesServiceDivRef.current = document.createElement("div");
    }
    return new placesLib.PlacesService(placesServiceDivRef.current);
  }, [placesLib]);

  useEffect(() => {
    if (!placesLib) return;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }
  }, [placesLib]);

  const fetchPredictions = (value: string) => {
    if (!autocompleteService || !value.trim()) {
      setPredictions([]);
      return;
    }
    autocompleteService.getPlacePredictions(
      {
        input: value,
        sessionToken: sessionTokenRef.current ?? undefined,
        componentRestrictions: country ? { country } : undefined,
      },
      (results) => {
        if (!results) {
          setPredictions([]);
          return;
        }
        setPredictions(
          results.slice(0, 5).map((r) => ({
            placeId: r.place_id,
            description: r.description,
          })),
        );
      },
    );
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    setSelectedLabel(null);
    setOpen(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      fetchPredictions(value);
    }, 250);
  };

  const handlePick = (p: Prediction) => {
    if (!placesService) return;
    placesService.getDetails(
      {
        placeId: p.placeId,
        fields: ["geometry", "formatted_address", "name"],
        sessionToken: sessionTokenRef.current ?? undefined,
      },
      (place, status) => {
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !place?.geometry?.location
        ) {
          return;
        }
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const label = place.name || place.formatted_address || p.description;
        setInput(p.description);
        setSelectedLabel(label);
        setPredictions([]);
        setOpen(false);
        sessionTokenRef.current = placesLib
          ? new placesLib.AutocompleteSessionToken()
          : null;
        onSelect(lat, lng, label);
      },
    );
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full bg-[#F0EDE8] rounded-xl px-4 py-3 text-base text-[#1C1C1A] outline-none focus:ring-2 focus:ring-[#D48B3A] placeholder:text-[#8A8880]"
      />
      {open &&
        predictions.length > 0 &&
        dropdownRect &&
        createPortal(
          <ul
            style={{
              position: "fixed",
              left: dropdownRect.left,
              top: dropdownRect.top,
              width: dropdownRect.width,
              maxHeight: dropdownRect.maxHeight,
              zIndex: 9999,
            }}
            className="bg-white border border-[#E8E4DD] rounded-xl shadow-lg overflow-y-auto"
          >
            {predictions.map((p) => (
              <li key={p.placeId}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(p)}
                  className="w-full text-left px-4 py-3 text-sm text-[#1C1C1A] hover:bg-[#FDF6EC] border-b border-[#F0EDE8] last:border-b-0 inline-flex items-center gap-2"
                >
                  <MapPin size={14} strokeWidth={2} className="text-[#D48B3A]" />{" "}
                  {p.description}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
      {selectedLabel && (
        <p className="text-xs font-semibold text-[#2F8F4E] mt-2 inline-flex items-center gap-1.5">
          <Check size={12} strokeWidth={2.5} /> {selectedLabel}
        </p>
      )}
      {!placesLib && (
        <p className="text-xs text-[#8A8880] mt-2">Loading Google Places…</p>
      )}
    </div>
  );
}
