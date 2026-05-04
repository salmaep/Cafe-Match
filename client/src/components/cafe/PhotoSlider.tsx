import { useRef, useState } from 'react';
import { placeholderImage } from '../../utils/cafeImage';

interface Props {
  photos: { id: number; url: string; caption?: string | null }[];
  cafeId: number;
  cafeName: string;
  onClickPhoto?: (index: number) => void;
  fullBleed?: boolean;
}

export default function PhotoSlider({
  photos,
  cafeId,
  cafeName,
  onClickPhoto,
  fullBleed = false,
}: Props) {
  const [index, setIndex] = useState(0);
  const startXRef = useRef(0);
  const movingRef = useRef(false);

  if (photos.length === 0) return null;

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(photos.length - 1, i + 1));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startXRef.current = e.clientX;
    movingRef.current = true;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!movingRef.current) return;
    movingRef.current = false;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) < 8) {
      onClickPhoto?.(index);
    } else if (dx > 50) {
      goPrev();
    } else if (dx < -50) {
      goNext();
    }
  };

  const containerClass = fullBleed
    ? 'relative w-full h-full overflow-hidden'
    : 'relative aspect-[4/3] md:aspect-[16/9] w-full bg-[#F0EDE8] rounded-2xl overflow-hidden';

  return (
    <div className={containerClass}>
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (movingRef.current = false)}
      >
        {photos.map((photo, i) => (
          <div key={photo.id} className="shrink-0 w-full h-full relative cursor-pointer">
            <img
              src={photo.url}
              alt={photo.caption || cafeName}
              className="absolute inset-0 w-full h-full object-cover select-none"
              draggable={false}
              loading={i === index ? 'eager' : 'lazy'}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = placeholderImage(cafeId + i);
              }}
            />
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          {/* Counter */}
          <div className="absolute top-3 right-3 bg-black/55 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full z-20">
            {index + 1} / {photos.length}
          </div>

          {/* Prev / Next */}
          {index > 0 && (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-[#1C1C1A] text-xl font-bold flex items-center justify-center shadow-md transition-colors z-20"
            >
              ‹
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-[#1C1C1A] text-xl font-bold flex items-center justify-center shadow-md transition-colors z-20"
            >
              ›
            </button>
          )}

          {/* Dots */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex gap-1.5 z-20">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'bg-white w-5' : 'bg-white/50 w-1.5'
                }`}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
