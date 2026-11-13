import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ANALYTICS_CONSENT_EVENT, readAnalyticsConsent } from '@/lib/analytics';

/** Vercel Web Analytics on every page, but only for a reader who allowed analytics; a reader who withdraws stops being counted at once. */
export function VercelAnalytics() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const sync = () => setAllowed(readAnalyticsConsent() === 'granted');
    sync();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, sync);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, sync);
  }, []);
  // Once loaded the script stays on the page, so each event re-checks the choice.
  return allowed ? <Analytics beforeSend={event => (readAnalyticsConsent() === 'granted' ? event : null)} /> : null;
}
