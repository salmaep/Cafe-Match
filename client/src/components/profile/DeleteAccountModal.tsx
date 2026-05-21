import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { usersApi } from "../../api/users.api";
import { useAuth } from "../../context/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DeleteAccountModal({ open, onClose }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [credential, setCredential] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !user) return null;

  const u = user as unknown as { passwordHash?: string; provider?: string };
  const isOAuth = !u.passwordHash && u.provider !== "local";
  const needsEmail = isOAuth;

  const isValid = credential.trim().length > 0 && acknowledge;

  const handleClose = () => {
    setCredential("");
    setAcknowledge(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await usersApi.deleteAccount({
        ...(needsEmail
          ? { emailConfirmation: credential.trim() }
          : { password: credential }),
        acknowledge,
      });
      logout();
      navigate("/", { replace: true });
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
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0EDE8]">
          <h2 className="text-base font-bold text-red-600">Hapus Akun</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full hover:bg-[#F0EDE8] text-[#8A8880] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        >
          {/* Warning banner */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-xl leading-none mt-0.5">⚠️</span>
              <div>
                <p className="text-sm font-bold text-red-700">
                  Akun akan dinonaktifkan sekarang
                </p>
                <ul className="mt-1.5 space-y-1 text-xs text-red-600 list-disc list-inside">
                  <li>
                    Data (shortlist, bookmark, check-in, teman) akan hilang
                    permanen setelah <strong>30 hari</strong>.
                  </li>
                  <li>
                    Login kembali dalam 30 hari untuk memulihkan akun Anda.
                  </li>
                  <li>Setelah 30 hari, akun tidak dapat dipulihkan.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Credential input */}
          <div>
            <label className="block text-xs font-bold text-[#8A8880] uppercase tracking-wider mb-1.5">
              {needsEmail
                ? `Ketik email Anda (${user.email}) untuk konfirmasi`
                : "Masukkan password untuk konfirmasi"}
            </label>
            <input
              type={needsEmail ? "text" : "password"}
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder={needsEmail ? user.email : "Password Anda"}
              autoComplete={needsEmail ? "email" : "current-password"}
              className="w-full px-3 py-2.5 rounded-xl bg-[#F0EDE8] text-[#1C1C1A] text-sm placeholder-[#A8A59C] focus:outline-none focus:ring-2 focus:ring-red-300 border border-transparent"
            />
          </div>

          {/* Acknowledge checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={acknowledge}
              onChange={(e) => setAcknowledge(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-red-600 shrink-0"
            />
            <span className="text-xs text-[#5C5A52] leading-relaxed group-hover:text-[#1C1C1A]">
              Saya mengerti bahwa akun ini akan dihapus permanen setelah 30 hari
              dan <strong>tidak dapat dipulihkan</strong> setelah masa tersebut.
            </span>
          </label>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1 pb-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-[#F0EDE8] bg-white text-[#1C1C1A] text-sm font-semibold hover:bg-[#FAF9F6] transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Memproses..." : "Hapus Akun Saya"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
