import type { LucideIcon as LucideIconType } from "lucide-react";
import { WIZARD_PURPOSES } from "../../constants/purposes";
import type { Facility } from "../../types/wizard";
import {
  Armchair,
  Baby,
  Building2,
  Leaf,
  Plug,
  SquareParking,
  VolumeX,
  Wifi,
} from "../../utils/lucideIcon";

// Re-export from single source of truth (constants/purposes.ts).
// Kept as alias so wizard code keeps importing from wizardData for convenience.
export const PURPOSES = WIZARD_PURPOSES;

export const DESTINATION_SUGGESTIONS: {
  label: string;
  sublabel: string;
  latitude: number;
  longitude: number;
}[] = [
  { label: "Dago", sublabel: "Bandung", latitude: -6.88, longitude: 107.61 },
  {
    label: "Tebet",
    sublabel: "Jakarta Selatan",
    latitude: -6.2241,
    longitude: 106.8446,
  },
  {
    label: "Bandung",
    sublabel: "Kota Bandung",
    latitude: -6.9175,
    longitude: 107.6191,
  },
  {
    label: "Jakarta Selatan",
    sublabel: "DKI Jakarta",
    latitude: -6.2615,
    longitude: 106.8106,
  },
];

export const AMENITIES: { label: Facility; icon: LucideIconType }[] = [
  { label: "WiFi", icon: Wifi },
  { label: "Power Outlet", icon: Plug },
  { label: "Mushola", icon: Building2 },
  { label: "Parking", icon: SquareParking },
  { label: "Kid-Friendly", icon: Baby },
  { label: "Quiet Atmosphere", icon: VolumeX },
  { label: "Large Tables", icon: Armchair },
  { label: "Outdoor Area", icon: Leaf },
];

export const RADIUS_OPTIONS = [0.5, 1, 2];
export const TOTAL_STEPS = 4;
