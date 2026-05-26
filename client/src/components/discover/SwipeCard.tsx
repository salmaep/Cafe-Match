import { useNavigate } from "react-router-dom";
import type { Cafe } from "../../types";
import { getCafeImage, placeholderImage } from "../../utils/cafeImage";
import { cafeUrl } from "../../utils/cafeUrl";
import { getOpenStatus } from "../../utils/openingHours";
import { buildFacilityChips } from "../../utils/facilities";
import { formatRating } from "../../utils/rating";
import { cleanAddress } from "../../utils/address";
import { Clock, MapPin, Star } from "../../utils/lucideIcon";
import { LucideIcon, lucideForFacility } from "../../utils/lucideIcon";

interface Props {
  cafe: Cafe;
  className?: string;
  shortlisted?: boolean;
  dragX?: number;
  onSkip?: () => void;
  onKeep?: () => void;
}

const VISIBLE_TAGS = 4;

export default function SwipeCard({
  cafe,
  className,
  shortlisted,
  dragX = 0,
  onSkip,
  onKeep,
}: Props) {
  const navigate = useNavigate();
  const photo = getCafeImage(cafe);
  const distanceKm =
    cafe.distanceMeters != null
      ? (cafe.distanceMeters / 1000).toFixed(1)
      : null;
  const open = getOpenStatus(cafe.openingHours);
  const locality = cleanAddress(cafe.district || cafe.city || "");

  const allTags = buildFacilityChips(cafe);
  const visibleTags = allTags.slice(0, VISIBLE_TAGS);
  const extraTags = allTags.length - visibleTags.length;

  const stampKeep = Math.max(0, Math.min(1, dragX / 110));
  const stampSkip = Math.max(0, Math.min(1, -dragX / 110));

  const handleAction = (
    e: React.MouseEvent | React.PointerEvent,
    fn?: () => void,
  ) => {
    e.stopPropagation();
    fn?.();
  };

  return (
    <div
      onClick={() => navigate(cafeUrl(cafe))}
      className={`relative w-full mx-auto bg-[#2a2018] rounded-[24px] md:rounded-[28px] overflow-hidden cursor-pointer shadow-[0_2px_4px_rgba(40,28,16,.08),0_12px_32px_rgba(40,28,16,.18),0_32px_64px_rgba(40,28,16,.12)] ${className ?? "aspect-[3/4]"}`}
    >
      {/* Photo background */}
      <img
        src={photo}
        alt={cafe.name}
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
        }}
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 45%, rgba(0,0,0,.92) 100%)",
        }}
      />

      {/* Top chips + shortlisted badge */}
      <div className="absolute top-6 left-3 right-3 md:top-7 md:left-4 md:right-4 z-[4] flex flex-col gap-2 items-start">
        <div className="flex items-center gap-2 w-full">
          {formatRating(cafe.googleRating) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 text-[#1a1410] font-bold text-[13px] backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,.15)]">
              <Star
                size={13}
                strokeWidth={2}
                className="text-[#f5b820]"
                fill="currentColor"
              />
              {formatRating(cafe.googleRating)}
              {cafe.totalGoogleReviews != null && (
                <span className="font-semibold text-[#8a7a66]">
                  ({cafe.totalGoogleReviews.toLocaleString()})
                </span>
              )}
            </span>
          )}
          {open && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(20,14,10,.55)] text-white font-bold text-[13px] border border-white/[.18] backdrop-blur-sm">
              <span
                className="w-[7px] h-[7px] rounded-full"
                style={{
                  background: open.isOpen ? "#34d399" : "#ef4444",
                  boxShadow: `0 0 0 3px ${open.isOpen ? "rgba(52,211,153,.25)" : "rgba(239,68,68,.25)"}`,
                }}
              />
              {open.isOpen ? "Buka" : "Tutup"}
            </span>
          )}
          <span className="flex-1" />
          {distanceKm && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(20,14,10,.55)] text-white font-bold text-[13px] border border-white/[.18] backdrop-blur-sm whitespace-nowrap">
              <MapPin size={12} strokeWidth={2} /> {distanceKm} km
            </span>
          )}
        </div>
        {shortlisted && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#d97706] text-white font-bold text-[12px] shadow-[0_4px_12px_rgba(217,119,6,.45)]">
            <Star size={12} strokeWidth={2} fill="currentColor" />
            Sudah di shortlist
          </span>
        )}
      </div>

      {/* Drag stamps */}
      <div
        className="absolute top-5 right-4 z-6 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[12px] md:text-[13px] tracking-wide uppercase border-2 pointer-events-none"
        style={{
          color: "#ffb01a",
          background: "rgba(255,176,26,.08)",
          opacity: stampKeep,
          transform: `rotate(${12 - stampKeep * 4}deg) scale(${0.9 + stampKeep * 0.2})`,
          transition: "opacity .12s ease",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Simpan
      </div>
      <div
        className="absolute top-5 left-4 z-6 px-2.5 py-1 rounded-lg font-bold text-[12px] md:text-[13px] tracking-wide uppercase border-2 pointer-events-none"
        style={{
          color: "#ff5a4d",
          background: "rgba(255,90,77,.08)",
          opacity: stampSkip,
          transform: `rotate(${-12 + stampSkip * 4}deg) scale(${0.9 + stampSkip * 0.2})`,
          transition: "opacity .12s ease",
        }}
      >
        Lewati
      </div>

      {/* Drag tints */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(217,119,6,0) 0%, rgba(217,119,6,.55) 100%)",
          mixBlendMode: "screen",
          opacity: Math.max(0, dragX / 240),
          transition: "opacity .12s ease",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(196,68,31,.55) 0%, rgba(196,68,31,0) 100%)",
          mixBlendMode: "screen",
          opacity: Math.max(0, -dragX / 240),
          transition: "opacity .12s ease",
        }}
      />

      {/* Bottom block: info stacked above action buttons (flex column) */}
      <div className="absolute left-0 right-0 bottom-0 z-[4] flex flex-col gap-3 p-4 md:p-5 text-white">
        <div>
          <h2
            className="m-0 mb-1.5 leading-[1.02] tracking-tight font-extrabold line-clamp-2"
            style={{
              fontSize: "clamp(24px, 4.5vw, 34px)",
              textShadow: "0 2px 12px rgba(0,0,0,.5)",
            }}
          >
            {cafe.name}
          </h2>
          <div className="flex items-center gap-2 flex-wrap text-[13px] md:text-[14px] text-white/[.86] mb-2.5 gap-y-1">
            {locality && (
              <>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} strokeWidth={2} /> {locality}
                </span>
                {((open?.closesAt && open.isOpen) || cafe.priceRange) && (
                  <span className="opacity-55">·</span>
                )}
              </>
            )}
            {open?.closesAt && open.isOpen && (
              <>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} strokeWidth={2} /> sampai {open.closesAt}
                </span>
                {cafe.priceRange && <span className="opacity-55">·</span>}
              </>
            )}
            {cafe.priceRange && <span>{cafe.priceRange}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleTags.map((t) => (
              <span
                key={t.key}
                className="inline-flex items-center gap-1.5 px-[11px] py-1 rounded-full bg-[rgba(20,14,10,.55)] border border-white/[.16] text-white font-semibold text-[12px] backdrop-blur-sm"
              >
                <LucideIcon name={lucideForFacility(t.key)} size={11} strokeWidth={2} />
                {t.label}
              </span>
            ))}
            {extraTags > 0 && (
              <span className="inline-flex items-center px-[11px] py-1 rounded-full bg-[rgba(217,119,6,.85)] text-white font-bold text-[12px]">
                +{extraTags}
              </span>
            )}
          </div>
        </div>

        {(onSkip || onKeep) && (
          <div
            className="flex gap-2 justify-center pt-0.5"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => handleAction(e, onSkip)}
              className="flex-1 max-w-40 h-9 md:h-10 rounded-full font-bold text-[13px] md:text-[13px] inline-flex items-center justify-center gap-1.5 bg-white/95 text-[#c4441f] border border-white/60 shadow-[0_6px_18px_rgba(0,0,0,.22)] backdrop-blur-md hover:bg-white active:translate-y-[1px] active:scale-[.97] transition"
              aria-label="Lewati"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Lewati
            </button>
            <button
              type="button"
              onClick={(e) => handleAction(e, onKeep)}
              className="flex-1 max-w-40 h-9 md:h-10 rounded-full font-bold text-[13px] md:text-[13px] inline-flex items-center justify-center gap-1.5 bg-[#d97706] text-white border border-[#b85d04] shadow-[0_6px_18px_rgba(217,119,6,.45)] backdrop-blur-md hover:bg-[#b85d04] active:translate-y-[1px] active:scale-[.97] transition"
              aria-label="Simpan"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Simpan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
