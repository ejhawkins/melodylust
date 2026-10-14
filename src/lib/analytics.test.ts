import { beforeEach, describe, expect, it } from 'vitest';
import { ANALYTICS_CONSENT_KEY, analyticsEnabled, loadGoogleAnalytics, readAnalyticsConsent, saveAnalyticsConsent } from './analytics';

const tags = () => [...document.querySelectorAll('script[src^="https://www.googletagmanager.com/gtag/js"]')];

describe('Google Analytics consent', () => {
  beforeEach(() => window.localStorage.clear());

  it('stays off until a real Measurement ID is set', () => {
    expect(analyticsEnabled('')).toBe(false);
    expect(analyticsEnabled('UA-123')).toBe(false);
    expect(analyticsEnabled('G-ABC1234')).toBe(true);
    expect(loadGoogleAnalytics('')).toBe(false);
    expect(tags()).toHaveLength(0);
  });

  it('remembers the reader\'s choice and asks when there is none', () => {
    expect(readAnalyticsConsent()).toBe('ask');
    saveAnalyticsConsent('denied');
    expect(readAnalyticsConsent()).toBe('denied');
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'maybe');
    expect(readAnalyticsConsent()).toBe('ask');
  });

  it('adds Google\'s tag once, with ad features off', () => {
    expect(loadGoogleAnalytics('G-TEST1234')).toBe(true);
    expect(loadGoogleAnalytics('G-TEST1234')).toBe(true);
    expect(tags().map(tag => tag.getAttribute('src'))).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-TEST1234']);
    const layer = (window as Window & { dataLayer?: IArguments[] }).dataLayer ?? [];
    expect(layer.map(entry => [...entry])).toContainEqual(['consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }]);
    expect(layer.map(entry => [...entry])).toContainEqual(['config', 'G-TEST1234']);
  });
});
