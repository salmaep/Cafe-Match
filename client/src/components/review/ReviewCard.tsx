import { useState } from 'react';
import { ThumbsUp, Star } from '../../utils/lucideIcon';
import type { Review } from '../../api/reviews.api';
import { reviewsApi } from '../../api/reviews.api';
import { useAuth } from '../../context/AuthContext';

interface Props {
  review: Review;
  /** Whether the current user has voted this review helpful (parent-managed). */
  votedByMe?: boolean;
  /** Compact mode for cafe-detail preview: line-clamp text, hide media list. */
  variant?: 'preview' | 'full';
  /** Click handler for preview cards (e.g. navigate to full list). */
  onClick?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function overallScore(review: Review): number | null {
  const overall = review.ratings?.find((r) => r.category === 'overall');
  return overall ? overall.score : null;
}

export default function ReviewCard({
  review,
  votedByMe = false,
  variant = 'full',
  onClick,
}: Props) {
  const { user } = useAuth();
  // Local optimistic state — parent re-fetches will reset on next render via key
  const [voted, setVoted] = useState(votedByMe);
  const [count, setCount] = useState(review.helpfulCount ?? 0);
  const [busy, setBusy] = useState(false);

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || busy) return;
    setBusy(true);
    const wasVoted = voted;
    setVoted(!wasVoted);
    setCount((c) => c + (wasVoted ? -1 : 1));
    try {
      const res = await reviewsApi.toggleVote(review.id);
      setVoted(res.data.helpful);
      setCount(res.data.helpfulCount);
    } catch {
      setVoted(wasVoted);
      setCount(review.helpfulCount ?? 0);
    } finally {
      setBusy(false);
    }
  };

  const stars = overallScore(review);
  const isPreview = variant === 'preview';
  const Wrapper: any = isPreview && onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={isPreview && onClick ? 'button' : undefined}
      onClick={isPreview ? onClick : undefined}
      className={`bg-white rounded-xl border border-[#F0EDE8] p-4 w-full text-left ${
        isPreview && onClick ? 'hover:border-[#D48B3A] transition-colors cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start gap-3 mb-2">
        {review.user?.avatarUrl ? (
          <img
            src={review.user.avatarUrl}
            alt={review.user.name}
            className="w-9 h-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#D48B3A] text-white text-sm font-bold flex items-center justify-center shrink-0">
            {(review.user?.name ?? '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#1C1C1A] text-sm truncate">
              {review.user?.name ?? 'Anonim'}
            </span>
            {stars != null && (
              <span className="inline-flex items-center gap-0.5 text-[12px] text-[#D48B3A] font-bold">
                <Star size={12} fill="#D48B3A" strokeWidth={0} />
                {stars.toFixed(1)}
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#8A8880]">{formatDate(review.createdAt)}</div>
        </div>
      </div>

      {review.text && (
        <p
          className={`text-sm text-[#1C1C1A] leading-relaxed ${
            isPreview ? 'line-clamp-3' : ''
          }`}
        >
          {review.text}
        </p>
      )}

      {!isPreview && review.media && review.media.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {review.media.map((m) =>
            m.mediaType === 'photo' ? (
              <img
                key={m.id}
                src={m.url}
                alt=""
                className="w-full h-24 object-cover rounded-lg"
              />
            ) : (
              <video
                key={m.id}
                src={m.url}
                className="w-full h-24 object-cover rounded-lg"
                controls
              />
            ),
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handleVote}
          disabled={!user || busy}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            voted
              ? 'bg-[#D48B3A] text-white border-[#D48B3A]'
              : 'bg-white text-[#5C5A52] border-[#E8E4DD] hover:border-[#D48B3A]'
          } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={user ? 'Helpful?' : 'Login to vote'}
        >
          <ThumbsUp size={13} fill={voted ? 'currentColor' : 'none'} />
          {count > 0 ? count : 'Helpful'}
        </button>
      </div>
    </Wrapper>
  );
}
