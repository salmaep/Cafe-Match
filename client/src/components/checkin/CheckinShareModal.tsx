import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import type { Cafe } from "../../types";
import type { Checkin } from "../../api/checkins.api";
import { getCafeImage } from "../../utils/cafeImage";
import { Download, MapPin, Share2, X } from "../../utils/lucideIcon";

interface Props {
  cafe: Cafe;
  checkin: Checkin;
  onClose: () => void;
}

/**
 * Post-check-in "screenshot" popup: a branded share card (cafe photo + cafe
 * name + user's name/@username + date + Geser branding) exportable as PNG via
 * html-to-image. Sharing is optional — download & close are always available.
 *
 * The cafe photo is pre-fetched to a data URL so the exported canvas is never
 * CORS-tainted; if the fetch fails (expired/blocked Google photo URL) the card
 * falls back to a branded gradient background.
 */
export default function CheckinShareModal({ cafe, checkin, onClose }: Props) {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(getCafeImage(cafe), { mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (!cancelled) setPhotoDataUrl(dataUrl);
      } catch {
        // CORS-blocked or expired photo → gradient fallback
      } finally {
        if (!cancelled) setPhotoReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cafe]);

  const dateLabel = new Date(checkin.checkInAt || Date.now()).toLocaleDateString(
    "id-ID",
    { day: "numeric", month: "long", year: "numeric" },
  );

  const exportPng = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        skipFonts: true, // webfont embedding is slow/flaky; system fallback is fine on the PNG
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch {
      toast.error("Gagal membuat gambar, coba lagi ya.");
      return null;
    }
  };

  const download = async () => {
    if (exporting) return;
    setExporting(true);
    const blob = await exportPng();
    setExporting(false);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geser-checkin-${cafe.slug ?? cafe.id}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    if (exporting) return;
    setExporting(true);
    const blob = await exportPng();
    setExporting(false);
    if (!blob) return;
    const file = new File([blob], "geser-checkin.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Check in di ${cafe.name}`,
          text: `Lagi nongkrong di ${cafe.name} — ketemu di Geser! geser.id`,
        });
        return;
      } catch {
        // user canceled the share sheet — nothing to do
        return;
      }
    }
    // No Web Share Level 2 (desktop browsers) → download instead
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "geser-checkin.png";
    a.click();
    URL.revokeObjectURL(url);
    toast.info("Gambar tersimpan — share ke sosmed ya!");
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-4 max-h-full overflow-y-auto py-2">
        {/* The exported "screenshot" card */}
        <div
          ref={cardRef}
          className="w-[320px] aspect-[4/5] rounded-2xl overflow-hidden relative shadow-2xl bg-gradient-to-br from-[#1C1C1A] via-[#3a2d1e] to-[#D48B3A] shrink-0"
        >
          {!photoReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {photoDataUrl && (
            <img
              src={photoDataUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Legibility gradient over photo/background */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30" />

          {/* Top: brand */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <span className="text-white font-extrabold text-lg tracking-tight drop-shadow">
              Geser<span className="text-[#F2B36B]">.</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[11px] font-bold">
              <MapPin size={11} strokeWidth={2.5} /> CHECK-IN
            </span>
          </div>

          {/* Bottom: cafe + user */}
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <p className="text-[11px] uppercase tracking-widest text-white/70 font-semibold mb-1">
              {dateLabel}
            </p>
            <h3 className="text-2xl font-extrabold leading-tight drop-shadow mb-3">
              {cafe.name}
            </h3>
            <div className="flex items-center gap-2.5 border-t border-white/20 pt-3">
              <span className="w-9 h-9 rounded-full bg-[#D48B3A] text-white flex items-center justify-center text-sm font-extrabold shrink-0">
                {(user?.name || "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{user?.name}</p>
                <p className="text-[11px] text-white/70 truncate">
                  {user?.username ? `@${user.username}` : "geser.id"}
                </p>
              </div>
              <span className="ml-auto text-[10px] text-white/60 font-semibold">
                geser.id
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={share}
            disabled={exporting || !photoReady}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D48B3A] text-white font-bold text-sm hover:bg-[#B97726] transition-colors disabled:opacity-60"
          >
            <Share2 size={15} strokeWidth={2} /> Bagikan
          </button>
          <button
            type="button"
            onClick={download}
            disabled={exporting || !photoReady}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1C1C1A] font-bold text-sm hover:bg-[#F0EDE8] transition-colors disabled:opacity-60"
          >
            <Download size={15} strokeWidth={2} /> Simpan Gambar
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
