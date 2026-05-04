import { useEffect, useRef } from 'react';

interface Props {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
}

/**
 * Invisible sentinel — when it enters the viewport, fires onLoadMore.
 * Doubles as a visible "loading" indicator while the next page fetches.
 */
export default function InfiniteScrollSentinel({ onLoadMore, hasMore, loading }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep latest callbacks in refs so the observer setup doesn't re-create on
  // every render (which would tear down/recreate the observer).
  const cbRef = useRef(onLoadMore);
  const stateRef = useRef({ hasMore, loading });
  cbRef.current = onLoadMore;
  stateRef.current = { hasMore, loading };

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        const { hasMore: hm, loading: ld } = stateRef.current;
        if (hm && !ld) cbRef.current();
      },
      { root: null, rootMargin: '200px', threshold: 0 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  if (!hasMore && !loading) {
    return (
      <div ref={ref} className="py-6 text-center text-xs text-[#8A8880]">
        — Semua kafe sudah ditampilkan —
      </div>
    );
  }

  return (
    <div ref={ref} className="py-6 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
