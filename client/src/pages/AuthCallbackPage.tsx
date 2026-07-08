import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { getPostAuthRedirect } from "../utils/authRedirect";

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const { wizardCompleted } = usePreferences();
  const [error, setError] = useState("");

  useEffect(() => {
    // Social logins (Google/Facebook) always come back with a JWT — the email
    // is already provider-verified, so there's no 2FA/phone-enroll step here.
    const token = params.get("token");
    if (token) {
      loginWithToken(token)
        .then(() =>
          // Wizard onboarding wins for brand-new users; otherwise return to
          // the last non-auth page (never /login or /register).
          navigate(wizardCompleted ? getPostAuthRedirect("") : "/discover", {
            replace: true,
          }),
        )
        .catch(() => setError("Sesi login gagal, coba lagi yuk."));
    } else {
      setError("Tidak ada data login.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 md:p-8">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-[#1C1C1A]">Login gagal</h1>
            <p className="text-sm text-[#8A8880] mt-2">{error}</p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="mt-4 w-full py-3 bg-[#1C1C1A] text-white rounded-xl font-bold text-base hover:bg-black transition-colors"
            >
              Balik ke Login
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
