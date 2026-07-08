/**
 * Post-auth redirect rules: after a successful login the user must NEVER land
 * back on /login or /register (e.g. the register → login flow used to
 * navigate(-1) straight back to /register). Destination priority:
 *   1. a valid same-origin ?redirect= param (sent by CheckInButton, table
 *      modals, shortlist, etc.)
 *   2. the last non-auth in-app path (tracked in sessionStorage)
 *   3. "/" as the final fallback
 */

const LAST_PATH_KEY = "cm_last_path";

export function isAuthPath(path: string): boolean {
  return (
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/auth/") ||
    path.startsWith("/owner/login") ||
    path.startsWith("/owner/register")
  );
}

/** Call on every route change; remembers only non-auth in-app paths. */
export function rememberLastPath(pathnameSearch: string): void {
  if (isAuthPath(pathnameSearch)) return;
  try {
    sessionStorage.setItem(LAST_PATH_KEY, pathnameSearch);
  } catch {
    // storage unavailable (private mode) — fallback chain still ends at "/"
  }
}

/** Where to send the user after a successful login. */
export function getPostAuthRedirect(search: string): string {
  // 1) explicit ?redirect= — must be an in-app path (anti open-redirect: no
  //    absolute URLs / protocol-relative "//host") and not an auth page.
  const redirect = new URLSearchParams(search).get("redirect");
  if (
    redirect &&
    redirect.startsWith("/") &&
    !redirect.startsWith("//") &&
    !isAuthPath(redirect)
  ) {
    return redirect;
  }

  // 2) last tracked non-auth path
  try {
    const last = sessionStorage.getItem(LAST_PATH_KEY);
    if (last && last.startsWith("/") && !isAuthPath(last)) return last;
  } catch {
    // ignore
  }

  // 3) home
  return "/";
}
