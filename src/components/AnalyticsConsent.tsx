import { Button } from '@/components/ui/button';
import { analyticsEnabled, type AnalyticsConsent as Consent } from '@/lib/analytics';

/** Asks before Google Analytics or Vercel Analytics load. Shown only once a Measurement ID is set and the reader hasn't chosen. */
export function AnalyticsConsent({ consent, onChoose, tone }: { consent: Consent; onChoose: (value: 'granted' | 'denied') => void;
  /** "room" dresses the question in the Listening Room's tokens and lifts it clear of the player bar. */
  tone?: 'room' }) {
  if (!analyticsEnabled() || consent !== 'ask') return null;
  return <div className={`film-consent analytics-consent${tone === 'room' ? ' ls-consent' : ''}`} role="dialog" aria-modal="false" aria-labelledby="analytics-consent-title" aria-describedby="analytics-consent-note">
    <span className="film-consent-kicker">+ Reader analytics</span>
    <h2 className="film-consent-title" id="analytics-consent-title">May we count this visit?</h2>
    <p className="film-consent-note" id="analytics-consent-note">Google Analytics and Vercel Analytics would show us which stories, songs and looks you read. Google’s sets cookies. Both switch on only if you allow it, and ad features stay off.</p>
    <div className="film-consent-actions">
      <Button variant={tone === 'room' ? 'listenSolid' : 'soundCta'} {...(tone === 'room' ? { size: 'bar' as const } : {})} onClick={() => onChoose('granted')}>Allow analytics</Button>
      <Button variant={tone === 'room' ? 'listenOutline' : 'editorial'} {...(tone === 'room' ? { size: 'bar' as const } : {})} onClick={() => onChoose('denied')}>No thanks</Button>
    </div>
  </div>;
}
