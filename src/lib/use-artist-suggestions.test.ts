import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtistSearchResponse, ArtistSuggestion } from './artist-search';
import { useArtistSuggestions, type ArtistSearchFn } from './use-artist-suggestions';

const artist = (name: string): ArtistSuggestion => ({ id: `id-${name}`, name, source: 'melodylust', sourceId: null, disambiguation: null, genres: [], imageUrl: null, provenance: null });
const ok = (...names: string[]): ArtistSearchResponse => ({ status: 'ok', results: names.map(artist), database: 'ok', provider: 'not_configured' });

describe('artist suggestions timing', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('waits for two characters, then debounces so a burst of typing makes one request', async () => {
    const search = vi.fn<ArtistSearchFn>(async () => ok('Usher'));
    const { result, rerender } = renderHook(({ q }) => useArtistSuggestions(q, search), { initialProps: { q: 'u' } });
    expect(result.current.status).toBe('idle');
    rerender({ q: 'us' }); rerender({ q: 'ush' }); rerender({ q: 'ushe' });
    expect(result.current.status).toBe('loading');
    await act(async () => { await vi.advanceTimersByTimeAsync(299); });
    expect(search).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]![0]).toBe('ushe');
    expect(result.current).toMatchObject({ status: 'ready', results: [{ name: 'Usher' }] });
  });

  it('cancels the outdated request and never lets an older answer replace a newer one', async () => {
    const resolvers: Record<string, (response: ArtistSearchResponse) => void> = {};
    const signals: Record<string, AbortSignal> = {};
    const search: ArtistSearchFn = (query, signal) => { signals[query] = signal; return new Promise(resolve => { resolvers[query] = resolve; }); };
    const { result, rerender } = renderHook(({ q }) => useArtistSuggestions(q, search), { initialProps: { q: 'gw' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); }); // request for "gw" is in flight
    rerender({ q: 'gwen' });
    expect(signals['gw']!.aborted).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(300); }); // request for "gwen" is in flight
    await act(async () => { resolvers['gwen']!(ok('Gwen Stefani')); });
    await act(async () => { resolvers['gw']!(ok('Gwen Stefani', 'Gwar')); }); // the stale answer arrives late
    expect(result.current).toMatchObject({ status: 'ready', query: 'gwen', results: [{ name: 'Gwen Stefani' }] });
  });

  it('tells connection errors and rate limits apart from "no matches"', async () => {
    const failing: ArtistSearchFn = async () => { throw new Error('network down'); };
    const { result } = renderHook(() => useArtistSuggestions('kali', failing));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(result.current.status).toBe('error');

    const limited: ArtistSearchFn = async () => ({ status: 'rate_limited', results: [], database: 'ok', provider: 'ok' });
    const { result: limitedResult } = renderHook(() => useArtistSuggestions('kali', limited));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(limitedResult.current.status).toBe('rate_limited');

    const empty: ArtistSearchFn = async () => ok();
    const { result: emptyResult } = renderHook(() => useArtistSuggestions('zzqx', empty));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(emptyResult.current).toMatchObject({ status: 'ready', results: [] });
  });
});
