import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth, type PendingTwoFa } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import OtpStep from './OtpStep';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3084/api/v1';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingTwoFa | null>(null);
  const { login, verify2fa } = useAuth();
  const { wizardCompleted } = usePreferences();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const destinationAfterLogin = () =>
    redirect && redirect.startsWith('/') ? redirect : wizardCompleted ? '/' : '/wizard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const twoFa = await login(email, password);
      if (twoFa) {
        setPending(twoFa);
      } else {
        navigate(destinationAfterLogin());
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (otpId: string, code: string) => {
    await verify2fa(otpId, code);
    navigate(destinationAfterLogin());
  };

  const socialUrl = (provider: 'google' | 'facebook') =>
    `${API_BASE}/auth/${provider}`;

  return (
    <div className="min-h-screen md:min-h-[calc(100vh-4rem)] bg-[#FAF9F6] flex items-end md:items-center justify-center px-4 md:px-6 pb-6 md:pb-12 pt-6">
      <div className="w-full max-w-md bg-white md:rounded-2xl rounded-t-3xl shadow-[0_-12px_32px_rgba(0,0,0,0.06)] md:shadow-xl p-6 md:p-8">
        <div className="md:hidden mx-auto w-10 h-1 rounded-full bg-[#D6CFC2] mb-5" />

        {pending ? (
          <OtpStep
            pending={pending}
            onVerify={handleVerify}
            onCancel={() => setPending(null)}
          />
        ) : (
          <>
            <h1 className="text-2xl font-bold text-[#1C1C1A]">Welcome Back</h1>
            <p className="text-[15px] text-[#8A8880] mt-1 mb-5">
              Login to save your favorites
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2.5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-base hover:bg-black disabled:opacity-60 transition-colors mt-2"
              >
                {loading ? 'Logging in…' : 'Login'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-[#F0EDE8]" />
              <span className="text-xs text-[#8A8880]">atau lanjutkan dengan</span>
              <div className="flex-1 h-px bg-[#F0EDE8]" />
            </div>

            {/* Social buttons */}
            <div className="space-y-2">
              <a
                href={socialUrl('google')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-[#E8E4DD] rounded-xl text-[#1C1C1A] font-semibold text-sm hover:bg-[#FAF9F6] transition-colors"
              >
                <GoogleIcon />
                <span>Google</span>
              </a>
              <a
                href={socialUrl('facebook')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#1877F2] rounded-xl text-white font-semibold text-sm hover:bg-[#166FE5] transition-colors"
              >
                <FacebookIcon />
                <span>Facebook</span>
              </a>
            </div>

            <div className="text-center text-sm text-[#8A8880] mt-5">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#D48B3A] font-semibold hover:underline">
                Register
              </Link>
            </div>

            <Link
              to="/"
              className="block text-center text-sm text-[#8A8880] mt-3 hover:text-[#1C1C1A] transition-colors"
            >
              Maybe later
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.35-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.67-2.83z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.67 2.83C6.72 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85V15.47H7.08V12h3.05V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.69.23 2.69.23v2.96h-1.51c-1.49 0-1.96.93-1.96 1.87V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z" />
    </svg>
  );
}
