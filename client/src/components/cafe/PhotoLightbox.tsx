import { useEffect, useRef } from "react";
import { X } from "../../utils/lucideIcon";

interface Props {
  photos: { url: string; caption?: string | null }[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}

export default function PhotoLightbox({
  photos,
  index,
  onClose,
  onChange,
}: Props) {
  const startXRef = useRef(0);
  const movingRef = useRef(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onChange(index - 1);
      if (e.key === "ArrowRight" && index < photos.length - 1)
        onChange(index + 1);
    };
    window.addEventListener("keydown", handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, photos.length, onClose, onChange]);

  // Touch / pointer swipe (same threshold semantics as PhotoSlider).
  const onPointerDown = (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    movingRef.current = true;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!movingRef.current) return;
    movingRef.current = false;
    const dx = e.clientX - startXRef.current;
    if (dx > 50 && index > 0) onChange(index - 1);
    else if (dx < -50 && index < photos.length - 1) onChange(index + 1);
  };

  const current = photos[index];
  if (!current) return null;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors z-10"
        title="Close (Esc)"
      >
        <X size={22} strokeWidth={2.5} />
      </button>

      <div className="absolute top-4 left-4 text-white/80 text-sm font-medium">
        {index + 1} / {photos.length}
      </div>

      {index > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(index - 1);
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition-colors z-10"
        >
          ‹
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(index + 1);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition-colors z-10"
        >
          ›
        </button>
      )}

      <img
        src={current.url}
        alt={current.caption || "Photo"}
        referrerPolicy="no-referrer"
        draggable={false}
        className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg shadow-2xl select-none"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (movingRef.current = false)}
      />
    </div>
  );
}
