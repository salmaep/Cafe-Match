import { useState, type FormEvent } from 'react';
import { authApi } from '../../api/auth.api';
import { useAuth, type PendingTwoFa } from '../../context/AuthContext';
import OtpStep from './OtpStep';

interface Props {
  enrollmentId: string;
  onDone: () => void;
  onCancel: () => void;
}

// Normalise Indonesian phone input to BE format ("62..."). Accepts:
//   "+6281…" / "6281…" → "6281…"
//   "0812…"            → "62812…"
//   "812…"  (no prefix) → "62812…"
function normalizeIdPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

export default function PhoneEnrollStep({ enrollmentId, onDone, onCancel }: Props) {
  const { loginWithToken } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<PendingTwoFa | null>(null);

  const normalized = normalizeIdPhone(phone);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (normalized.length < 10 || normalized.length > 15) {
      setError('Nomor HP tidak valid. Contoh: 081234567890 atau 6281234567890.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authApi.socialEnrollPhone({ enrollmentId, phone: normalized });
      setPending({
        otpId: res.data.otpId,
        expiresAt: res.data.expiresAt,
        phoneHint: normalized.slice(0, 4) + '***' + normalized.slice(-2),
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengirim kode OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async (otpId: string, code: string) => {
    const res = await authApi.socialVerifyPhone({
      enrollmentId,
      otpId,
      code,
      phone: normalized,
    });
    await loginWithToken(res.data.accessToken);
    onDone();
  };

  if (pending) {
    return (
      <OtpStep
        pending={pending}
        onVerify={verify}
        onCancel={() => setPending(null)}
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="text-center mb-2">
        <div className="inline-flex w-12 h-12 rounded-full bg-[#FFF1E0] items-center justify-center text-2xl mb-2">
          📱
        </div>
        <h2 className="text-lg font-bold text-[#1C1C1A]">Verifikasi Nomor WhatsApp</h2>
        <p className="text-sm text-[#8A8880] mt-1">
          Masukkan nomor WhatsApp aktif Anda. Kami akan mengirim kode OTP untuk
          memverifikasi akun.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}

      <input
        autoFocus
        inputMode="tel"
        pattern="[0-9+]*"
        maxLength={16}
        value={phone}
        onChange={(e) => {
          // Allow digits and a single leading "+" for visual comfort.
          const cleaned = e.target.value
            .replace(/[^\d+]/g, '')
            .replace(/(?!^)\+/g, '');
          setPhone(cleaned);
        }}
        placeholder="cth. 081234567890 / 6281234567890"
        className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-base font-semibold text-[#1C1C1A] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
      />
      <p className="text-xs text-[#8A8880]">
        Bisa mulai dengan <span className="font-semibold">+62</span>,{' '}
        <span className="font-semibold">62</span>, atau{' '}
        <span className="font-semibold">08</span>
        {normalized && normalized !== phone.replace(/\D/g, '') && (
          <>
            {' '}— akan dikirim sebagai{' '}
            <span className="font-semibold text-[#1C1C1A]">{normalized}</span>
          </>
        )}
      </p>

      <button
        type="submit"
        disabled={submitting || normalized.length < 10}
        className="w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-base hover:bg-black disabled:opacity-60 transition-colors"
      >
        {submitting ? 'Mengirim kode…' : 'Kirim Kode OTP'}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-center text-sm text-[#8A8880] hover:text-[#1C1C1A] transition-colors"
      >
        Batal — kembali ke login
      </button>
    </form>
  );
}
