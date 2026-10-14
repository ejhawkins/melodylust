import { Button } from '@/components/ui/button';
import { analyticsEnabled, type AnalyticsConsent as Consent } from '@/lib/analytics';

/** Asks before Google Analytics loads. Shown only once a Measurement ID is set and the reader hasn't chosen. */
export function AnalyticsConsent({ consent, onChoose }: { consent: Consent; onChoose: (value: 'granted' | 'denied') => void }) {
  if (!analyticsEnabled() || consent !== 'ask') return null;
  return <div className="film-consent analytics-consent" role="dialog" aria-modal="false" aria-labelledby="analytics-consent-title" aria-describedby="analytics-consent-note">
    <span className="film-consent-kicker">+ Reader analytics</span>
    <h2 className="film-consent-title" id="analytics-consent-title">May we count this visit?</h2>
    <p className="film-consent-note" id="analytics-consent-note">Google Analytics would show us which stories, songs and looks you read. It sets cookies, switches on only if you allow it, and its ad features stay off.</p>
    <div className="film-consent-actions">
      <Button variant="soundCta" onClick={() => onChoose('granted')}>Allow analytics</Button>
      <Button variant="editorial" onClick={() => onChoose('denied')}>No thanks</Button>
    </div>
  </div>;
}
