import { useEffect, useRef, useState, type FormEvent } from 'react';
import { authApi } from '../../api/auth.api';
import type { PendingTwoFa } from '../../context/AuthContext';

interface Props {
  pending: PendingTwoFa;
  onVerify: (otpId: string, code: string) => Promise<void>;
  onCancel: () => void;
}

const RESEND_COOLDOWN_MS = 60_000;

function fmtTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function OtpStep({ pending: initial, onVerify, onCancel }: Props) {
  const [pending, setPending] = useState<PendingTwoFa>(initial);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const lastSentAt = useRef(Date.now());
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const expiresMs = new Date(pending.expiresAt).getTime() - now;
  const cooldownLeft = Math.max(0, RESEND_COOLDOWN_MS - (now - lastSentAt.current));
  const expired = expiresMs <= 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('Kode harus 6 digit angka.');
      return;
    }
    setSubmitting(true);
    try {
      await onVerify(pending.otpId, code);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verifikasi gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (cooldownLeft > 0 || resending) return;
    setError('');
    setResending(true);
    try {
      const res = await authApi.resend2fa({ otpId: pending.otpId });
      setPending({ otpId: res.data.otpId, expiresAt: res.data.expiresAt, phoneHint: pending.phoneHint });
      lastSentAt.current = Date.now();
      setCode('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Tidak dapat mengirim ulang kode.');
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="text-center mb-2">
        <div className="inline-flex w-12 h-12 rounded-full bg-[#FFF1E0] items-center justify-center text-2xl mb-2">
          💬
        </div>
        <h2 className="text-lg font-bold text-[#1C1C1A]">Verifikasi WhatsApp</h2>
        <p className="text-sm text-[#8A8880] mt-1">
          Masukkan kode 6-digit yang kami kirim ke{' '}
          <span className="font-semibold text-[#1C1C1A]">
            {pending.phoneHint || 'WhatsApp Anda'}
          </span>
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}

      <input
        autoFocus
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="••••••"
        className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-center text-2xl tracking-[0.6em] font-bold text-[#1C1C1A] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
      />

      <div className="flex items-center justify-between text-xs text-[#8A8880]">
        <span>
          {expired ? (
            <span className="text-red-600 font-semibold">Kode kedaluwarsa</span>
          ) : (
            <>Kedaluwarsa dalam <span className="font-semibold text-[#1C1C1A]">{fmtTime(expiresMs)}</span></>
          )}
        </span>
        <button
          type="button"
          onClick={resend}
          disabled={cooldownLeft > 0 || resending}
          className="font-semibold text-[#D48B3A] hover:underline disabled:opacity-40 disabled:no-underline"
        >
          {cooldownLeft > 0
            ? `Kirim ulang (${Math.ceil(cooldownLeft / 1000)}s)`
            : resending
              ? 'Mengirim…'
              : 'Kirim ulang'}
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting || expired || code.length !== 6}
        className="w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-base hover:bg-black disabled:opacity-60 transition-colors"
      >
        {submitting ? 'Memverifikasi…' : 'Verifikasi'}
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
