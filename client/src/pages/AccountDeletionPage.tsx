import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/seo/Seo";
import { useAuth } from "../context/AuthContext";
import { usersApi } from "../api/users.api";
import { CheckCircle2, X, Zap } from "../utils/lucideIcon";

const CONTACT_EMAIL = "support@cafematch.id";

export default function AccountDeletionPage() {
  const { user } = useAuth();

  const [email, setEmail] = useState(user?.email ?? "");
  const [friendCode, setFriendCode] = useState("");
  const [reason, setReason] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isValid = email.trim().length > 0 && acknowledge;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await usersApi.requestAccountDeletion({
        email: email.trim(),
        friendCode: friendCode.trim() || undefined,
        reason: reason.trim() || undefined,
        acknowledge,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: unknown } } })?.response?.data
          ?.message ?? "Terjadi kesalahan. Coba lagi.";
      setError(Array.isArray(msg) ? (msg as string[]).join(", ") : String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-20">
      <Seo
        title="Hapus Akun"
        description="Ajukan permintaan penghapusan akun CafeMatch Anda."
      />

      <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
        {/* Title */}
        <h1 className="text-3xl font-extrabold text-[#1C1C1A] leading-tight tracking-tight mb-2">
          Hapus Akun
        </h1>
        <p className="text-sm text-[#8A8880] mb-8">
          Halaman ini untuk mengajukan permintaan penghapusan akun CafeMatch
          Anda.
        </p>

        <div className="space-y-6">
          {/* Self-service shortcut */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Zap
                size={22}
                strokeWidth={2}
                className="text-amber-600 shrink-0 mt-0.5"
                fill="currentColor"
              />
              <div className="flex-1">
                <p className="text-sm font-bold text-[#1C1C1A] mb-1">
                  Cara tercepat — Hapus langsung dari aplikasi
                </p>
                <p className="text-xs text-[#5C5A52] mb-3">
                  Jika Anda masih bisa login, gunakan cara ini. Akun langsung
                  dinonaktifkan dan data dihapus permanen setelah 30 hari.
                </p>
                <Link
                  to="/login?next=/profile"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1C1C1A] text-white text-sm font-semibold hover:bg-black transition-colors"
                >
                  Login &amp; Hapus Akun di Profil →
                </Link>
              </div>
            </div>
          </div>

          {/* Data deletion info */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F0EDE8]">
              <h2 className="text-sm font-bold text-[#1C1C1A]">
                Data yang akan dihapus
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#F0EDE8]">
              <div className="px-5 py-4">
                <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2">
                  Dihapus permanen setelah 30 hari
                </p>
                <ul className="space-y-1.5 text-xs text-[#5C5A52]">
                  {[
                    "Profil (nama, email, foto)",
                    "Shortlist & riwayat swipe",
                    "Bookmark & favorit cafe",
                    "Riwayat check-in & vote",
                    "Daftar teman (friend graph)",
                    "Ulasan yang pernah dibuat",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <X
                        size={12}
                        strokeWidth={2.5}
                        className="text-red-400 mt-0.5 shrink-0"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-5 py-4">
                <p className="text-[11px] font-bold text-[#8A8880] uppercase tracking-wider mb-2">
                  Tetap disimpan (anonim)
                </p>
                <ul className="space-y-1.5 text-xs text-[#5C5A52]">
                  {[
                    "Log keamanan & audit (anonim)",
                    "Analitik agregat anonim",
                    "Transaksi yang sudah selesai (kewajiban hukum/pajak)",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <span className="text-[#8A8880] mt-0.5 shrink-0">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Form or success state */}
          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <CheckCircle2
                size={40}
                strokeWidth={2}
                className="mx-auto mb-3 text-green-600"
              />
              <h2 className="text-base font-bold text-green-800 mb-2">
                Permintaan diterima
              </h2>
              <p className="text-sm text-green-700 mb-4">
                Tim kami akan memverifikasi dan memproses dalam maksimal{" "}
                <strong>30 hari kerja</strong>. Konfirmasi akan dikirim ke{" "}
                <strong>{email}</strong>.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-sm text-[#D48B3A] hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#F0EDE8]">
                <h2 className="text-sm font-bold text-[#1C1C1A]">
                  Formulir Permintaan
                </h2>
                <p className="text-xs text-[#8A8880] mt-0.5">
                  Tidak bisa login? Isi formulir ini dan kami akan memproses
                  manual.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-[#8A8880] uppercase tracking-wider mb-1.5">
                    Email Akun <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@contoh.com"
                    autoComplete="email"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#F0EDE8] text-[#1C1C1A] text-sm placeholder-[#A8A59C] focus:outline-none focus:ring-2 focus:ring-[#D48B3A]/40 border border-transparent"
                  />
                </div>

                {/* Friend code */}
                <div>
                  <label className="block text-xs font-bold text-[#8A8880] uppercase tracking-wider mb-1.5">
                    Friend Code{" "}
                    <span className="font-normal normal-case">(opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={friendCode}
                    onChange={(e) =>
                      setFriendCode(e.target.value.toUpperCase().slice(0, 8))
                    }
                    placeholder="Contoh: AB12CD34"
                    maxLength={8}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#F0EDE8] text-[#1C1C1A] text-sm placeholder-[#A8A59C] focus:outline-none focus:ring-2 focus:ring-[#D48B3A]/40 border border-transparent font-mono tracking-widest"
                  />
                  <p className="mt-1 text-[11px] text-[#A8A59C]">
                    Membantu kami memverifikasi akun Anda lebih cepat.
                  </p>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold text-[#8A8880] uppercase tracking-wider mb-1.5">
                    Alasan{" "}
                    <span className="font-normal normal-case">(opsional)</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value.slice(0, 1000))}
                    placeholder="Ceritakan alasan Anda menghapus akun..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#F0EDE8] text-[#1C1C1A] text-sm placeholder-[#A8A59C] focus:outline-none focus:ring-2 focus:ring-[#D48B3A]/40 border border-transparent resize-none"
                  />
                  <p className="mt-1 text-[11px] text-[#A8A59C] text-right">
                    {reason.length}/1000
                  </p>
                </div>

                {/* Acknowledge */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acknowledge}
                    onChange={(e) => setAcknowledge(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-red-600 shrink-0"
                  />
                  <span className="text-xs text-[#5C5A52] leading-relaxed group-hover:text-[#1C1C1A]">
                    Saya mengerti bahwa akun dan seluruh data saya akan dihapus
                    permanen setelah <strong>30 hari</strong> dan{" "}
                    <strong>tidak dapat dipulihkan</strong> setelah masa
                    tersebut.
                  </span>
                </label>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Mengirim..." : "Kirim Permintaan Hapus Akun"}
                </button>
              </form>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 pb-1 flex flex-wrap items-center justify-center gap-3 text-xs text-[#A8A59C]">
            <Link
              to="/privacy-policy"
              className="hover:text-[#1C1C1A] hover:underline transition-colors"
            >
              Kebijakan Privasi
            </Link>
            <span>·</span>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="hover:text-[#1C1C1A] hover:underline transition-colors"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
