import { Cafe } from "../../types";

export const TEARDROP_PATH =
  "M12 0C5.37 0 0 5.37 0 12C0 18 12 28 12 28C12 28 24 18 24 12C24 5.37 18.63 0 12 0Z";

export function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function isNewCafePromo(cafe: Cafe): boolean {
  return cafe.activePromotionType === "new_cafe" || cafe.promotionType === "A";
}
