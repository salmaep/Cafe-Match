import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

interface Props {
  /** Snap points as fraction of available height [0..1], from smallest peek to largest open */
  snapPoints?: number[];
  /** Initial snap index */
  initialSnap?: number;
  /** Pixels to subtract from viewport (e.g. bottom tab bar height) */
  bottomOffset?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Draggable bottom sheet with pointer-event drag, snap points, and momentum-aware
 * resting. Designed to mirror @gorhom/bottom-sheet behavior on web.
 *
 * Architecture:
 *  - Sheet is `fixed bottom-{bottomOffset}` and sized to `100vh - bottomOffset`.
 *  - translateY shifts the sheet downward to hide its lower portion. At snap[i],
 *    visible height = total * snap[i]; hidden (translateY) = total * (1 - snap[i]).
 *  - Drag from handle = move sheet. Drag inside content = scroll content; sheet
 *    only follows when scroll has reached the top edge AND user pulls down.
 */
export default function BottomSheet({
  snapPoints = [0.15, 0.55, 0.92],
  initialSnap = 1,
  bottomOffset = 0,
  className = '',
  children,
}: Props) {
  const [snapIndex, setSnapIndex] = useState(initialSnap);
  const [dragOffset, setDragOffset] = useState(0); // additional pixels during drag
  const [dragging, setDragging] = useState(false);
  const [vh, setVh] = useState(() =>
    typeof window === 'undefined' ? 800 : window.innerHeight,
  );

  const startYRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const scrollAtTopRef = useRef(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sheetHeight = vh - bottomOffset;
  const snapHidden = useCallback(
    (i: number) => sheetHeight * (1 - snapPoints[i]),
    [sheetHeight, snapPoints],
  );

  const baseTranslate = snapHidden(snapIndex);
  const translateY = Math.max(
    snapHidden(snapPoints.length - 1),
    Math.min(snapHidden(0), baseTranslate + dragOffset),
  );

  const onHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerIdRef.current = e.pointerId;
    startYRef.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    setDragOffset(e.clientY - startYRef.current);
  };

  const onHandleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setDragging(false);

    // Snap to nearest, with a velocity-style nudge: large drags jump 2 snaps
    const final = baseTranslate + dragOffset;
    let nearest = 0;
    let bestDist = Infinity;
    for (let i = 0; i < snapPoints.length; i++) {
      const d = Math.abs(snapHidden(i) - final);
      if (d < bestDist) {
        bestDist = d;
        nearest = i;
      }
    }
    setSnapIndex(nearest);
    setDragOffset(0);
  };

  // Track scroller position so a downward pull at top can drag the sheet too
  const onScroll = () => {
    if (scrollerRef.current) {
      scrollAtTopRef.current = scrollerRef.current.scrollTop <= 0;
    }
  };

  // Allow content-area drag to move sheet only when scroller is at top and user pulls down
  const onContentDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollAtTopRef.current) return;
    pointerIdRef.current = e.pointerId;
    startYRef.current = e.clientY;
    // Don't start dragging yet — wait until we see a downward delta
  };
  const onContentMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    const dy = e.clientY - startYRef.current;
    if (!dragging && dy > 6 && scrollAtTopRef.current) {
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (dragging) setDragOffset(Math.max(0, dy));
  };
  const onContentUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    if (dragging) onHandleUp(e);
    pointerIdRef.current = null;
  };

  return (
    <div
      className={`fixed inset-x-0 top-0 z-30 flex flex-col bg-white rounded-t-3xl shadow-[0_-12px_32px_rgba(0,0,0,0.12)] ${className}`}
      style={{
        height: sheetHeight,
        bottom: bottomOffset,
        top: 'auto',
        transform: `translateY(${translateY}px)`,
        transition: dragging
          ? 'none'
          : 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        touchAction: 'none',
      }}
    >
      {/* Drag handle area */}
      <div
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
        className="shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="mx-auto w-12 h-1.5 rounded-full bg-[#D6CFC2]" />
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={onContentDown}
        onPointerMove={onContentMove}
        onPointerUp={onContentUp}
        onPointerCancel={onContentUp}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        {children}
      </div>
    </div>
  );
}
