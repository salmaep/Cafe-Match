import { useState, useEffect, useMemo } from "react";
import { reviewsApi } from "../../api/reviews.api";
import { cafesApi, type FilterGroup } from "../../api/cafes.api";
import { usePreferences } from "../../context/PreferencesContext";
import {
  Camera,
  ChevronLeft,
  Flame,
  Frown,
  Meh,
  Smile,
  Sparkles,
  Star,
  ThumbsUp,
  Video,
  X,
} from "../../utils/lucideIcon";
import { getPurposeBySlug } from "@shared/constants/purposes";
import { chipFromFacilityKey } from "@shared/constants/facilities";

const TOTAL_STEPS = 5;

interface MoodOption {
  key: string;
  label: string;
  /** Lucide icon name from server (purposes.icon). Resolved at render time. */
  icon: string | null;
}
interface FacilityOption {
  key: string;
  label: string;
  icon: string;
}

// Module-level cache so we don't re-hit /cafes/filters every time the modal opens.
let facilityCatalogCache: FilterGroup[] | null = null;
let facilityCatalogPromise: Promise<FilterGroup[]> | null = null;

async function loadFacilityCatalog(): Promise<FilterGroup[]> {
  if (facilityCatalogCache) return facilityCatalogCache;
  if (facilityCatalogPromise) return facilityCatalogPromise;
  facilityCatalogPromise = cafesApi
    .getFilters()
    .then((res) => {
      facilityCatalogCache = res.data?.groups ?? [];
      return facilityCatalogCache;
    })
    .catch((err) => {
      facilityCatalogPromise = null;
      throw err;
    });
  return facilityCatalogPromise;
}

type MediaItem = { url: string; type: "photo" | "video"; name: string };

interface Props {
  cafeId: number;
  cafeName: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function WriteReviewModal({
  cafeId,
  cafeName,
  onClose,
  onSubmitted,
}: Props) {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mood chips ← /purposes (cached in PreferencesContext, loaded once on app mount)
  const { serverPurposes } = usePreferences();
  const moodOptions: MoodOption[] = useMemo(
    () =>
      serverPurposes.map((p) => ({
        key: p.slug,
        label: p.name,
        icon: p.icon ?? null,
      })),
    [serverPurposes],
  );

  // Facility chips ← /cafes/filters (cached in module-level)
  const [facilityGroups, setFacilityGroups] = useState<FilterGroup[] | null>(
    facilityCatalogCache,
  );
  useEffect(() => {
    if (facilityCatalogCache) {
      setFacilityGroups(facilityCatalogCache);
      return;
    }
    let cancelled = false;
    loadFacilityCatalog()
      .then((g) => {
        if (!cancelled) setFacilityGroups(g);
      })
      .catch(() => {
        if (!cancelled) setFacilityGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const facilityOptions: FacilityOption[] = useMemo(() => {
    const groups = facilityGroups ?? [];
    return groups.flatMap((g) =>
      g.options.map((o) => ({
        key: o.key,
        label: o.label,
        icon: chipFromFacilityKey(o.key).icon,
      })),
    );
  }, [facilityGroups]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const toggleFacility = (key: string) =>
    setFacilities((p) =>
      p.includes(key) ? p.filter((k) => k !== key) : [...p, key],
    );

  const canProceed = () => {
    switch (step) {
      case 0:
        return mood !== null;
      case 4:
        return rating > 0;
      default:
        return true;
    }
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else handleSubmit();
  };
  const prev = () => step > 0 && setStep(step - 1);

  const onPickFiles = (kind: "photo" | "video", files: FileList | null) => {
    if (!files) return;
    const photoCount = media.filter((m) => m.type === "photo").length;
    const videoCount = media.filter((m) => m.type === "video").length;
    const limit = kind === "photo" ? 5 - photoCount : 2 - videoCount;
    const items: MediaItem[] = [];
    for (let i = 0; i < Math.min(files.length, limit); i++) {
      const f = files[i];
      items.push({ url: URL.createObjectURL(f), type: kind, name: f.name });
    }
    setMedia((p) => [...p, ...items]);
  };

  const removeMedia = (i: number) =>
    setMedia((p) => {
      const item = p[i];
      if (item) URL.revokeObjectURL(item.url);
      return p.filter((_, idx) => idx !== i);
    });

  const handleSubmit = async () => {
    if (!mood) {
      setError("Pilih mood dulu ya");
      setStep(0);
      return;
    }
    if (rating === 0) {
      setError("Kasih rating bintang dulu ya");
      setStep(4);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const ratings: { category: string; score: number }[] = [
        { category: `mood_${mood}`, score: 5 },
        ...facilities.map((f) => ({ category: `facility_${f}`, score: 5 })),
        { category: "overall", score: rating },
      ];
      const mediaPayload = media
        .filter((m) => m.url && m.url.length < 2000)
        .map((m) => ({ mediaType: m.type, url: m.url }));
      await reviewsApi.create(cafeId, {
        text: text.trim() || undefined,
        ratings,
        media: mediaPayload.length > 0 ? mediaPayload : undefined,
      });
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Gagal mengirim review";
      setError(typeof msg === "string" ? msg : msg[0]);
      setSubmitting(false);
    }
  };

  const photoCount = media.filter((m) => m.type === "photo").length;
  const videoCount = media.filter((m) => m.type === "video").length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF9F6] w-full max-w-xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#F0EDE8] text-[#8A8880] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2.25} />
          </button>
          <div className="text-sm font-extrabold text-[#1C1C1A] truncate px-3">
            Review {cafeName}
          </div>
          <div className="text-xs font-bold text-[#D48B3A] tabular-nums">
            {step + 1}/{TOTAL_STEPS}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mx-5 h-1 bg-[#F0EDE8] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#D48B3A] rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 0 && (
            <Step
              title="Mood kamu pas di sini?"
              hint="Pilih satu yang paling cocok"
            >
              <div className="grid grid-cols-2 gap-3">
                {moodOptions.map((m) => {
                  const active = mood === m.key;
                  const emoji = getPurposeBySlug(m.key)?.emoji;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMood(m.key)}
                      className={`flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all ${
                        active
                          ? "border-[#D48B3A] bg-[#FDF6EC]"
                          : "border-transparent bg-white hover:border-[#E8E4DD]"
                      }`}
                    >
                      {emoji ? (
                        <span className="text-3xl leading-none">{emoji}</span>
                      ) : (
                        <Sparkles
                          size={28}
                          strokeWidth={2}
                          className={active ? "text-[#D48B3A]" : "text-[#8A8880]"}
                        />
                      )}
                      <span
                        className={`text-sm font-bold ${
                          active ? "text-[#D48B3A]" : "text-[#1C1C1A]"
                        }`}
                      >
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 1 && (
            <Step
              title="Fasilitas apa yang kamu pake?"
              hint="Pilih semua yang relevan · opsional"
            >
              <div className="flex flex-wrap gap-2">
                {facilityOptions.map((f) => {
                  const active = facilities.includes(f.key);
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => toggleFacility(f.key)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all ${
                        active
                          ? "border-[#D48B3A] bg-[#FDF6EC]"
                          : "border-transparent bg-white hover:border-[#E8E4DD]"
                      }`}
                    >
                      <span className="text-sm leading-none">{f.icon}</span>
                      <span
                        className={`text-sm font-semibold ${
                          active ? "text-[#D48B3A]" : "text-[#1C1C1A]"
                        }`}
                      >
                        {f.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step
              title="Ceritain pengalaman kamu"
              hint="Opsional — skip aja kalau ga mau nulis"
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                maxLength={2000}
                placeholder="Cafe ini bikin ku ..."
                className="w-full bg-white border border-[#F0EDE8] rounded-2xl p-4 text-[15px] text-[#1C1C1A] placeholder:text-[#B8B5AD] focus:outline-none focus:border-[#D48B3A] focus:ring-2 focus:ring-[#D48B3A]/20 resize-none transition-colors"
              />
              <div className="text-right text-xs text-[#8A8880] mt-1.5">
                {text.length} / 2000
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step
              title="Upload foto & video"
              hint="Maksimal 5 foto, 2 video · opsional"
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col items-center justify-center py-5 rounded-2xl bg-white border-[1.5px] border-[#D48B3A]/40 hover:border-[#D48B3A] cursor-pointer transition-colors">
                  <Camera
                    size={28}
                    className="text-[#D48B3A] mb-1.5"
                    strokeWidth={1.8}
                  />
                  <span className="text-sm font-bold text-[#D48B3A]">
                    Foto ({photoCount}/5)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      onPickFiles("photo", e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <label className="flex flex-col items-center justify-center py-5 rounded-2xl bg-white border-[1.5px] border-[#D48B3A]/40 hover:border-[#D48B3A] cursor-pointer transition-colors">
                  <Video
                    size={28}
                    className="text-[#D48B3A] mb-1.5"
                    strokeWidth={1.8}
                  />
                  <span className="text-sm font-bold text-[#D48B3A]">
                    Video ({videoCount}/2)
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      onPickFiles("video", e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              {media.length > 0 && (
                <div className="flex gap-2.5 overflow-x-auto mt-4 pb-2">
                  {media.map((m, i) => (
                    <div key={i} className="relative shrink-0">
                      {m.type === "photo" ? (
                        <img
                          src={m.url}
                          alt={m.name}
                          className="w-20 h-20 rounded-xl object-cover bg-[#F0EDE8]"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-[#1C1C1A] flex items-center justify-center text-white">
                          <Video size={28} strokeWidth={1.8} />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                        aria-label="Remove"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Step>
          )}

          {step === 4 && (
            <Step title="Rating overall" hint="Seberapa bagus cafe ini?">
              <div className="flex items-center justify-center gap-2 mt-4">
                {[1, 2, 3, 4, 5].map((s) => {
                  const filled = (hoverRating || rating) >= s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      className={`leading-none transition-transform ${
                        filled ? "text-[#D48B3A]" : "text-[#E8E4DD]"
                      } hover:scale-110`}
                      aria-label={`${s} stars`}
                    >
                      <Star
                        size={42}
                        strokeWidth={1.5}
                        fill={filled ? "currentColor" : "none"}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-center text-base font-bold text-[#1C1C1A] mt-6 inline-flex items-center justify-center gap-1.5 w-full">
                {rating === 0 ? (
                  "Pilih bintang"
                ) : rating === 5 ? (
                  <>
                    <Flame size={18} strokeWidth={2} className="text-red-500" />
                    Mantap jiwa!
                  </>
                ) : rating === 4 ? (
                  <>
                    <Smile size={18} strokeWidth={2} className="text-emerald-500" />
                    Bagus banget
                  </>
                ) : rating === 3 ? (
                  <>
                    <ThumbsUp size={18} strokeWidth={2} className="text-amber-500" />
                    Oke lah
                  </>
                ) : rating === 2 ? (
                  <>
                    <Meh size={18} strokeWidth={2} className="text-[#8A8880]" />
                    Biasa aja
                  </>
                ) : (
                  <>
                    <Frown size={18} strokeWidth={2} className="text-[#8A8880]" />
                    Kurang
                  </>
                )}
              </div>
            </Step>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Nav */}
        <div className="flex gap-3 px-5 py-4 border-t border-[#F0EDE8] bg-white">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="flex-1 py-3 rounded-xl bg-[#F0EDE8] text-[#8A8880] font-bold text-sm hover:bg-[#E8E4DD] disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-1"
          >
            <ChevronLeft size={16} strokeWidth={2.25} />
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canProceed() || submitting}
            className="flex-1 py-3 rounded-xl bg-[#D48B3A] text-white font-extrabold text-sm hover:bg-[#B97726] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting
              ? "..."
              : step === TOTAL_STEPS - 1
                ? "Kirim Review"
                : "Next ›"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xl font-extrabold text-[#1C1C1A]">{title}</h3>
      <p className="text-sm text-[#8A8880] mt-1 mb-5">{hint}</p>
      {children}
    </div>
  );
}
