import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { cafesApi, type GoogleReview } from '../api/cafes.api';
import { bookmarksApi } from '../api/bookmarks.api';
import { favoritesApi } from '../api/favorites.api';
import type { Cafe } from '../types';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { haversineDistance, formatDistance } from '../utils/haversine';
import { analyticsApi } from '../api/analytics.api';
import { reviewsApi, type ReviewSummary, type Review } from '../api/reviews.api';
import ReviewCard from '../components/review/ReviewCard';
import { useShortlist } from '../context/ShortlistContext';
import { placeholderImage } from '../utils/cafeImage';
import { extractCafeIdFromSlug, cafeUrl } from '../utils/cafeUrl';
import Seo from '../components/seo/Seo';
import PhotoLightbox from '../components/cafe/PhotoLightbox';
import PhotoSlider from '../components/cafe/PhotoSlider';
import WriteReviewModal from '../components/cafe/WriteReviewModal';
import { getOpenStatus, formatHoursTable } from '../utils/openingHours';
import { buildFacilityChips } from '../utils/facilities';
import { formatRating } from '../utils/rating';
import { cleanAddress } from '../utils/address';
import CheckInButton from '../components/checkin/CheckInButton';
import CafeLeaderboard from '../components/checkin/CafeLeaderboard';
import { Bookmark, Heart, MapPin, Phone, Navigation } from '../utils/lucideIcon';

const REVIEW_CATEGORY_LABELS: Record<string, string> = {
  overall: '⭐ Rating',
  ambiance: '🎨 Ambiance',
  wfc: '💻 WFC',
  food_quality: '🍽️ Food',
  service: '🛎️ Service',
  value_for_money: '💰 Value',
  kid_friendly: '👶 Kid-friendly',
};
function prettyReviewCategory(k: string) {
  if (REVIEW_CATEGORY_LABELS[k]) return REVIEW_CATEGORY_LABELS[k];
  return k.replace(/^(mood_|facility_)/, '').replace(/[_-]/g, ' ');
}

export default function CafeDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backLabel = (location.state as { backLabel?: string } | null)?.backLabel ?? 'Back';
  const { user } = useAuth();
  const geo = useGeolocation();
  const { addToShortlist, removeFromShortlist, isInShortlist } = useShortlist();

  const cafeId = useMemo(() => extractCafeIdFromSlug(slug), [slug]);

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary[]>([]);
  const [reviewPreviews, setReviewPreviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewVotedSet, setReviewVotedSet] = useState<Set<number>>(new Set());
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>([]);
  const [googleReviewTotal, setGoogleReviewTotal] = useState(0);

  useEffect(() => {
    if (cafeId == null) {
      setLoading(false);
      setCafe(null);
      return;
    }
    setLoading(true);
    cafesApi
      .getById(cafeId)
      .then((res) => {
        setCafe(res.data);
        analyticsApi.track(cafeId, 'view').catch(() => {});
      })
      .catch(() => setCafe(null))
      .finally(() => setLoading(false));
    reviewsApi
      .getSummary(cafeId)
      .then((res) => setReviewSummary(res.data ?? []))
      .catch(() => setReviewSummary([]));
    reviewsApi
      .listByCafe(cafeId, { page: 1, limit: 3, sort: 'helpful' })
      .then((res) => {
        setReviewPreviews(res.data?.data ?? []);
        setReviewTotal(res.data?.meta?.total ?? 0);
      })
      .catch(() => {
        setReviewPreviews([]);
        setReviewTotal(0);
      });
    cafesApi
      .getGoogleReviews(cafeId, { page: 1, limit: 5 })
      .then((res) => {
        setGoogleReviews(res.data?.data ?? []);
        setGoogleReviewTotal(res.data?.meta?.total ?? 0);
      })
      .catch(() => {
        setGoogleReviews([]);
        setGoogleReviewTotal(0);
      });
  }, [cafeId]);

  // Fetch user's helpful votes for preview cards. Separate effect so it can
  // re-run when auth state changes without re-fetching reviews.
  useEffect(() => {
    if (!cafeId || !user) {
      setReviewVotedSet(new Set());
      return;
    }
    reviewsApi
      .myVoteIds(cafeId)
      .then((res) => setReviewVotedSet(new Set(res.data ?? [])))
      .catch(() => setReviewVotedSet(new Set()));
  }, [cafeId, user]);

  // Canonicalize URL: if user landed on /cafe/615 or /cafe/wrong-slug-615,
  // rewrite to the canonical /cafe/<slugified-name>-615 once we know the cafe.
  useEffect(() => {
    if (!cafe || !slug) return;
    const canonical = cafeUrl(cafe);
    if (canonical !== `/cafe/${slug}`) {
      navigate(canonical, { replace: true });
    }
  }, [cafe, slug, navigate]);

  // IDs of photos that failed to load — drop them from the mosaic so we only
  // render images that actually work. Reset whenever the cafe changes so a
  // navigation to a different cafe starts fresh.
  const [failedPhotoIds, setFailedPhotoIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    setFailedPhotoIds(new Set());
  }, [cafe?.id]);

  const handlePhotoError = useCallback((id: number) => {
    setFailedPhotoIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const validPhotos = useMemo(
    () =>
      (cafe?.photos ?? []).filter((p) => {
        const url = p?.url;
        if (typeof url !== 'string' || url.length === 0) return false;
        // Drop Unsplash stock photos — those are placeholder fallbacks the
        // scraper sometimes inserted, not real cafe photos.
        if (url.includes('images.unsplash.com')) return false;
        // Drop photos we already saw fail at runtime — better to reshape the
        // mosaic with fewer real photos than to fill broken slots with dummy.
        if (failedPhotoIds.has(p.id)) return false;
        return true;
      }),
    [cafe?.photos, failedPhotoIds],
  );

  const distance =
    cafe && geo.latitude && geo.longitude
      ? haversineDistance(geo.latitude, geo.longitude, cafe.latitude, cafe.longitude)
      : null;

  const handleBookmark = async () => {
    if (!cafe) return;
    if (!user) {
      navigate('/login');
      return;
    }
    const res = await bookmarksApi.toggle(cafe.id);
    setBookmarked(res.data.bookmarked);
    setCafe((prev) =>
      prev
        ? { ...prev, bookmarksCount: prev.bookmarksCount + (res.data.bookmarked ? 1 : -1) }
        : prev,
    );
  };

  const handleFavorite = async () => {
    if (!cafe) return;
    if (!user) {
      navigate('/login');
      return;
    }
    const res = await favoritesApi.toggle(cafe.id);
    setFavorited(res.data.favorited);
    setCafe((prev) =>
      prev
        ? { ...prev, favoritesCount: prev.favoritesCount + (res.data.favorited ? 1 : -1) }
        : prev,
    );
  };

  const handleShortlist = () => {
    if (!cafe) return;
    if (isInShortlist(cafe.id)) removeFromShortlist(cafe.id);
    else addToShortlist(cafe);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[#FAF9F6]">
        <div className="w-10 h-10 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="text-center py-20 bg-[#FAF9F6] min-h-[80vh]">
        <p className="text-[#8A8880]">Cafe not found</p>
        <Link to="/" className="text-[#D48B3A] hover:underline mt-2 inline-block">
          Back to map
        </Link>
      </div>
    );
  }

  type CafeMenuItem = NonNullable<typeof cafe.menus>[number];
  const menusByCategory: Record<string, CafeMenuItem[]> = (cafe.menus || []).reduce(
    (acc: Record<string, CafeMenuItem[]>, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {},
  );

  // When NO real photo loads successfully, fall back to a single deterministic
  // Unsplash placeholder. Using getCafeImage(cafe) here would just hand back
  // another (broken) Google URL because that's the only data we have, leaving
  // the user with a broken image icon.
  const heroPhotos =
    validPhotos.length > 0
      ? validPhotos
      : [{ id: -1, url: placeholderImage(cafe.id), caption: null }];

  const mapsUrl =
    cafe.googleMapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${cafe.name} ${cafe.address ?? ''}`.trim(),
    )}`;

  const inShortlist = isInShortlist(cafe.id);

  const facilityChips = buildFacilityChips(cafe);

  const starSummary = reviewSummary.filter(
    (s) => !s.category.startsWith('mood_') && !s.category.startsWith('facility_'),
  );

  const overallEntry = reviewSummary.find((s) => s.category === 'overall');
  const appRating = overallEntry ? overallEntry.avgScore : null;
  const appRatingCount = overallEntry ? overallEntry.count : 0;

  // Mood chips — merged from 3 sources (matches mobile logic):
  //  1. cafe.purposes (scraped name array) → +1 each
  //  2. cafe.purposeScores (slug → 0-100, threshold ≥40) → +1 each
  //  3. reviewSummary mood_* votes → real vote count
  const moodChips: { label: string; count: number }[] = (() => {
    const slugToLabel: Record<string, string> = {
      'me-time': '🧘 Me Time',
      date: '💑 Date',
      family: '👨‍👩‍👧 Family',
      'group-work': '📚 Group Study',
      wfc: '💻 WFC',
    };
    const nameToSlug: Record<string, string> = {
      'Me Time': 'me-time',
      Date: 'date',
      'Family Time': 'family',
      Family: 'family',
      'Group Study': 'group-work',
      'Group Work / Study': 'group-work',
      WFC: 'wfc',
      'Work from Cafe': 'wfc',
    };
    const combined = new Map<string, { label: string; count: number }>();
    const bump = (slug: string, delta: number) => {
      const label = slugToLabel[slug];
      if (!label) return;
      const existing = combined.get(slug);
      if (existing) existing.count += delta;
      else combined.set(slug, { label, count: delta });
    };
    for (const p of ((cafe as any)?.purposes as string[]) ?? []) {
      const slug = nameToSlug[p];
      if (slug) bump(slug, 1);
    }
    const ps = (cafe as any)?.purposeScores || {};
    for (const [slug, score] of Object.entries(ps)) {
      if (Number(score) >= 40) bump(slug, 1);
    }
    for (const s of reviewSummary.filter((x) => x.category.startsWith('mood_'))) {
      const raw = s.category.replace(/^mood_/, '');
      const normSlug =
        raw === 'me_time'
          ? 'me-time'
          : raw === 'group_study'
            ? 'group-work'
            : raw === 'family_time'
              ? 'family'
              : raw;
      bump(normSlug, s.count);
    }
    const result = Array.from(combined.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    // DUMMY PREVIEW — remove when real data flows through
    if (result.length === 0) {
      return [
        { label: '💻 WFC', count: 24 },
        { label: '🧘 Me Time', count: 18 },
        { label: '💑 Date', count: 12 },
        { label: '📚 Group Study', count: 7 },
        { label: '👨‍👩‍👧 Family', count: 3 },
      ];
    }
    return result;
  })();
  const handleWriteReview = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setReviewModalOpen(true);
  };

  const refreshReviewSummary = () => {
    if (!cafe) return;
    reviewsApi
      .getSummary(cafe.id)
      .then((res) => setReviewSummary(res.data ?? []))
      .catch(() => {});
  };

  const seoImage = validPhotos[0]?.url ?? placeholderImage(cafe.id);
  const seoDescription =
    cafe.description ??
    `${cafe.name} — ${cafe.address}. ${
      cafe.priceRange ? `Price range ${cafe.priceRange}.` : ''
    }`.trim();
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: cafe.name,
    image: seoImage,
    address: cafe.address,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: cafe.latitude,
      longitude: cafe.longitude,
    },
    telephone: cafe.phone ?? undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    priceRange: cafe.priceRange,
    ...(cafe.googleRating != null && cafe.totalGoogleReviews
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: cafe.googleRating,
            reviewCount: cafe.totalGoogleReviews,
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 lg:pb-12">
      <Seo
        title={cafe.name}
        description={seoDescription}
        image={seoImage}
        type="website"
        jsonLd={jsonLd}
      />
      {/* Top breadcrumb / back — desktop only */}
      <div className="hidden lg:block max-w-6xl mx-auto px-6 pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-[#8A8880] hover:text-[#1C1C1A] transition-colors"
        >
          <span className="text-base">←</span>
          <span>{backLabel}</span>
        </button>
      </div>

      {/* HERO GALLERY */}
      {/* Mobile / tablet: existing slider */}
      <div className="lg:hidden max-w-2xl mx-auto px-5 pt-4">
        <div className="relative w-full bg-[#1C1C1A] h-[40vh] md:h-[50vh] max-h-[420px] rounded-2xl overflow-hidden">
          <PhotoSlider
            photos={heroPhotos}
            cafeId={cafe.id}
            cafeName={cafe.name}
            onClickPhoto={validPhotos.length > 0 ? (i) => setLightboxIndex(i) : undefined}
            fullBleed
          />
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/85 hover:bg-white text-[#1C1C1A] flex items-center justify-center text-xl shadow-md z-30"
            title="Back"
          >
            ←
          </button>
        </div>
      </div>

      {/* Desktop: Airbnb-style mosaic */}
      <div className="hidden lg:block max-w-6xl mx-auto px-6 pt-4">
        <HeroMosaic
          photos={heroPhotos}
          cafeName={cafe.name}
          onOpen={(i) => validPhotos.length > 0 && setLightboxIndex(i)}
          totalCount={validPhotos.length}
          onPhotoError={handlePhotoError}
        />
      </div>

      {/* TWO-COLUMN BODY */}
      <div className="max-w-6xl mx-auto px-5 lg:px-6 pt-5 lg:pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* MAIN COLUMN */}
        <div className="lg:col-span-2 min-w-0">
          {/* Title block */}
          <header>
            <h1 className="text-2xl lg:text-4xl font-bold text-[#1C1C1A] tracking-tight">
              {cafe.name}
            </h1>

            {(appRating != null || cafe.googleRating != null || cafe.priceRange) && (
              <div className="flex items-center gap-2 mt-2 text-sm flex-wrap">
                {appRating != null && (
                  <span className="inline-flex items-center gap-1">
                    <span className="text-amber-500">★</span>
                    <span className="font-bold text-[#1C1C1A]">{appRating.toFixed(1)}</span>
                    <span className="text-[#8A8880]">({appRatingCount} ulasan)</span>
                  </span>
                )}
                {appRating != null && (cafe.googleRating != null || cafe.priceRange) && (
                  <span className="text-[#E0DCD3]">·</span>
                )}
                {formatRating(cafe.googleRating) && (
                  <span className="inline-flex items-center gap-1 text-[#8A8880]">
                    <span className="text-amber-400 text-xs">G★</span>
                    <span className="text-xs">{formatRating(cafe.googleRating)}</span>
                    {cafe.totalGoogleReviews != null && (
                      <span className="text-xs">({cafe.totalGoogleReviews.toLocaleString()})</span>
                    )}
                  </span>
                )}
                {cafe.googleRating != null && cafe.priceRange && (
                  <span className="text-[#E0DCD3]">·</span>
                )}
                {cafe.priceRange && (
                  <span className="font-semibold text-[#5C5A52]">{cafe.priceRange}</span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-[#8A8880]">
              {(() => {
                const open = getOpenStatus(cafe.openingHours);
                if (!open) return null;
                return (
                  <span
                    className={`font-semibold ${
                      open.isOpen ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {open.isOpen
                      ? `● Buka${open.closesAt ? ` · tutup ${open.closesAt}` : ''}`
                      : `● Tutup${
                          open.opensAt
                            ? ` · buka ${
                                open.nextOpenDay === 'today' ? '' : `${open.nextOpenDay} `
                              }${open.opensAt}`
                            : ''
                        }`}
                  </span>
                );
              })()}
              {(() => {
                const parts = [cafe.district, cafe.city]
                  .map((p) => cleanAddress(p || ''))
                  .filter(Boolean);
                if (parts.length === 0) return null;
                return (
                  <>
                    <span className="text-[#E0DCD3]">·</span>
                    <span>{parts.join(', ')}</span>
                  </>
                );
              })()}
              {distance != null && (
                <>
                  <span className="text-[#E0DCD3]">·</span>
                  <span>{formatDistance(distance)} from you</span>
                </>
              )}
              {cafe.matchScore != null && (
                <>
                  <span className="text-[#E0DCD3]">·</span>
                  <span className="font-semibold text-[#D48B3A]">
                    {cafe.matchScore}% match
                  </span>
                </>
              )}
            </div>

            {cafe.hasActivePromotion && (
              <div className="mt-4 flex items-center gap-3 bg-[#FDF6EC] border border-[#D48B3A] rounded-2xl p-3 lg:p-4">
                <span className="text-2xl">🎉</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#D48B3A] uppercase tracking-wider">
                    {cafe.activePromotionType === 'new_cafe'
                      ? 'Cafe Baru'
                      : 'Promo Aktif'}
                  </div>
                  <div className="text-sm text-[#5C5A52] mt-0.5">
                    {cafe.activePromotionType === 'new_cafe'
                      ? 'Cafe baru bergabung — yuk jadi yang pertama berkunjung!'
                      : 'Cafe ini sedang ada promo. Cek di tempat untuk detail.'}
                  </div>
                </div>
              </div>
            )}

            {cafe.description && (
              <p className="text-[15px] lg:text-base text-[#5C5A52] mt-4 leading-relaxed">
                {cafe.description}
              </p>
            )}
          </header>

          {/* Address */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-wrap items-center gap-3 mt-6 bg-white border border-[#F0EDE8] rounded-2xl p-4 lg:p-5 hover:border-[#D48B3A] hover:bg-[#FDF6EC] transition-all group"
          >
            <span className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[#F0EDE8] group-hover:bg-white flex items-center justify-center text-[#D48B3A] shrink-0">
              <MapPin size={20} strokeWidth={2} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#8A8880] uppercase tracking-wider">
                Location
              </div>
              <div className="text-sm lg:text-[15px] text-[#1C1C1A] mt-0.5 break-words">
                {cleanAddress(cafe.address)}
              </div>
            </div>
            <span className="text-sm text-[#D48B3A] font-semibold shrink-0">
              Open in Maps →
            </span>
          </a>

          {cafe.phone && (
            <a
              href={`tel:${cafe.phone}`}
              className="flex flex-wrap items-center gap-3 mt-3 bg-white border border-[#F0EDE8] rounded-2xl p-4 lg:p-5 hover:border-[#D48B3A] hover:bg-[#FDF6EC] transition-all group"
            >
              <span className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-[#F0EDE8] group-hover:bg-white flex items-center justify-center text-[#D48B3A] shrink-0">
                <Phone size={20} strokeWidth={2} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[#8A8880] uppercase tracking-wider">
                  Phone
                </div>
                <div className="text-sm lg:text-[15px] text-[#1C1C1A] mt-0.5 break-words">
                  {cafe.phone}
                </div>
              </div>
              <span className="text-sm text-[#D48B3A] font-semibold shrink-0">
                Telepon →
              </span>
            </a>
          )}

          {/* Check-In CTA — prominent, between Phone and Opening Hours */}
          <div className="mt-4">
            <CheckInButton cafe={cafe} />
          </div>

          {cafe.openingHours && Object.keys(cafe.openingHours).length > 0 && (
            <Section title="Jam Buka">
              <div className="bg-white border border-[#F0EDE8] rounded-2xl overflow-hidden">
                {(() => {
                  const today = new Date().getDay();
                  const todayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][
                    today
                  ];
                  return formatHoursTable(cafe.openingHours, 'id').map((row, i) => {
                    const isToday =
                      row.day ===
                      { mon: 'Sen', tue: 'Sel', wed: 'Rab', thu: 'Kam', fri: 'Jum', sat: 'Sab', sun: 'Min' }[
                        todayKey as 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
                      ];
                    const closed = row.hours === 'Tutup';
                    return (
                      <div
                        key={row.day}
                        className={`flex items-center justify-between px-4 lg:px-5 py-2.5 text-sm ${
                          i > 0 ? 'border-t border-[#F0EDE8]' : ''
                        } ${isToday ? 'bg-[#FDF6EC]' : ''}`}
                      >
                        <span
                          className={`font-semibold ${
                            isToday ? 'text-[#D48B3A]' : 'text-[#5C5A52]'
                          }`}
                        >
                          {row.day}
                          {isToday && <span className="ml-2 text-xs">(Hari ini)</span>}
                        </span>
                        <span
                          className={`tabular-nums ${
                            closed ? 'text-red-500' : 'text-[#1C1C1A]'
                          }`}
                        >
                          {row.hours}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </Section>
          )}

          {/* Stats — mobile/tablet only (desktop shows them in the sidebar) */}
          <div className="lg:hidden flex items-center justify-around bg-white border border-[#F0EDE8] rounded-2xl py-4 mt-6">
            <SidebarStat value={cafe.favoritesCount} label="Favorites" />
            <div className="w-px h-8 bg-[#F0EDE8]" />
            <SidebarStat value={cafe.bookmarksCount} label="Bookmarks" />
            {cafe.matchScore != null && (
              <>
                <div className="w-px h-8 bg-[#F0EDE8]" />
                <SidebarStat value={`${cafe.matchScore}%`} label="Match" accent />
              </>
            )}
          </div>

          {/* Facilities */}
          <Section title="Facilities">
            {facilityChips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {facilityChips.map((f, i) => (
                  <FacilityChip key={`${f.label}-${i}`} icon={f.icon} label={f.label} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#8A8880]">No facilities listed</p>
            )}
          </Section>

          {/* Reviews */}
          <Section
            title="Reviews"
            action={
              reviewTotal > 0 ? (
                <Link
                  to={`${cafeUrl(cafe)}/reviews`}
                  className="text-sm font-semibold text-[#D48B3A] hover:underline"
                >
                  Lihat semua ({reviewTotal}) →
                </Link>
              ) : null
            }
          >
            {/* Rating bars — only when review data exists */}
            {starSummary.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 mb-5">
                {starSummary.slice(0, 6).map((s) => (
                  <div key={s.category} className="flex items-center gap-3">
                    <span className="w-28 text-xs font-semibold text-[#8A8880] truncate">
                      {prettyReviewCategory(s.category)}
                    </span>
                    <div className="flex-1 h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D48B3A] rounded-full transition-all"
                        style={{ width: `${(s.avgScore / 5) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-bold text-[#1C1C1A]">
                      {s.avgScore.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* App reviews — top 3 by helpful */}
            {reviewPreviews.length > 0 ? (
              <div className="space-y-3">
                {reviewPreviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    votedByMe={reviewVotedSet.has(r.id)}
                    variant="preview"
                    onClick={() => navigate(`${cafeUrl(cafe)}/reviews`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-2xl border border-[#F0EDE8]">
                <p className="text-3xl mb-2">✍️</p>
                <p className="text-sm font-semibold text-[#1C1C1A]">Belum ada ulasan</p>
                <p className="text-xs text-[#8A8880] mt-1">Jadi yang pertama berbagi pengalaman!</p>
              </div>
            )}

            {/* More app reviews button */}
            {reviewTotal > reviewPreviews.length && (
              <Link
                to={`${cafeUrl(cafe)}/reviews`}
                className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-[#E8E4DD] text-sm font-semibold text-[#5C5A52] hover:border-[#D48B3A] hover:text-[#D48B3A] transition-colors"
              >
                Lihat semua {reviewTotal} review →
              </Link>
            )}

            <button
              type="button"
              onClick={handleWriteReview}
              className="w-full mt-3 py-2.5 rounded-xl border-[1.5px] border-[#D48B3A] text-[#D48B3A] font-bold text-sm hover:bg-[#FDF6EC] transition-colors"
            >
              {reviewPreviews.length === 0 ? '✍️ Tulis ulasan pertama' : '+ Tulis Review'}
            </button>

            {/* Google Maps Reviews */}
            {googleReviews.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 bg-[#F8F9FF] border border-[#E8E4F0] rounded-full px-3 py-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="text-xs font-semibold text-[#5C5A52]">Google Maps Reviews</span>
                    <span className="text-xs text-[#8A8880]">({googleReviewTotal})</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {googleReviews.map((gr) => (
                    <GoogleReviewCard key={gr.id} review={gr} />
                  ))}
                </div>
                {googleReviewTotal > googleReviews.length && (
                  <Link
                    to={`${cafeUrl(cafe)}/reviews?source=google`}
                    className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-[#E8E4DD] text-sm font-semibold text-[#5C5A52] hover:border-[#4285F4] hover:text-[#4285F4] transition-colors"
                  >
                    Lihat semua {googleReviewTotal} Google review →
                  </Link>
                )}
              </div>
            )}
          </Section>

          {/* Leaderboard — top check-in users at this cafe */}
          <Section title="🏆 Top Check-in">
            <CafeLeaderboard cafeId={cafe.id} />
          </Section>

          {/* Vibes — read-only mood chips aggregated from reviews + scraping */}
          {moodChips.length > 0 && (
            <Section title="Vibes">
              <div className="flex flex-wrap gap-2">
                {moodChips.map((m) => (
                  <span
                    key={m.label}
                    className="inline-flex items-center gap-1.5 bg-[#FDF6EC] border border-[#D48B3A] text-[#D48B3A] text-sm font-bold px-3 py-1.5 rounded-full"
                  >
                    <span>{m.label}</span>
                    {m.count > 0 && (
                      <span className="text-xs font-semibold">· {m.count}</span>
                    )}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Photo grid — mobile/tablet only (desktop shows mosaic + "Show all" above) */}
          {validPhotos.length > 0 && (
            <div className="lg:hidden">
            <Section title="Photos">
              <div className="grid grid-cols-3 gap-2">
                {validPhotos.map((photo, i) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className="relative aspect-square overflow-hidden rounded-xl bg-[#F0EDE8] group"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || cafe.name}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = placeholderImage(cafe.id);
                      }}
                    />
                  </button>
                ))}
              </div>
            </Section>
            </div>
          )}

          {/* Menu */}
          {Object.keys(menusByCategory).length > 0 && (
            <Section title="Menu">
              <div className="bg-white rounded-2xl border border-[#F0EDE8] shadow-sm p-5 lg:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6">
                  {Object.entries(menusByCategory).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="text-xs font-semibold text-[#8A8880] uppercase tracking-wider mb-2">
                        {category}
                      </h3>
                      <div>
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-start py-2.5 border-b border-[#F0EDE8] last:border-0 gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[15px] text-[#1C1C1A]">
                                {item.itemName}
                              </div>
                              {item.description && (
                                <p className="text-xs text-[#8A8880] mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <span className="text-[15px] text-[#D48B3A] font-semibold whitespace-nowrap">
                              Rp {Number(item.price).toLocaleString('id-ID')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* RIGHT SIDEBAR — desktop only */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            {/* Action card */}
            <div className="bg-white border border-[#F0EDE8] rounded-2xl p-5 shadow-sm">
              {/* Stats */}
              <div className="flex items-center justify-around pb-4 mb-4 border-b border-[#F0EDE8]">
                <SidebarStat value={cafe.favoritesCount} label="Favorites" />
                <div className="w-px h-8 bg-[#F0EDE8]" />
                <SidebarStat value={cafe.bookmarksCount} label="Bookmarks" />
                {cafe.matchScore != null && (
                  <>
                    <div className="w-px h-8 bg-[#F0EDE8]" />
                    <SidebarStat
                      value={`${cafe.matchScore}%`}
                      label="Match"
                      accent
                    />
                  </>
                )}
              </div>

              {/* Primary action */}
              <button
                type="button"
                onClick={handleShortlist}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                  inShortlist
                    ? 'bg-[#D48B3A] text-white hover:bg-[#B97726]'
                    : 'bg-[#1C1C1A] text-white hover:bg-black'
                }`}
              >
                {inShortlist ? 'Added to Shortlist ✓' : 'Add to Shortlist'}
              </button>

              {/* Secondary actions */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleFavorite}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#F0EDE8] hover:border-[#D48B3A] hover:bg-[#FDF6EC] transition-colors"
                >
                  <Heart
                    size={18}
                    className={favorited ? 'text-red-500' : 'text-[#5C5A52]'}
                    fill={favorited ? 'currentColor' : 'none'}
                  />
                  <span className="text-sm font-semibold text-[#1C1C1A]">
                    Favorite
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleBookmark}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#F0EDE8] hover:border-[#D48B3A] hover:bg-[#FDF6EC] transition-colors"
                >
                  <Bookmark
                    size={18}
                    className={bookmarked ? 'text-[#D48B3A]' : 'text-[#5C5A52]'}
                    fill={bookmarked ? 'currentColor' : 'none'}
                  />
                  <span className="text-sm font-semibold text-[#1C1C1A]">
                    Bookmark
                  </span>
                </button>
              </div>

              {/* Maps link */}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 mt-3 py-2.5 rounded-xl bg-[#F0EDE8] hover:bg-[#E8E4DD] transition-colors"
              >
                <Navigation size={16} className="text-[#1C1C1A]" />
                <span className="text-sm font-semibold text-[#1C1C1A]">
                  Open in Google Maps
                </span>
              </a>
            </div>

            {/* Help text */}
            <p className="text-xs text-[#8A8880] text-center px-2">
              Shortlist menyimpan kafe ini untuk dikunjungi nanti. Kamu bisa lihat
              semua di halaman Shortlist.
            </p>
          </div>
        </aside>
      </div>

      {/* MOBILE / TABLET fixed bottom bar — hidden on desktop. Sits at bottom-0
          because nav bars are hidden on /cafe routes (matches mobile CafeDetailScreen). */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#F0EDE8] px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handleFavorite}
            className="flex flex-col items-center px-3 hover:bg-[#FAF9F6] rounded-lg py-1 transition-colors"
          >
            <Heart
              size={24}
              className={favorited ? 'text-red-500' : 'text-[#5C5A52]'}
              fill={favorited ? 'currentColor' : 'none'}
            />
            <span className="text-[10px] text-[#8A8880] mt-0.5">Favorite</span>
          </button>
          <button
            type="button"
            onClick={handleBookmark}
            className="flex flex-col items-center px-3 hover:bg-[#FAF9F6] rounded-lg py-1 transition-colors"
          >
            <Bookmark
              size={24}
              className={bookmarked ? 'text-[#D48B3A]' : 'text-[#5C5A52]'}
              fill={bookmarked ? 'currentColor' : 'none'}
            />
            <span className="text-[10px] text-[#8A8880] mt-0.5">Bookmark</span>
          </button>
          <button
            type="button"
            onClick={handleShortlist}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
              inShortlist
                ? 'bg-[#D48B3A] text-white'
                : 'bg-[#1C1C1A] text-white hover:bg-black'
            }`}
          >
            {inShortlist ? 'Added ✓' : 'Add to Shortlist'}
          </button>
        </div>
      </div>

      {reviewModalOpen && (
        <WriteReviewModal
          cafeId={cafe.id}
          cafeName={cafe.name}
          onClose={() => setReviewModalOpen(false)}
          onSubmitted={refreshReviewSummary}
        />
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={validPhotos.map((p) => ({ url: p.url, caption: p.caption }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  );
}

function GoogleReviewCard({ review }: { review: GoogleReview }) {
  const initials = review.guestName.charAt(0).toUpperCase();
  const stars = Array.from({ length: 5 }, (_, i) => i < review.rating);
  const date = new Date(review.scrapedAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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
                <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={filled ? '#FBBC05' : '#E8E4DD'}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              ))}
            </span>
            <span className="inline-flex items-center gap-1 bg-[#F0F4FF] border border-[#C7D3F5] rounded-full px-2 py-0.5">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-[10px] font-semibold text-[#4285F4]">Google Maps</span>
            </span>
          </div>
          <div className="text-[11px] text-[#8A8880]">{date}</div>
        </div>
      </div>
      {review.comment && (
        <p className="text-sm text-[#1C1C1A] leading-relaxed line-clamp-3">{review.comment}</p>
      )}
      {review.photoUrl && (
        <img
          src={review.photoUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="mt-2 w-full max-h-40 object-cover rounded-lg"
        />
      )}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 lg:mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg lg:text-xl font-bold text-[#1C1C1A]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function FacilityChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#F0EDE8] text-[#1C1C1A] text-sm font-medium px-3 py-1.5 rounded-full">
      <span className="text-sm">{icon}</span>
      {label}
    </span>
  );
}

function SidebarStat({
  value,
  label,
  accent,
}: {
  value: number | string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center">
      <span
        className={`text-xl font-bold ${accent ? 'text-[#D48B3A]' : 'text-[#1C1C1A]'}`}
      >
        {value}
      </span>
      <span className="text-[11px] text-[#8A8880] mt-0.5 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function HeroMosaic({
  photos,
  cafeName,
  onOpen,
  totalCount,
  onPhotoError,
}: {
  photos: { id: number; url: string; caption?: string | null }[];
  cafeName: string;
  onOpen: (i: number) => void;
  totalCount: number;
  onPhotoError?: (id: number) => void;
}) {
  // Track which tiles have finished loading so we can show a skeleton shimmer
  // on the rest. Avoids the "random photo flicker" that happened when slow /
  // expired URLs blanked out before onError swapped to a placeholder.
  const [loaded, setLoaded] = useState<Set<number>>(new Set());
  const markLoaded = (i: number) =>
    setLoaded((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });

  const tile = (
    p: { id: number; url: string; caption?: string | null },
    index: number,
    extra?: string,
  ) => {
    const isLoaded = loaded.has(index);
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => onOpen(index)}
        className={`relative overflow-hidden bg-[#F0EDE8] group ${extra ?? ''}`}
      >
        {/* Skeleton shimmer — visible until the image fires onLoad */}
        {!isLoaded && (
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[#F0EDE8] via-[#E8E4DD] to-[#F0EDE8] bg-[length:200%_100%] animate-[shimmer_1.4s_linear_infinite]"
          />
        )}
        <img
          src={p.url}
          alt={p.caption || cafeName}
          // no-referrer lets Google CDN photos through Chrome's ORB (Opaque
          // Response Blocking) which otherwise rejects gps-cs-s/grass-cs URLs
          // when the Referer points to a different domain.
          referrerPolicy="no-referrer"
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03] ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading={index === 0 ? 'eager' : 'lazy'}
          onLoad={() => markLoaded(index)}
          onError={() => {
            // Don't inject a placeholder per slot — let the parent know so it
            // can drop this photo and reshape the mosaic with only the working
            // ones. Synthetic placeholder photos (id < 0) can't be reported up
            // (there's nothing to drop), so just leave it as the bg colour.
            if (p.id >= 0) onPhotoError?.(p.id);
            markLoaded(index);
          }}
        />
      </button>
    );
  };

  const showAllBtn = totalCount > 1 && (
    <button
      type="button"
      onClick={() => onOpen(0)}
      className="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-[#1C1C1A] text-sm font-semibold px-4 py-2 rounded-full shadow-md flex items-center gap-2 transition-colors z-10"
    >
      <span>▦</span>
      <span>Show all {totalCount} photos</span>
    </button>
  );

  // 1 photo — single full-width hero
  if (photos.length === 1) {
    return (
      <div className="relative h-[480px] rounded-3xl overflow-hidden">
        {tile(photos[0], 0, 'block w-full h-full')}
      </div>
    );
  }

  // 2 photos — 50/50 split
  if (photos.length === 2) {
    return (
      <div className="relative grid grid-cols-2 gap-3 h-[480px] rounded-3xl overflow-hidden">
        {tile(photos[0], 0, 'h-full')}
        {tile(photos[1], 1, 'h-full')}
        {showAllBtn}
      </div>
    );
  }

  // 3 photos — 1 large left + 2 stacked right
  if (photos.length === 3) {
    return (
      <div className="relative grid grid-cols-2 gap-3 h-[480px] rounded-3xl overflow-hidden">
        {tile(photos[0], 0, 'h-full')}
        <div className="grid grid-rows-2 gap-3 h-full">
          {tile(photos[1], 1)}
          {tile(photos[2], 2)}
        </div>
        {showAllBtn}
      </div>
    );
  }

  // 4 photos — 1 large left + 3 stacked right
  if (photos.length === 4) {
    return (
      <div className="relative grid grid-cols-2 gap-3 h-[480px] rounded-3xl overflow-hidden">
        {tile(photos[0], 0, 'h-full')}
        <div className="grid grid-rows-3 gap-3 h-full">
          {tile(photos[1], 1)}
          {tile(photos[2], 2)}
          {tile(photos[3], 3)}
        </div>
        {showAllBtn}
      </div>
    );
  }

  // 5+ photos — Airbnb-style 1 large + 2x2 grid
  return (
    <div className="relative grid grid-cols-2 gap-3 h-[480px] rounded-3xl overflow-hidden">
      {tile(photos[0], 0, 'h-full')}
      <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
        {tile(photos[1], 1)}
        {tile(photos[2], 2)}
        {tile(photos[3], 3)}
        {tile(photos[4], 4)}
      </div>
      {showAllBtn}
    </div>
  );
}
