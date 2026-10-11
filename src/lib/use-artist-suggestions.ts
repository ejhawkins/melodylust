// Autocomplete timing for the artist field: wait for 2+ characters, debounce ~300 ms, cancel
// the previous request when a newer one starts, and never let an older answer overwrite a
// newer one. The search function is injected so this logic is tested without a server.

import { useEffect, useRef, useState } from 'react';
import { MIN_QUERY_LENGTH, type ArtistSearchResponse, type ArtistSuggestion, type ProviderStatus } from './artist-search';

export type SuggestionState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'ready'; query: string; results: ArtistSuggestion[]; provider: ProviderStatus; database: 'ok' | 'unavailable' }
  | { status: 'error' | 'rate_limited' | 'offline'; query: string };

export type ArtistSearchFn = (query: string, signal: AbortSignal) => Promise<ArtistSearchResponse>;

export const DEBOUNCE_MS = 300;

export function useArtistSuggestions(query: string, search: ArtistSearchFn, delay = DEBOUNCE_MS): SuggestionState {
  const [state, setState] = useState<SuggestionState>({ status: 'idle' });
  const latest = useRef(0);
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    const trimmed = query.trim();
    const id = ++latest.current;
    if (trimmed.length < MIN_QUERY_LENGTH) { setState({ status: 'idle' }); return; }
    setState({ status: 'loading', query: trimmed });
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchRef.current(trimmed, controller.signal).then(response => {
        if (id !== latest.current) return; // a newer query has started; drop this answer
        setState(response.status === 'ok'
          ? { status: 'ready', query: trimmed, results: response.results, provider: response.provider, database: response.database }
          : { status: response.status, query: trimmed });
      }).catch(() => {
        if (id !== latest.current || controller.signal.aborted) return;
        setState({ status: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error', query: trimmed });
      });
    }, delay);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, delay]);

  return state;
}
