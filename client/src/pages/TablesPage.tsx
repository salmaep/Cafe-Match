import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Seo from "../components/seo/Seo";
import { tablesApi, type JoinRequestStatus } from "../api/tables.api";
import { useActiveTables } from "../context/ActiveTablesContext";
import { useAuth } from "../context/AuthContext";
import { cafeUrl } from "../utils/cafeUrl";
import { Check, Clock, Users, X } from "../utils/lucideIcon";

type Tab = "mine" | "requests";

const STATUS_CHIP: Record<
  JoinRequestStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Menunggu",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  accepted: {
    label: "Diterima",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  declined: {
    label: "Ditolak",
    className: "bg-red-50 text-red-600 border-red-200",
  },
  canceled: {
    label: "Dibatalkan",
    className: "bg-[#F0EDE8] text-[#8A8880] border-[#E8E4DD]",
  },
  expired: {
    label: "Kedaluwarsa",
    className: "bg-[#F0EDE8] text-[#8A8880] border-[#E8E4DD]",
  },
};

function timeLeft(expiresAt: string, now: number): string {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "berakhir";
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}j ${m}m lagi` : `${m}m lagi`;
}

function Avatar({
  name,
  url,
  size = "w-10 h-10 text-sm",
}: {
  name?: string | null;
  url?: string | null;
  size?: string;
}) {
  if (url) {
    return (
      <img src={url} alt="" className={`${size} rounded-full object-cover`} />
    );
  }
  const initials = (name ?? "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={`${size} rounded-full bg-[#D48B3A] text-white flex items-center justify-center font-extrabold shrink-0`}
    >
      {initials || "?"}
    </span>
  );
}

/** "Meja Nongkrong" — host management (accept/decline) + my outgoing requests. */
export default function TablesPage() {
  const { user } = useAuth();
  const { myTable, myRequests, refresh } = useActiveTables();
  const [tab, setTab] = useState<Tab>("mine");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (
    fn: () => Promise<unknown>,
    id: number,
    successMsg: string,
  ) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await fn();
      toast.success(successMsg);
      await refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal memproses");
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-3">🪑</p>
        <h1 className="text-lg font-bold text-[#1C1C1A] mb-2">
          Meja Nongkrong
        </h1>
        <p className="text-sm text-[#8A8880] mb-5">
          Login dulu untuk buka meja atau lihat request kamu.
        </p>
        <Link
          to="/login?redirect=%2Ftables"
          className="inline-block px-6 py-3 rounded-xl bg-[#1C1C1A] text-white font-bold text-sm hover:bg-black transition-colors"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <Seo title="Meja Nongkrong" />
      <h1 className="text-xl font-bold text-[#1C1C1A] mb-4">
        🪑 Meja Nongkrong
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(
          [
            ["mine", "Meja Saya"],
            ["requests", "Permintaan Saya"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              tab === key
                ? "bg-[#1C1C1A] text-white"
                : "bg-white border border-[#E8E4DD] text-[#5C5A52] hover:border-[#D48B3A]"
            }`}
          >
            {label}
            {key === "mine" && myTable?.pendingRequests?.length ? (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-[#D48B3A] text-white text-[10px]">
                {myTable.pendingRequests.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "mine" ? (
        !myTable ? (
          <div className="bg-white border border-[#F0EDE8] rounded-2xl p-8 text-center">
            <p className="text-3xl mb-2">☕</p>
            <p className="text-sm font-semibold text-[#1C1C1A] mb-1">
              Kamu belum buka meja
            </p>
            <p className="text-xs text-[#8A8880]">
              Buka meja dari halaman cafe atau lewat pin hijau di map untuk
              ngajak orang nongkrong bareng.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active table card */}
            <div className="bg-white border border-emerald-200 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">
                    Meja aktif
                  </p>
                  {myTable.cafe ? (
                    <Link
                      to={cafeUrl(myTable.cafe as any)}
                      className="text-lg font-bold text-[#1C1C1A] hover:underline"
                    >
                      {myTable.cafe.name}
                    </Link>
                  ) : (
                    <span className="text-lg font-bold text-[#1C1C1A]">
                      Cafe
                    </span>
                  )}
                  {myTable.title && (
                    <p className="text-sm text-[#5C5A52] mt-0.5">
                      “{myTable.title}”
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1C1C1A] shrink-0">
                  <Users size={14} strokeWidth={2} />
                  {myTable.acceptedCount}/{myTable.maxGuests}
                </span>
              </div>

              <p className="inline-flex items-center gap-1 text-xs text-[#8A8880] mb-3">
                <Clock size={12} strokeWidth={2} />
                {timeLeft(myTable.expiresAt, now)}
              </p>

              {/* Accepted members */}
              {myTable.members.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] font-bold text-[#5C5A52] uppercase tracking-wide mb-2">
                    Sudah gabung
                  </p>
                  <div className="space-y-2">
                    {myTable.members.map(
                      (m) =>
                        m && (
                          <div key={m.id} className="flex items-center gap-2.5">
                            <Avatar
                              name={m.name}
                              url={m.avatarUrl}
                              size="w-8 h-8 text-xs"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#1C1C1A] truncate">
                                {m.name}
                              </p>
                              {m.username && (
                                <p className="text-[11px] text-[#8A8880] truncate">
                                  @{m.username}
                                </p>
                              )}
                            </div>
                          </div>
                        ),
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  act(
                    () => tablesApi.close(myTable.id),
                    myTable.id,
                    "Meja ditutup",
                  )
                }
                disabled={busyId === myTable.id}
                className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors disabled:opacity-60"
              >
                Tutup Meja
              </button>
            </div>

            {/* Incoming requests */}
            <div className="bg-white border border-[#F0EDE8] rounded-2xl p-5">
              <p className="text-[11px] font-bold text-[#5C5A52] uppercase tracking-wide mb-3">
                Request masuk
              </p>
              {myTable.pendingRequests.length === 0 ? (
                <p className="text-sm text-[#8A8880]">
                  Belum ada yang minta gabung.
                </p>
              ) : (
                <div className="space-y-3">
                  {myTable.pendingRequests.map((r) => (
                    <div key={r.id} className="flex items-center gap-3">
                      <Avatar name={r.user?.name} url={r.user?.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#1C1C1A] truncate">
                          {r.user?.name ?? "User"}
                        </p>
                        <p className="text-[11px] text-[#8A8880] truncate">
                          {r.user?.username ? `@${r.user.username}` : ""}
                          {r.message ? ` · “${r.message}”` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Terima"
                        onClick={() =>
                          act(
                            () => tablesApi.accept(r.id),
                            r.id,
                            "Request diterima!",
                          )
                        }
                        disabled={busyId === r.id}
                        className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-60"
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        aria-label="Tolak"
                        onClick={() =>
                          act(
                            () => tablesApi.decline(r.id),
                            r.id,
                            "Request ditolak",
                          )
                        }
                        disabled={busyId === r.id}
                        className="w-9 h-9 rounded-full bg-white border border-[#E8E4DD] text-[#8A8880] flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-60"
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        /* Permintaan Saya */
        <div className="space-y-3">
          {myRequests.length === 0 ? (
            <div className="bg-white border border-[#F0EDE8] rounded-2xl p-8 text-center">
              <p className="text-3xl mb-2">📨</p>
              <p className="text-sm font-semibold text-[#1C1C1A] mb-1">
                Belum ada permintaan
              </p>
              <p className="text-xs text-[#8A8880]">
                Klik pin hijau di map untuk lihat meja terbuka dan minta gabung.
              </p>
            </div>
          ) : (
            myRequests.map((r) => {
              const chip = STATUS_CHIP[r.status];
              return (
                <div
                  key={r.id}
                  className="bg-white border border-[#F0EDE8] rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={r.table?.host?.name}
                      url={r.table?.host?.avatarUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#1C1C1A] truncate">
                        {r.table?.cafe?.name ?? "Cafe"}
                      </p>
                      <p className="text-[11px] text-[#8A8880] truncate">
                        Host: {r.table?.host?.name ?? "-"}
                        {r.table?.host?.username
                          ? ` (@${r.table.host.username})`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full border text-[10px] font-bold shrink-0 ${chip.className}`}
                    >
                      {chip.label}
                    </span>
                  </div>
                  {r.status === "pending" && (
                    <button
                      type="button"
                      onClick={() =>
                        act(
                          () => tablesApi.cancel(r.id),
                          r.id,
                          "Request dibatalkan",
                        )
                      }
                      disabled={busyId === r.id}
                      className="mt-3 w-full py-2 rounded-lg border border-[#E8E4DD] text-[#8A8880] text-xs font-bold hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-60"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
