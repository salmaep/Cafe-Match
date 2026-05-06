/**
 * Google Analytics 4 (gtag.js) helpers for the SPA.
 *
 * The script is loaded from main.tsx via initGA() once on boot, only when
 * VITE_GA_MEASUREMENT_ID is set. Page views are sent manually because
 * react-router doesn't fire a real page load.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId: string | undefined = import.meta.env.VITE_GA_MEASUREMENT_ID;
let initialized = false;

export function initGA(): void {
  if (initialized) return;
  if (!measurementId) return;
  if (typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  // send_page_view: false — we send page_view manually on route change so SPA navigations register.
  gtag('config', measurementId, { send_page_view: false });

  initialized = true;
}

export function trackPageView(path: string, title?: string): void {
  if (!measurementId) return;
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
  });
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!measurementId) return;
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, params);
}

export function useTrackPageView(): void {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
}
