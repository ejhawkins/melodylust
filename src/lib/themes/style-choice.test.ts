import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chooseStyle, personalizationEnabled, readStyle, roomLabels, STYLE_STORAGE_KEY, styleKey, themeOf, useStyleChoice, withStyleParam } from './style-choice';

describe('reading the chosen style', () => {
  it('prefers the URL, then local storage', () => {
    expect(readStyle('?style=hiphop-runway', 'autumn-tartan')).toEqual({ primary: 'hiphop-runway' });
    expect(readStyle('', 'autumn-tartan')).toEqual({ primary: 'autumn-tartan' });
    expect(readStyle('?theme=hiphop-runway', null)).toEqual({ primary: 'hiphop-runway' }); // /listen's old links
  });

  it('treats ?style=none as the default look and ignores unknown ids', () => {
    expect(readStyle('?style=none', 'autumn-tartan')).toBeNull();
    expect(readStyle('?style=toString', 'constructor')).toBeNull();
    expect(readStyle('?style=bogus', 'hiphop-runway')).toEqual({ primary: 'hiphop-runway' });
  });

  it('writes a shareable URL that keeps other parameters and the hash', () => {
    expect(withStyleParam('https://www.melodylust.fashion/?q=usher&theme=autumn-tartan#look', { primary: 'hiphop-runway' }))
      .toBe('https://www.melodylust.fashion/?q=usher&style=hiphop-runway#look');
    expect(withStyleParam('https://www.melodylust.fashion/', null)).toBe('https://www.melodylust.fashion/?style=none');
  });

  it('keys one style by its theme id alone, so a later blend leaves these keys unchanged', () => {
    expect(styleKey(null)).toBeNull();
    expect(styleKey({ primary: 'hiphop-runway' })).toBe('hiphop-runway');
    expect(styleKey({ primary: 'hiphop-runway', secondary: 'hiphop-runway' })).toBe('hiphop-runway');
    expect(styleKey({ primary: 'hiphop-runway', secondary: 'autumn-tartan' })).toBe('hiphop-runway+autumn-tartan');
  });

  it('gives the theme labels to the listening room, or its defaults', () => {
    expect(roomLabels(themeOf({ primary: 'hiphop-runway' }))).toEqual({ silence: 'Backstage', listening: 'Walk-out', enter: 'Enter the walk-out' });
    expect(roomLabels(null).enter).toBe('Enter the listening room');
  });
});

describe('the picker state', () => {
  beforeEach(() => { localStorage.clear(); history.replaceState(null, '', '/?q=usher'); });
  afterEach(() => vi.unstubAllEnvs());

  it('is off unless the flag is exactly "true"', () => {
    expect(personalizationEnabled(undefined)).toBe(false);
    expect(personalizationEnabled('1')).toBe(false);
    expect(personalizationEnabled('true')).toBe(true);
    const { result } = renderHook(() => useStyleChoice());
    act(() => chooseStyle({ primary: 'autumn-tartan' }));
    expect(result.current.selection).toBeNull(); // flag off: nothing is applied
  });

  it('persists a choice to the URL and local storage, and clears both back to the default', () => {
    vi.stubEnv('VITE_ENABLE_AI_STYLE_PERSONALIZATION', 'true');
    const { result } = renderHook(() => useStyleChoice());
    expect(result.current.selection).toBeNull();
    act(() => result.current.choose({ primary: 'hiphop-runway' }));
    expect(result.current.theme?.label).toBe('Hip Hop x Runway');
    expect(location.search).toBe('?q=usher&style=hiphop-runway');
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBe('hiphop-runway');

    history.replaceState(null, '', '/'); // a fresh visit without the parameter falls back to storage
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(result.current.selection).toEqual({ primary: 'hiphop-runway' });

    act(() => result.current.choose(null));
    expect(result.current.selection).toBeNull();
    expect(location.search).toBe('?style=none');
    expect(localStorage.getItem(STYLE_STORAGE_KEY)).toBeNull();
  });
});
