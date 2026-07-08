import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  tablesApi,
  type OpenTable,
  type JoinRequestStatus,
} from "../../api/tables.api";
import { useActiveTables } from "../../context/ActiveTablesContext";
import { useAuth } from "../../context/AuthContext";
import { Users, X } from "../../utils/lucideIcon";
import OpenTableModal from "./OpenTableModal";

interface Props {
  cafe: { id: number; name: string };
  onClose: () => void;
}

const STATUS_LABEL: Record<JoinRequestStatus, string> = {
  pending: "Waiting for host…",
  accepted: "You're in ✓",
  declined: "Declined by host",
  canceled: "Canceled",
  expired: "Expired",
};

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "ended";
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    return (
      <img src={url} alt="" className="w-10 h-10 rounded-full object-cover" />
    );
  }
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="w-10 h-10 rounded-full bg-[#D48B3A] text-white flex items-center justify-center text-sm font-extrabold shrink-0">
      {initials || "?"}
    </span>
  );
}

/** List of open tables at a cafe (opened from the map pin) + request-to-join. */
export default function OpenTablesModal({ cafe, onClose }: Props) {
  const { user } = useAuth();
  const { refresh } = useActiveTables();
  const [tables, setTables] = useState<OpenTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [openForm, setOpenForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tablesApi.listByCafe(cafe.id);
      setTables(res.data ?? []);
    } catch {
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, [cafe.id]);

  useEffect(() => {
    load();
  }, [load]);

  const requestJoin = async (table: OpenTable) => {
    if (requestingId) return;
    setRequestingId(table.id);
    try {
      await tablesApi.requestJoin(table.id);
      toast.success("Request sent — wait for the host to accept!");
      await load();
      await refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send the request");
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-start justify-between p-5 pb-3 border-b border-[#F0EDE8]">
          <div>
            <h2 className="text-lg font-bold text-[#1C1C1A]">
              🪑 Open Tables
            </h2>
            <p className="text-sm text-[#8A8880]">{cafe.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A8880] hover:bg-[#F0EDE8]"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scrollbar-themed [--sb-track:#FFFFFF]">
          {loading ? (
            <div className="py-10 text-center text-sm text-[#8A8880]">
              Loading tables…
            </div>
          ) : tables.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-[#8A8880]">
                No open tables here yet.
              </p>
            </div>
          ) : (
            tables.map((t) => {
              const full = t.acceptedCount >= t.maxGuests;
              const disabled =
                t.isMine || full || !!t.myRequestStatus || requestingId === t.id;
              return (
                <div
                  key={t.id}
                  className="border border-[#F0EDE8] rounded-xl p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={t.host.name} url={t.host.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#1C1C1A] truncate">
                        {t.host.name}
                        {t.isMine && (
                          <span className="ml-1 text-[10px] font-semibold text-[#8A8880]">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#8A8880] truncate">
                        {t.host.username ? `@${t.host.username}` : " "}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1C1C1A]">
                      <Users size={13} strokeWidth={2} />
                      {t.acceptedCount}/{t.maxGuests}
                    </span>
                  </div>

                  {t.title && (
                    <p className="text-sm text-[#5C5A52] mt-2">“{t.title}”</p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {t.genderRule === "female_only" && (
                      <span className="px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-[10px] font-semibold text-pink-600">
                        Women only
                      </span>
                    )}
                    {t.genderRule === "male_only" && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-600">
                        Men only
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-[#8A8880] font-semibold">
                      {timeLeft(t.expiresAt)}
                    </span>
                  </div>

                  {!user ? (
                    <Link
                      to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                      className="mt-3 block w-full py-2 rounded-lg bg-[#1C1C1A] text-white text-xs font-bold text-center hover:bg-black transition-colors"
                    >
                      Log in to Request
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => requestJoin(t)}
                      disabled={disabled}
                      className="mt-3 w-full py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:bg-[#E8E4DD] disabled:text-[#8A8880]"
                    >
                      {t.isMine
                        ? "Your table"
                        : t.myRequestStatus
                          ? STATUS_LABEL[t.myRequestStatus]
                          : full
                            ? "Table full"
                            : requestingId === t.id
                              ? "Sending…"
                              : "Request to Join"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-[#F0EDE8]">
          <button
            type="button"
            onClick={() => setOpenForm(true)}
            className="w-full py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-colors"
          >
            🪑 Open a Table Here
          </button>
        </div>
      </div>

      {openForm && (
        <OpenTableModal
          cafe={cafe}
          onClose={() => setOpenForm(false)}
          onOpened={load}
        />
      )}
    </div>
  );
}
