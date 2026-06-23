import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { recapsApi, type RecapData } from "../api/recaps.api";
import { placeholderImage } from "../utils/cafeImage";
import Seo from "../components/seo/Seo";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  Clock,
  Coffee,
  Crown,
  Flame,
  MapPin,
  Share2,
  Target,
} from "../utils/lucideIcon";

const DAY_TRANSLATE: Record<string, string> = {
  Monday: "Senin",
  Tuesday: "Selasa",
  Wednesday: "Rabu",
  Thursday: "Kamis",
  Friday: "Jumat",
  Saturday: "Sabtu",
  Sunday: "Minggu",
};

export default function RecapPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const year = parseInt(yearParam || `${new Date().getFullYear()}`, 10);

  const [recap, setRecap] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    recapsApi
      .get(year)
      .then((res) => setRecap(res.data?.recapData ?? null))
      .catch(() => setRecap(null))
      .finally(() => setLoading(false));
  }, [user, year]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await recapsApi.generate(year);
      setRecap(res.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Gagal bikin recap, coba lagi yuk.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const share = async () => {
    if (!recap) return;
    const text = `🎉 CafeMatch Recap ${year}: aku ${recap.yearTitle}!\n\n☕ ${recap.totalCheckins} check-in di ${recap.totalCafesVisited} cafe\n⏱️ ${recap.totalDurationHours} jam total nongkrong\n🏆 ${recap.achievementsUnlocked} achievement unlocked\n\nIkut ngafe juga di geser.id`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `CafeMatch Recap ${year}`,
          text,
          url: "https://geser.id",
        });
      } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-8 max-w-md text-center">
          <BarChart3 size={48} strokeWidth={1.5} className="mx-auto mb-3 text-[#D48B3A]" />
          <p className="text-[#1C1C1A] font-bold">
            Login dulu untuk lihat Recap kamu
          </p>
          <Link
            to={`/login?redirect=%2Frecap%2F${year}`}
            className="inline-block mt-4 px-6 py-2.5 bg-[#1C1C1A] text-white rounded-xl font-bold hover:bg-black"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  // Belum di-generate
  if (!recap) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-8 max-w-md w-full text-center">
          <BarChart3 size={48} strokeWidth={1.5} className="mx-auto mb-3 text-[#D48B3A]" />
          <h1 className="text-xl font-extrabold text-[#1C1C1A] mb-1">
            Recap {year} belum dibuat
          </h1>
          <p className="text-sm text-[#8A8880] mb-5">
            Lihat ringkasan perjalanan ngafemu sepanjang {year} — cafe favorit,
            total check-in, achievement, dll.
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold hover:bg-black disabled:opacity-60 transition-colors"
          >
            {generating ? "Membuat recap…" : "Buat Recap Saya"}
          </button>
          <Link
            to="/profile"
            className="block mt-3 text-sm text-[#8A8880] hover:text-[#1C1C1A] transition-colors"
          >
            ← Balik ke Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-12">
      <Seo title={`Recap ${year}`} description={`CafeMatch Recap ${year}`} />

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#F0EDE8]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="text-[#8A8880] hover:text-[#1C1C1A] text-sm font-semibold transition-colors"
          >
            ← Profile
          </button>
          <div className="text-xs font-bold text-[#5C5A52] tracking-wider uppercase">
            Recap {year}
          </div>
          <button
            type="button"
            onClick={share}
            className="text-[#D48B3A] hover:text-[#B97726] text-sm font-bold transition-colors"
          >
            Share
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-4">
        {/* Hero card — title */}
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 text-center">
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#8A8880] mb-2">
            Tahun {year} kamu adalah
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1C1A] tracking-tight">
            {recap.yearTitle}
          </h1>
        </div>

        {/* Big numbers — 2×2 mobile, 4-col desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <BigStat
            icon={Coffee}
            value={recap.totalCheckins.toLocaleString()}
            label="Check-in"
          />
          <BigStat
            icon={MapPin}
            value={recap.totalCafesVisited.toLocaleString()}
            label="Cafe unik"
          />
          <BigStat
            icon={Clock}
            value={`${recap.totalDurationHours}j`}
            label="Total nongkrong"
          />
          <BigStat
            icon={Flame}
            value={recap.longestStreak.toLocaleString()}
            label="Hari beruntun"
          />
        </div>

        {/* Top cafes */}
        {recap.topCafes.length > 0 && (
          <Section title="Top 5 cafe favorit">
            <div className="space-y-2 p-3">
              {recap.topCafes.map((c, i) => (
                <div
                  key={c.cafeId}
                  className="flex items-center gap-3 px-2 py-1.5"
                >
                  <div className="shrink-0 w-7 text-center text-base font-extrabold text-[#8A8880] tabular-nums">
                    {i + 1}
                  </div>
                  <img
                    src={c.photo || placeholderImage(c.cafeId)}
                    alt={c.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-lg object-cover bg-[#F0EDE8] shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        placeholderImage(c.cafeId);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[#1C1C1A] truncate">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-[#8A8880]">
                      {c.visits}× check-in
                    </div>
                  </div>
                  {i === 0 && (
                    <Crown
                      size={16}
                      strokeWidth={2.25}
                      className="text-[#F59E0B]"
                      fill="currentColor"
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Vibe + day + avg session — 3-col on desktop, all small info cards together */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <InfoCard icon={Target} label="Vibe favorit" value={recap.topPurpose} />
          <InfoCard
            icon={Calendar}
            label="Hari favorit"
            value={DAY_TRANSLATE[recap.favoriteDay] || recap.favoriteDay}
          />
          <InfoCard
            icon={Clock}
            label="Rata-rata sesi"
            value={
              recap.averageSessionMinutes >= 60
                ? `${Math.floor(recap.averageSessionMinutes / 60)}j ${recap.averageSessionMinutes % 60}m`
                : `${recap.averageSessionMinutes} menit`
            }
          />
        </div>

        {/* Social stats */}
        <Section title="Sosial tahun ini">
          <div className="grid grid-cols-3 divide-x divide-[#F0EDE8]">
            <SocialStat value={recap.friendsMade} label="Teman baru" />
            <SocialStat value={recap.totalReviews} label="Review" />
            <SocialStat
              value={recap.achievementsUnlocked}
              label="Achievement"
            />
          </div>
        </Section>

        {/* Share CTA — minimal */}
        <button
          type="button"
          onClick={share}
          className="w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold hover:bg-black transition-colors inline-flex items-center justify-center gap-2"
        >
          <Share2 size={16} strokeWidth={2} /> Bagikan Recap Saya
        </button>

        {/* Regenerate */}
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="w-full py-2 text-[#8A8880] hover:text-[#1C1C1A] text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {generating ? "Memperbarui…" : "↻ Perbarui Recap"}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[11px] font-bold text-[#8A8880] uppercase tracking-wider px-1 mb-1.5">
        {title}
      </h2>
      <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function BigStat({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0EDE8] p-4">
      <Icon size={20} strokeWidth={2} className="text-[#D48B3A] mb-1.5" />
      <div className="text-2xl sm:text-3xl font-extrabold text-[#1C1C1A] tabular-nums leading-none">
        {value}
      </div>
      <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider mt-1.5">
        {label}
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0EDE8] p-4 flex items-center gap-3">
      <Icon size={22} strokeWidth={2} className="shrink-0 text-[#D48B3A]" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-[#8A8880] uppercase tracking-wider">
          {label}
        </div>
        <div className="text-sm sm:text-base font-bold text-[#1C1C1A] truncate mt-0.5">
          {value}
        </div>
      </div>
    </div>
  );
}

function SocialStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center py-4">
      <div className="text-xl font-extrabold text-[#1C1C1A] tabular-nums leading-none">
        {value}
      </div>
      <div className="text-[10px] font-semibold text-[#8A8880] uppercase tracking-wider mt-1.5">
        {label}
      </div>
    </div>
  );
}
