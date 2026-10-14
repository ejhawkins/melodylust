// Google Analytics 4, loaded only after the reader allows it. Paste the Measurement ID (G-…)
// below; while it is empty nothing loads and no banner shows. The ID is public by design (it
// appears in every page's source), so it lives here rather than in a secret.

export const GA_MEASUREMENT_ID = 'G-TFEYRBGQ9Q';

export const ANALYTICS_CONSENT_KEY = 'ml-analytics-consent';
export type AnalyticsConsent = 'granted' | 'denied' | 'ask';

const MEASUREMENT_ID = /^G-[A-Z0-9]{4,}$/;
export const analyticsEnabled = (id = GA_MEASUREMENT_ID) => MEASUREMENT_ID.test(id);

/** The reader's saved choice; 'ask' when there is none or storage is unavailable. */
export function readAnalyticsConsent(): AnalyticsConsent {
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : 'ask';
  } catch { return 'ask'; }
}

export function saveAnalyticsConsent(value: Exclude<AnalyticsConsent, 'ask'>) {
  try { window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value); } catch { /* storage unavailable: asked again next visit */ }
}

type GtagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
let loadedId: string | null = null;

/** Adds Google's tag once, for an allowed reader only. Returns whether it is (now) loaded. */
export function loadGoogleAnalytics(id = GA_MEASUREMENT_ID) {
  if (typeof document === 'undefined' || !analyticsEnabled(id)) return false;
  const w = window as GtagWindow;
  if (loadedId === id) { w.gtag?.('consent', 'update', { analytics_storage: 'granted' }); return true; }
  loadedId = id;
  w.dataLayer = w.dataLayer ?? [];
  // gtag reads the arguments object itself, so this must stay a plain function.
  w.gtag = function gtag() { w.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
  w.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  w.gtag('js', new Date());
  w.gtag('config', id);
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
  return true;
}

/** A reader who withdraws: stop analytics storage for the rest of this visit; nothing loads on the next. */
export function denyGoogleAnalytics() {
  (window as GtagWindow).gtag?.('consent', 'update', { analytics_storage: 'denied' });
}
