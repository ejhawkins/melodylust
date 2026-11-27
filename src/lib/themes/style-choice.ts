// The reader's chosen room style: a runway season (Autumn Tartan) or a music genre (Hip Hop x Runway).
// Persisted in the URL (?style=, shareable) with local storage as the fallback. No accounts, no profile
// records: the choice never leaves the browser except as a theme id on a styling request.
//
// Behind VITE_ENABLE_AI_STYLE_PERSONALIZATION (off by default). Off: no style is ever chosen, so the room,
// search and AI step behave exactly as before.

import { useCallback, useSyncExternalStore } from 'react';
import { ROOM_THEMES, type RoomTheme, type ThemeId } from './theme-spec';

export const STYLE_PARAM = 'style';
/** /listen's original parameter, still read so its links keep working. */
export const LEGACY_STYLE_PARAM = 'theme';
export const STYLE_STORAGE_KEY = 'ml-room-style-v1';
/** In the URL, "none" means the default Melody Lust look, even if local storage holds a style. */
export const NO_STYLE = 'none';

export const THEME_IDS = Object.keys(ROOM_THEMES) as ThemeId[];
export const isThemeId = (value: unknown): value is ThemeId => typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROOM_THEMES, value);

/** One style now. `secondary` is reserved for a later blend; nothing reads it yet. */
export type StyleSelection = { primary: ThemeId; secondary?: ThemeId };

export function personalizationEnabled(value: unknown = import.meta.env['VITE_ENABLE_AI_STYLE_PERSONALIZATION']) {
  return value === 'true';
}

/** The stable id for caches: the theme id alone for one style, so adding blends later leaves today's keys unchanged. */
export const styleKey = (selection: StyleSelection | null) =>
  !selection ? null : selection.secondary && selection.secondary !== selection.primary ? `${selection.primary}+${selection.secondary}` : selection.primary;

export const themeOf = (selection: StyleSelection | null): RoomTheme | null => (selection ? ROOM_THEMES[selection.primary] : null);

/** URL first (?style=, then /listen's ?theme=), then local storage, else none. */
export function readStyle(search: string, stored: string | null): StyleSelection | null {
  const params = new URLSearchParams(search);
  const fromUrl = params.get(STYLE_PARAM) ?? params.get(LEGACY_STYLE_PARAM);
  if (fromUrl === NO_STYLE) return null;
  if (isThemeId(fromUrl)) return { primary: fromUrl };
  return isThemeId(stored) ? { primary: stored } : null;
}

/** The same address with ?style= set to the selection (or "none"); other parameters and the hash are kept. */
export function withStyleParam(href: string, selection: StyleSelection | null) {
  const url = new URL(href);
  url.searchParams.delete(LEGACY_STYLE_PARAM);
  url.searchParams.set(STYLE_PARAM, selection ? selection.primary : NO_STYLE);
  return url.toString();
}

// A tiny external store so every component (top bar, search, songs, loader) sees one choice.
const listeners = new Set<() => void>();
let snapshot: { key: string; selection: StyleSelection | null } | null = null;

function storage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
function current(): StyleSelection | null {
  if (typeof window === 'undefined' || !personalizationEnabled()) return null;
  let stored: string | null = null;
  try { stored = storage()?.getItem(STYLE_STORAGE_KEY) ?? null; } catch { /* private mode */ }
  const selection = readStyle(window.location.search, stored);
  const key = styleKey(selection) ?? '';
  if (!snapshot || snapshot.key !== key) snapshot = { key, selection };
  return snapshot.selection;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  window.addEventListener('storage', listener);
  return () => { listeners.delete(listener); window.removeEventListener('popstate', listener); window.removeEventListener('storage', listener); };
}

/** Writes the choice to the URL (replacing the entry, so Back isn't filled with style changes) and to local storage. */
export function chooseStyle(selection: StyleSelection | null) {
  if (typeof window === 'undefined') return;
  try {
    if (selection) storage()?.setItem(STYLE_STORAGE_KEY, selection.primary);
    else storage()?.removeItem(STYLE_STORAGE_KEY);
  } catch { /* private mode: the URL still carries it */ }
  window.history.replaceState(window.history.state, '', withStyleParam(window.location.href, selection));
  listeners.forEach(listener => listener());
}

export function useStyleChoice() {
  const selection = useSyncExternalStore(subscribe, current, () => null);
  const choose = useCallback((next: StyleSelection | null) => chooseStyle(next), []);
  return { enabled: personalizationEnabled(), selection, theme: themeOf(selection), choose };
}

/** The listening room's mode labels for a style; PR #12's room reads these in place of its defaults. */
export function roomLabels(theme: RoomTheme | null) {
  return theme
    ? { silence: theme.copy.silenceLabel, listening: theme.copy.listeningLabel, enter: theme.copy.enterCta }
    : { silence: 'Silence', listening: 'Listening', enter: 'Enter the listening room' };
}
