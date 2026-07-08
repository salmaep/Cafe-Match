import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { tablesApi, type TableGenderRule } from "../../api/tables.api";
import { useActiveTables } from "../../context/ActiveTablesContext";
import { useAuth } from "../../context/AuthContext";
import { X } from "../../utils/lucideIcon";

interface Props {
  cafe: { id: number; name: string };
  onClose: () => void;
  /** Called after the table is successfully opened. */
  onOpened?: () => void;
}

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

/** Host form: open a table at this cafe (no check-in / GPS required). */
export default function OpenTableModal({ cafe, onClose, onOpened }: Props) {
  const { user } = useAuth();
  const { refresh } = useActiveTables();
  const [title, setTitle] = useState("");
  const [maxGuests, setMaxGuests] = useState(4);
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [genderRule, setGenderRule] = useState<TableGenderRule>("any");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await tablesApi.open({
        cafeId: cafe.id,
        title: title.trim() || undefined,
        maxGuests,
        genderRule,
        friendsOnly,
      });
      toast.success(`Meja dibuka di ${cafe.name}!`);
      await refresh();
      onOpened?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal membuka meja");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1250] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-lg font-bold text-[#1C1C1A]">🪑 Buka Meja</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A8880] hover:bg-[#F0EDE8]"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <p className="text-sm text-[#8A8880] mb-4">
          di <span className="font-semibold text-[#1C1C1A]">{cafe.name}</span> ·
          otomatis tutup setelah 8 jam
        </p>

        {!user ? (
          <Link
            to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
            className="block w-full py-3 rounded-xl bg-[#1C1C1A] text-white font-bold text-sm text-center hover:bg-black transition-colors"
          >
            Login untuk Buka Meja
          </Link>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5C5A52] mb-1.5">
                Judul (opsional)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Nugas bareng, bawa laptop…"
                className="w-full px-3.5 py-2.5 bg-[#F0EDE8] rounded-xl text-sm text-[#1C1C1A] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C5A52] mb-1.5">
                Maksimal tamu
              </label>
              <div className="flex flex-wrap gap-1.5">
                {GUEST_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaxGuests(n)}
                    className={`w-10 h-9 rounded-lg text-sm font-bold transition-colors ${
                      maxGuests === n
                        ? "bg-[#D48B3A] text-white"
                        : "bg-white border border-[#E8E4DD] text-[#5C5A52] hover:border-[#D48B3A]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C5A52] mb-1.5">
                Siapa yang boleh join?
              </label>
              <select
                value={genderRule}
                onChange={(e) => setGenderRule(e.target.value as TableGenderRule)}
                className="w-full px-3.5 py-2.5 bg-[#F0EDE8] rounded-xl text-sm text-[#1C1C1A] outline-none border-none"
              >
                <option value="any">Siapa saja</option>
                <option value="female_only">Perempuan saja</option>
                <option value="male_only">Laki-laki saja</option>
              </select>
              {genderRule !== "any" && !user.gender && (
                <p className="text-[11px] text-amber-700 mt-1.5">
                  Atur gender kamu dulu di{" "}
                  <Link to="/profile" className="underline font-semibold">
                    Edit Profile
                  </Link>{" "}
                  untuk pakai aturan ini.
                </p>
              )}
            </div>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-semibold text-[#1C1C1A]">
                Khusus teman saja
                <span className="block text-[11px] font-normal text-[#8A8880]">
                  Hanya teman di Geser yang bisa request join
                </span>
              </span>
              <input
                type="checkbox"
                checked={friendsOnly}
                onChange={(e) => setFriendsOnly(e.target.checked)}
                className="w-5 h-5 accent-[#D48B3A]"
              />
            </label>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {submitting ? "Membuka meja…" : "Buka Meja"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
