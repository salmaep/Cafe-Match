import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus } from '../utils/lucideIcon';
import { extractCafeIdFromSlug, cafeUrl } from '../utils/cafeUrl';
import { cafesApi } from '../api/cafes.api';
import { reviewsApi, type Review, type ReviewSort } from '../api/reviews.api';
import type { Cafe } from '../types';
import { useAuth } from '../context/AuthContext';
import ReviewCard from '../components/review/ReviewCard';
import WriteReviewModal from '../components/cafe/WriteReviewModal';
import Seo from '../components/seo/Seo';

const PAGE_SIZE = 20;

export default function CafeReviewsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const cafeId = useMemo(() => extractCafeIdFromSlug(slug), [slug]);

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [votedSet, setVotedSet] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<ReviewSort>('helpful');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadPage = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (!cafeId) return;
      const res = await reviewsApi.listByCafe(cafeId, {
        page: targetPage,
        limit: PAGE_SIZE,
        sort,
      });
      setTotal(res.data.meta.total);
      setReviews((prev) =>
        replace ? res.data.data : [...prev, ...res.data.data],
      );
    },
    [cafeId, sort],
  );

  // Initial + sort-change load
  useEffect(() => {
    if (!cafeId) return;
    setLoading(true);
    setPage(1);
    Promise.all([
      cafesApi.getById(cafeId).then((res) => setCafe(res.data)).catch(() => {}),
      loadPage(1, true),
      user
        ? reviewsApi
            .myVoteIds(cafeId)
            .then((res) => setVotedSet(new Set(res.data ?? [])))
            .catch(() => setVotedSet(new Set()))
        : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [cafeId, sort, user, loadPage]);

  const handleLoadMore = async () => {
    if (loadingMore || reviews.length >= total) return;
    setLoadingMore(true);
    const next = page + 1;
    try {
      await loadPage(next, false);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleReviewSubmitted = async () => {
    setShowModal(false);
    if (!cafeId) return;
    setPage(1);
    await loadPage(1, true);
  };

  if (!cafeId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#8A8880]">
        Cafe tidak ditemukan
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <Seo
        title={cafe ? `Reviews — ${cafe.name}` : 'Reviews'}
        description="Read reviews from real visitors and share your own."
      />

      {/* Header */}
      <div className="bg-white border-b border-[#F0EDE8] sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to={cafe ? cafeUrl(cafe) : '/'}
            className="w-9 h-9 rounded-full hover:bg-[#F0EDE8] flex items-center justify-center text-[#1C1C1A]"
            title="Back"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[#8A8880]">Reviews</div>
            <div className="text-base font-bold text-[#1C1C1A] truncate">
              {cafe?.name ?? 'Loading…'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                navigate('/login');
                return;
              }
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#D48B3A] text-white text-xs font-bold hover:bg-[#b87528] transition-colors"
          >
            <Plus size={14} />
            Tulis Review
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {/* Sort tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-[#8A8880]">
            {total > 0 ? `${total} review${total !== 1 ? 's' : ''}` : ''}
          </div>
          <div className="inline-flex rounded-full border border-[#E8E4DD] bg-white overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSort('helpful')}
              className={`px-3 py-1.5 ${
                sort === 'helpful' ? 'bg-[#D48B3A] text-white' : 'text-[#5C5A52]'
              }`}
            >
              Helpful
            </button>
            <button
              type="button"
              onClick={() => setSort('recent')}
              className={`px-3 py-1.5 ${
                sort === 'recent' ? 'bg-[#D48B3A] text-white' : 'text-[#5C5A52]'
              }`}
            >
              Terbaru
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#8A8880] mb-4">Belum ada review</p>
            <button
              type="button"
              onClick={() => (user ? setShowModal(true) : navigate('/login'))}
              className="px-5 py-2 rounded-full bg-[#D48B3A] text-white text-sm font-bold"
            >
              Jadi yang pertama review
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {reviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  votedByMe={votedSet.has(r.id)}
                  variant="full"
                />
              ))}
            </div>

            {reviews.length < total && (
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-5 py-2 rounded-full border border-[#D48B3A] text-[#D48B3A] text-sm font-bold hover:bg-[#FDF6EC] disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && cafe && (
        <WriteReviewModal
          cafeId={cafe.id}
          cafeName={cafe.name}
          onClose={() => setShowModal(false)}
          onSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
}
