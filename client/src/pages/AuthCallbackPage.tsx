import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, type PendingTwoFa } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import OtpStep from '../components/auth/OtpStep';
import PhoneEnrollStep from '../components/auth/PhoneEnrollStep';

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken, verify2fa } = useAuth();
  const { wizardCompleted } = usePreferences();
  const [pending, setPending] = useState<PendingTwoFa | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const twoFa = params.get('twoFaRequired');
    const enrollFlag = params.get('phoneEnrollRequired');
    if (token) {
      loginWithToken(token)
        .then(() => navigate(wizardCompleted ? '/' : '/discover', { replace: true }))
        .catch(() => setError('Sesi login gagal. Silakan coba lagi.'));
    } else if (twoFa === '1') {
      const otpId = params.get('otpId') || '';
      const expiresAt = params.get('expiresAt') || new Date(Date.now() + 5 * 60_000).toISOString();
      const phoneHint = params.get('phoneHint') || undefined;
      if (!otpId) {
        setError('Sesi 2FA tidak valid.');
        return;
      }
      setPending({ otpId, expiresAt, phoneHint });
    } else if (enrollFlag === '1') {
      const id = params.get('enrollmentId') || '';
      if (!id) {
        setError('Sesi enrollment tidak valid.');
        return;
      }
      setEnrollmentId(id);
    } else {
      setError('Tidak ada data login.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (otpId: string, code: string) => {
    await verify2fa(otpId, code);
    navigate(wizardCompleted ? '/' : '/discover', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 md:p-8">
        {enrollmentId ? (
          <PhoneEnrollStep
            enrollmentId={enrollmentId}
            onDone={() => navigate(wizardCompleted ? '/' : '/discover', { replace: true })}
            onCancel={() => navigate('/login', { replace: true })}
          />
        ) : pending ? (
          <OtpStep
            pending={pending}
            onVerify={handleVerify}
            onCancel={() => navigate('/login', { replace: true })}
          />
        ) : error ? (
          <>
            <h1 className="text-xl font-bold text-[#1C1C1A]">Login gagal</h1>
            <p className="text-sm text-[#8A8880] mt-2">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-4 w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-base hover:bg-black transition-colors"
            >
              Kembali ke Login
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center py-10">
            <div className="w-10 h-10 border-4 border-[#D48B3A] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
