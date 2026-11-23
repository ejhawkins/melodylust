import { describe, expect, it } from 'vitest';
import { browserHandoff, inAppBrowserName, spotifyOpenUrl } from './in-app-browser';

const ua = {
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101 (iPhone15,2; iOS 18_1; en_US)',
  threads: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 361.0.0.30.106 (iPhone15,2; iOS 18_1; en_US) Instagram',
  facebook: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/485.0.0.62.104;]',
  messenger: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/470.0]',
  tiktok: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36 musical_ly_2023605030 BytedanceWebview/d8a21c6',
  snapchat: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/13.10.0.40 (like Safari/8618.1.15.10.15, panda)',
  safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  chrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

describe('inAppBrowserName', () => {
  it('names the social app whose browser this is', () => {
    expect(inAppBrowserName(ua.instagram)).toBe('Instagram');
    expect(inAppBrowserName(ua.threads)).toBe('Threads');
    expect(inAppBrowserName(ua.facebook)).toBe('Facebook');
    expect(inAppBrowserName(ua.messenger)).toBe('Messenger');
    expect(inAppBrowserName(ua.tiktok)).toBe('TikTok');
    expect(inAppBrowserName(ua.snapchat)).toBe('Snapchat');
  });
  it('leaves regular browsers alone', () => {
    expect(inAppBrowserName(ua.safari)).toBeNull();
    expect(inAppBrowserName(ua.chrome)).toBeNull();
    expect(inAppBrowserName(ua.desktop)).toBeNull();
  });
});

describe('browserHandoff', () => {
  it('hands Android to Chrome, falling back to the page itself', () => {
    const handoff = browserHandoff('https://www.melodylust.fashion/home?x=1', ua.facebook);
    expect(handoff?.label).toBe('Open in Chrome');
    expect(handoff?.href).toBe(`intent://www.melodylust.fashion/home?x=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent('https://www.melodylust.fashion/home?x=1')};end`);
  });
  it('hands iPhone to Safari', () => {
    expect(browserHandoff('https://www.melodylust.fashion/', ua.instagram)).toEqual({ label: 'Open in Safari', href: 'x-safari-https://www.melodylust.fashion/' });
  });
  it('has nothing to offer on desktop', () => {
    expect(browserHandoff('https://www.melodylust.fashion/', ua.desktop)).toBeNull();
  });
});

describe('spotifyOpenUrl', () => {
  it('turns an embed address into the Spotify page that opens the app', () => {
    expect(spotifyOpenUrl('https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?utm_source=generator&theme=0')).toBe('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');
    expect(spotifyOpenUrl('https://open.spotify.com/embed/playlist/1lcqw2N8tBqiXRbEQ6iAlg')).toBe('https://open.spotify.com/playlist/1lcqw2N8tBqiXRbEQ6iAlg');
  });
  it('leaves other addresses as they are', () => {
    expect(spotifyOpenUrl('https://www.youtube-nocookie.com/embed/abc')).toBe('https://www.youtube-nocookie.com/embed/abc');
  });
});
