import { useTranslation } from "react-i18next";
import { authText } from "@shared/i18n";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3084/api/v1";

const socialUrl = (provider: "google" | "facebook") =>
  `${API_BASE}/auth/${provider}`;

/**
 * "atau pakai Google / Facebook" divider + OAuth buttons, shared by the login
 * and register forms. Both providers hit the server OAuth start endpoint
 * (`/auth/<provider>`); on success the server creates the account if the email
 * is new (register) or signs the user in (login), then redirects back to
 * OAUTH_REDIRECT_URL. Same flow for both, so one component serves both pages.
 */
export default function SocialAuthButtons() {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[#F0EDE8]" />
        <span className="text-xs text-[#8A8880]">{t(authText.orWith)}</span>
        <div className="flex-1 h-px bg-[#F0EDE8]" />
      </div>

      <div className="space-y-2">
        <a
          href={socialUrl("google")}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-[#E8E4DD] rounded-xl text-[#1C1C1A] font-semibold text-sm hover:bg-[#FAF9F6] transition-colors"
        >
          <GoogleIcon />
          <span>{t(authText.google)}</span>
        </a>
        <a
          href={socialUrl("facebook")}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#1877F2] rounded-xl text-white font-semibold text-sm hover:bg-[#166FE5] transition-colors"
        >
          <FacebookIcon />
          <span>{t(authText.facebook)}</span>
        </a>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.28-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.35-2.1V7.07H2.18a11 11 0 0 0 0 9.86l3.67-2.83z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.67 2.83C6.72 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
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
