import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Link,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { ChevronLeft, PencilLine, Plus } from "../utils/lucideIcon";
import { extractCafeIdFromSlug, cafeUrl } from "../utils/cafeUrl";
import { cafesApi, type GoogleReview } from "../api/cafes.api";
import { reviewsApi, type Review, type ReviewSort } from "../api/reviews.api";
import type { Cafe } from "../types";
import { useAuth } from "../context/AuthContext";
import ReviewCard from "../components/review/ReviewCard";
import WriteReviewModal from "../components/cafe/WriteReviewModal";
import PhotoLightbox from "../components/cafe/PhotoLightbox";
import Seo from "../components/seo/Seo";

const PAGE_SIZE = 20;

type SourceTab = "all" | "app" | "google";

const GoogleLogo = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

function GoogleReviewCard({ review }: { review: GoogleReview }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const initials = review.guestName.charAt(0).toUpperCase();
  const stars = Array.from({ length: 5 }, (_, i) => i < review.rating);
  const date = new Date(review.scrapedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-xl border border-[#F0EDE8] p-4">
      <div className="flex items-start gap-3 mb-2">
        {review.guestAvatar ? (
          <img
            src={review.guestAvatar}
            alt={review.guestName}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#4285F4] text-white text-sm font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#1C1C1A] text-sm truncate">
              {review.guestName}
            </span>
            <span className="inline-flex items-center gap-0.5">
              {stars.map((filled, i) => (
                <svg
                  key={i}
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill={filled ? "#FBBC05" : "#E8E4DD"}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </span>
            <span className="inline-flex items-center gap-1 bg-[#F0F4FF] border border-[#C7D3F5] rounded-full px-2 py-0.5">
              <GoogleLogo size={9} />
              <span className="text-[10px] font-semibold text-[#4285F4]">
                Google Maps
              </span>
            </span>
          </div>
          <div className="text-[11px] text-[#8A8880]">{date}</div>
        </div>
      </div>
      {review.comment && (
        <p className="text-sm text-[#1C1C1A] leading-relaxed">
          {review.comment}
        </p>
      )}
      {review.photoUrl && (
        <img
          src={review.photoUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="mt-2 w-full max-h-48 object-cover rounded-lg cursor-pointer"
          onClick={() => setLightboxOpen(true)}
        />
      )}
      {lightboxOpen && review.photoUrl && (
        <PhotoLightbox
          photos={[{ url: review.photoUrl }]}
          index={0}
          onClose={() => setLightboxOpen(false)}
          onChange={() => {}}
        />
      )}
    </div>
  );
}

export default function CafeReviewsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const cafeId = useMemo(() => extractCafeIdFromSlug(slug), [slug]);

  const initialTab: SourceTab =
    searchParams.get("source") === "google" ? "google" : "all";

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [sourceTab, setSourceTab] = useState<SourceTab>(initialTab);

  // App reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [votedSet, setVotedSet] = useState<Set<number>>(new Set());
  const [appPage, setAppPage] = useState(1);
  const [appTotal, setAppTotal] = useState(0);
  const [sort, setSort] = useState<ReviewSort>("helpful");
  const [loadingApp, setLoadingApp] = useState(false);
  const [loadingMoreApp, setLoadingMoreApp] = useState(false);

  // Google reviews state
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([]);
  const [googlePage, setGooglePage] = useState(1);
  const [googleTotal, setGoogleTotal] = useState(0);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingMoreGoogle, setLoadingMoreGoogle] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [cafeLoaded, setCafeLoaded] = useState(false);

  const loadAppReviews = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (!cafeId) return;
      const res = await reviewsApi.listByCafe(cafeId, {
        page: targetPage,
        limit: PAGE_SIZE,
        sort,
      });
      setAppTotal(res.data.meta.total);
      setReviews((prev) =>
        replace ? res.data.data : [...prev, ...res.data.data],
      );
    },
    [cafeId, sort],
  );

  const loadGoogleReviews = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (!cafeId) return;
      const res = await cafesApi.getGoogleReviews(cafeId, {
        page: targetPage,
        limit: PAGE_SIZE,
      });
      setGoogleTotal(res.data.meta.total);
      setGoogleReviews((prev) =>
        replace ? res.data.data : [...prev, ...res.data.data],
      );
    },
    [cafeId],
  );

  // Initial load — cafe info + both review sources
  useEffect(() => {
    if (!cafeId) return;
    setCafeLoaded(false);
    setLoadingApp(true);
    setLoadingGoogle(true);
    setAppPage(1);
    setGooglePage(1);

    cafesApi
      .getById(cafeId)
      .then((res) => {
        setCafe(res.data);
        setCafeLoaded(true);
      })
      .catch(() => setCafeLoaded(true));

    loadAppReviews(1, true).finally(() => setLoadingApp(false));
    loadGoogleReviews(1, true).finally(() => setLoadingGoogle(false));

    if (user) {
      reviewsApi
        .myVoteIds(cafeId)
        .then((res) => setVotedSet(new Set(res.data ?? [])))
        .catch(() => setVotedSet(new Set()));
    } else {
      setVotedSet(new Set());
    }
  }, [cafeId, user]);

  // Re-fetch app reviews when sort changes
  useEffect(() => {
    if (!cafeId || !cafeLoaded) return;
    setLoadingApp(true);
    setAppPage(1);
    loadAppReviews(1, true).finally(() => setLoadingApp(false));
  }, [sort]);

  const handleLoadMoreApp = async () => {
    if (loadingMoreApp || reviews.length >= appTotal) return;
    setLoadingMoreApp(true);
    const next = appPage + 1;
    try {
      await loadAppReviews(next, false);
      setAppPage(next);
    } finally {
      setLoadingMoreApp(false);
    }
  };

  const handleLoadMoreGoogle = async () => {
    if (loadingMoreGoogle || googleReviews.length >= googleTotal) return;
    setLoadingMoreGoogle(true);
    const next = googlePage + 1;
    try {
      await loadGoogleReviews(next, false);
      setGooglePage(next);
    } finally {
      setLoadingMoreGoogle(false);
    }
  };

  const handleReviewSubmitted = async () => {
    setShowModal(false);
    if (!cafeId) return;
    setAppPage(1);
    await loadAppReviews(1, true);
  };

  if (!cafeId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#8A8880]">
        Cafe tidak ditemukan
      </div>
    );
  }

  const loading = loadingApp && loadingGoogle;
  const totalAll = appTotal + googleTotal;

  const tabCount: Record<SourceTab, number> = {
    all: totalAll,
    app: appTotal,
    google: googleTotal,
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <Seo
        title={cafe ? `Reviews — ${cafe.name}` : "Reviews"}
        description="Read reviews from real visitors and share your own."
      />

      {/* Header */}
      <div className="bg-white border-b border-[#F0EDE8] sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to={cafe ? cafeUrl(cafe) : "/"}
            className="w-9 h-9 rounded-full hover:bg-[#F0EDE8] flex items-center justify-center text-[#1C1C1A]"
            title="Back"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[#8A8880]">Reviews</div>
            <div className="text-base font-bold text-[#1C1C1A] truncate">
              {cafe?.name ?? "Loading…"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                navigate("/login");
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

        {/* Source tabs */}
        <div className="max-w-3xl mx-auto px-4 pb-3 flex items-center gap-2">
          {(["all", "app", "google"] as SourceTab[]).map((tab) => {
            const labels: Record<SourceTab, React.ReactNode> = {
              all: "Semua",
              app: "App Reviews",
              google: (
                <span className="inline-flex items-center gap-1">
                  <GoogleLogo size={12} />
                  Google Maps
                </span>
              ),
            };
            const active = sourceTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setSourceTab(tab)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-[#1C1C1A] text-white border-[#1C1C1A]"
                    : "bg-white text-[#5C5A52] border-[#E8E4DD] hover:border-[#1C1C1A]"
                }`}
              >
                {labels[tab]}
                {tabCount[tab] > 0 && (
                  <span
                    className={`text-[10px] font-bold ${active ? "text-white/70" : "text-[#8A8880]"}`}
                  >
                    {tabCount[tab]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── App Reviews ── */}
            {(sourceTab === "all" || sourceTab === "app") && (
              <div
                className={sourceTab === "all" && googleTotal > 0 ? "mb-8" : ""}
              >
                {sourceTab === "all" && (
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-[#1C1C1A]">
                      App Reviews
                      {appTotal > 0 && (
                        <span className="ml-1.5 text-[#8A8880] font-normal">
                          ({appTotal})
                        </span>
                      )}
                    </h2>
                  </div>
                )}

                {sourceTab === "app" && (
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-[#8A8880]">
                      {appTotal > 0
                        ? `${appTotal} review${appTotal !== 1 ? "s" : ""}`
                        : ""}
                    </div>
                    <div className="inline-flex rounded-full border border-[#E8E4DD] bg-white overflow-hidden text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setSort("helpful")}
                        className={`px-3 py-1.5 ${sort === "helpful" ? "bg-[#D48B3A] text-white" : "text-[#5C5A52]"}`}
                      >
                        Helpful
                      </button>
                      <button
                        type="button"
                        onClick={() => setSort("recent")}
                        className={`px-3 py-1.5 ${sort === "recent" ? "bg-[#D48B3A] text-white" : "text-[#5C5A52]"}`}
                      >
                        Terbaru
                      </button>
                    </div>
                  </div>
                )}

                {loadingApp ? (
                  <div className="flex justify-center py-8">
                    <div className="w-7 h-7 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-[#F0EDE8]">
                    <PencilLine
                      size={24}
                      strokeWidth={2}
                      className="mx-auto mb-2 text-[#D48B3A]"
                    />
                    <p className="text-sm font-semibold text-[#1C1C1A]">
                      Belum ada ulasan
                    </p>
                    <p className="text-xs text-[#8A8880] mt-1 mb-4">
                      Jadi yang pertama berbagi pengalaman!
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        user ? setShowModal(true) : navigate("/login")
                      }
                      className="px-5 py-2 rounded-full bg-[#D48B3A] text-white text-sm font-bold"
                    >
                      Tulis Review
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
                    {reviews.length < appTotal && (
                      <div className="flex justify-center mt-4">
                        <button
                          type="button"
                          onClick={handleLoadMoreApp}
                          disabled={loadingMoreApp}
                          className="px-5 py-2 rounded-full border border-[#D48B3A] text-[#D48B3A] text-sm font-bold hover:bg-[#FDF6EC] disabled:opacity-50"
                        >
                          {loadingMoreApp ? "Loading…" : "Load more"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Divider in "Semua" mode ── */}
            {sourceTab === "all" && appTotal > 0 && googleTotal > 0 && (
              <div className="border-t border-[#F0EDE8] mb-8" />
            )}

            {/* ── Google Reviews ── */}
            {(sourceTab === "all" || sourceTab === "google") && (
              <div>
                {(sourceTab === "all" || sourceTab === "google") && (
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex items-center gap-1.5 bg-[#F8F9FF] border border-[#E8E4F0] rounded-full px-3 py-1">
                      <GoogleLogo size={14} />
                      <span className="text-xs font-semibold text-[#5C5A52]">
                        Google Maps Reviews
                      </span>
                      {googleTotal > 0 && (
                        <span className="text-xs text-[#8A8880]">
                          ({googleTotal})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {loadingGoogle ? (
                  <div className="flex justify-center py-8">
                    <div className="w-7 h-7 border-4 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : googleReviews.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-[#F0EDE8]">
                    <p className="text-sm text-[#8A8880]">
                      Belum ada Google review tersedia
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {googleReviews.map((gr) => (
                        <GoogleReviewCard key={gr.id} review={gr} />
                      ))}
                    </div>
                    {googleReviews.length < googleTotal && (
                      <div className="flex justify-center mt-4">
                        <button
                          type="button"
                          onClick={handleLoadMoreGoogle}
                          disabled={loadingMoreGoogle}
                          className="px-5 py-2 rounded-full border border-[#4285F4] text-[#4285F4] text-sm font-bold hover:bg-[#F0F4FF] disabled:opacity-50"
                        >
                          {loadingMoreGoogle
                            ? "Loading…"
                            : "Load more Google reviews"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Empty state for "Semua" when both are empty */}
            {sourceTab === "all" && appTotal === 0 && googleTotal === 0 && (
              <div className="text-center py-16">
                <PencilLine
                  size={24}
                  strokeWidth={2}
                  className="mx-auto mb-2 text-[#D48B3A]"
                />
                <p className="text-[#8A8880] mb-4">Belum ada review</p>
                <button
                  type="button"
                  onClick={() =>
                    user ? setShowModal(true) : navigate("/login")
                  }
                  className="px-5 py-2 rounded-full bg-[#D48B3A] text-white text-sm font-bold"
                >
                  Jadi yang pertama review
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
