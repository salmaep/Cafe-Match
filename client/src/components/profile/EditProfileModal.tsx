import { useRef, useState, type FormEvent } from "react";
import { usersApi } from "../../api/users.api";
import { useAuth } from "../../context/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = "profile" | "password";

const MAX_AVATAR_BYTES = 50_000; // 50KB after compression — fits TEXT column comfortably

export default function EditProfileModal({ open, onClose }: Props) {
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");

  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0EDE8]">
          <h2 className="text-base font-bold text-[#1C1C1A]">Edit Profile</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full hover:bg-[#F0EDE8] text-[#8A8880] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 flex items-center gap-1 border-b border-[#F0EDE8]">
          <TabButton
            active={tab === "profile"}
            onClick={() => setTab("profile")}
          >
            👤 Profil
          </TabButton>
          <TabButton
            active={tab === "password"}
            onClick={() => setTab("password")}
          >
            🔒 Password
          </TabButton>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "profile" ? (
            <ProfileTab onClose={onClose} onSaved={() => refresh()} />
          ) : (
            <PasswordTab onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-sm font-bold transition-colors border-b-2 -mb-px ${
        active
          ? "text-[#D48B3A] border-[#D48B3A]"
          : "text-[#8A8880] border-transparent hover:text-[#1C1C1A]"
      }`}
    >
      {children}
    </button>
  );
}

function ProfileTab({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState<string>(
    (user as any)?.avatarUrl || "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = (user?.name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleFile = async (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar.");
      return;
    }
    try {
      const dataUrl = await compressImage(file, 256, 0.78);
      const sizeBytes = Math.round((dataUrl.length * 3) / 4);
      if (sizeBytes > MAX_AVATAR_BYTES) {
        // Try once more with lower quality
        const smaller = await compressImage(file, 192, 0.65);
        if (Math.round((smaller.length * 3) / 4) > MAX_AVATAR_BYTES) {
          setError("Gambarnya kegedean, pilih yang lain dong.");
          return;
        }
        setAvatarUrl(smaller);
      } else {
        setAvatarUrl(dataUrl);
      }
    } catch {
      setError("Gagal memproses gambar.");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || name.trim().length < 1) {
      setError("Nama tidak boleh kosong.");
      return;
    }
    setSubmitting(true);
    try {
      await usersApi.updateProfile({
        name: name.trim(),
        avatarUrl: avatarUrl,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal menyimpan profil.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-5 space-y-4">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#D48B3A] to-[#B45309] flex items-center justify-center text-white text-2xl font-extrabold shadow-lg ring-2 ring-white overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#1C1C1A] text-white text-sm flex items-center justify-center shadow-lg hover:bg-black transition-colors"
            title="Ganti foto"
          >
            📷
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs font-semibold text-[#D48B3A] hover:underline"
          >
            Upload foto
          </button>
          {avatarUrl && (
            <>
              <span className="text-[#D9D6CE]">·</span>
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                className="text-xs font-semibold text-red-500 hover:underline"
              >
                Hapus
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="text-xs font-bold text-[#8A8880] uppercase tracking-wider mb-1.5 block">
          Nama
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-base text-[#1C1C1A] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
        />
      </div>

      {/* Email (readonly) */}
      <div>
        <label className="text-xs font-bold text-[#8A8880] uppercase tracking-wider mb-1.5 block">
          Email
        </label>
        <input
          type="email"
          value={user?.email || ""}
          disabled
          className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-base text-[#8A8880] cursor-not-allowed"
        />
        <p className="text-[11px] text-[#A8A59C] mt-1">
          Email tidak bisa diubah. Hubungi support kalau perlu ganti.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-base hover:bg-black disabled:opacity-60 transition-colors"
      >
        {submitting ? "Lagi simpan…" : "Simpan"}
      </button>
    </form>
  );
}

function PasswordTab({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    setSubmitting(true);
    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal mengganti password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-5 space-y-4">
      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-100">
          ✓ Password berhasil diubah!
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}

      <PasswordField
        label="Password lama"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
      />
      <PasswordField
        label="Password baru"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
      />
      <PasswordField
        label="Konfirmasi password baru"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
      />

      <p className="text-[11px] text-[#A8A59C]">
        Min. 8 karakter, harus mengandung huruf besar, huruf kecil, dan angka.
      </p>

      <button
        type="submit"
        disabled={
          submitting || !currentPassword || !newPassword || !confirmPassword
        }
        className="w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-base hover:bg-black disabled:opacity-60 transition-colors"
      >
        {submitting ? "Mengubah…" : "Ubah Password"}
      </button>
    </form>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-xs font-bold text-[#8A8880] uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
          className="w-full px-4 py-3 pr-12 bg-[#F0EDE8] rounded-xl text-base text-[#1C1C1A] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-[#8A8880] hover:bg-[#E8E4DD] flex items-center justify-center text-base"
          aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        >
          {show ? "🙈" : "👁️"}
        </button>
      </div>
    </div>
  );
}

// Compress an image client-side using canvas to keep the base64 payload under
// the TEXT column cap. Returns a base64 data URL.
function compressImage(
  file: File,
  maxDim: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image load failed"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
