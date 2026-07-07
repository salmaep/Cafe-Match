import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth, type PendingTwoFa } from "../../context/AuthContext";
import { authText } from "@shared/i18n";
import OtpStep from "./OtpStep";
import SocialAuthButtons from "./SocialAuthButtons";

export default function LoginForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingTwoFa | null>(null);
  const { login, verify2fa } = useAuth();
  const navigate = useNavigate();

  const goBackAfterAuth = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError(t(authText.fillAllFields));
      return;
    }
    setLoading(true);
    try {
      const twoFa = await login(email, password);
      if (twoFa) {
        setPending(twoFa);
      } else {
        goBackAfterAuth();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t(authText.loginFailed));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (otpId: string, code: string) => {
    await verify2fa(otpId, code);
    goBackAfterAuth();
  };

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
            <h1 className="text-2xl font-bold text-[#1C1C1A]">{t(authText.welcomeBack)}</h1>
            <p className="text-[15px] text-[#8A8880] mt-1 mb-5">
              {t(authText.loginSubtitle)}
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
                placeholder={t(authText.emailPlaceholder)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t(authText.passwordPlaceholder)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-[#F0EDE8] rounded-xl text-[15px] text-[#1C1C1A] placeholder:text-[#8A8880] focus:bg-white focus:ring-2 focus:ring-[#D48B3A]/30 outline-none border-none transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-base hover:bg-black disabled:opacity-60 transition-colors mt-2"
              >
                {loading ? t(authText.loginLoading) : t(authText.loginBtn)}
              </button>
            </form>

            <SocialAuthButtons />

            <div className="text-center text-sm text-[#8A8880] mt-5">
              {t(authText.noAccount)}
              <Link
                to="/register"
                className="text-[#D48B3A] font-semibold hover:underline"
              >
                {t(authText.switchToRegister)}
              </Link>
            </div>

            {/* <Link
              to="/"
              className="block text-center text-sm text-[#8A8880] mt-3 hover:text-[#1C1C1A] transition-colors"
            >
              Maybe later
            </Link> */}
          </>
        )}
      </div>
    </div>
  );
}
