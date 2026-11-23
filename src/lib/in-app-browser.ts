// Social apps open links in their own built-in browser, which plays music badly: Spotify's embed often can't sign in
// there, and sound starts in a feed the reader may not expect. These apps name themselves in the user agent, so the
// site can tell when it's inside one. Some apps (X, for one) use the system browser view and can't be told apart.

/** Checked in order: Threads carries Instagram's name too, and Messenger carries Facebook's. */
const APPS: [RegExp, string][] = [
  [/\bBarcelona\b/, "Threads"],
  [/\bInstagram\b/i, "Instagram"],
  [/\bFBAN\/Messenger|\bMessengerForiOS|\bMessengerLite/i, "Messenger"],
  [/\bFBAN\/|\bFBAV\/|\bFB_IAB\/|\bFBIOS\b/, "Facebook"],
  [/\bmusical_ly\b|\bBytedanceWebview\b|\bTikTok\b/i, "TikTok"],
  [/\bSnapchat\b/i, "Snapchat"],
  [/\bPinterest\b/i, "Pinterest"],
  [/\bLinkedInApp\b/i, "LinkedIn"],
  [/\bLine\/\d/, "LINE"],
];

/** The app whose built-in browser this is, or null for a regular browser. */
export function inAppBrowserName(userAgent: string): string | null {
  for (const [pattern, name] of APPS) if (pattern.test(userAgent)) return name;
  return null;
}

export type BrowserHandoff = { label: string; href: string };

/** A link that leaves the built-in browser for the phone's own: Chrome by intent on Android (falling back to the page
 *  itself), Safari by its x-safari-https scheme on iPhone (iOS 17 and later). Null where there's no such link. */
export function browserHandoff(url: string, userAgent: string): BrowserHandoff | null {
  const page = new URL(url);
  if (page.protocol !== "https:" && page.protocol !== "http:") return null;
  if (/Android/i.test(userAgent)) {
    const scheme = page.protocol.slice(0, -1);
    const rest = `${page.host}${page.pathname}${page.search}${page.hash}`;
    return { label: "Open in Chrome", href: `intent://${rest}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end` };
  }
  if (/iPhone|iPad|iPod/i.test(userAgent)) return { label: "Open in Safari", href: `x-safari-${url}` };
  return null;
}

/** The Spotify page for an embed address (open.spotify.com/embed/track/… → open.spotify.com/track/…), which opens
 *  the Spotify app on phones that have it. Anything else comes back as it was. */
export function spotifyOpenUrl(embedSrc: string): string {
  const match = /^https:\/\/open\.spotify\.com\/embed\/([a-z]+)\/([A-Za-z0-9]+)/.exec(embedSrc);
  return match ? `https://open.spotify.com/${match[1]}/${match[2]}` : embedSrc;
}
