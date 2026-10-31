// Spotify's iFrame API: one off-screen embed that the Runway Songs controls drive. Listeners who
// aren't signed in to Spotify in this browser hear its 30-second previews; signed-in ones hear the track.

import { useCallback, useEffect, useRef, useState } from 'react';

type PlaybackUpdate = { data: { isPaused: boolean; isBuffering: boolean; duration: number; position: number } };
type EmbedController = {
  loadUri(uri: string): void;
  play(): void;
  togglePlay(): void;
  seek(seconds: number): void;
  destroy(): void;
  addListener(event: 'ready', listener: () => void): void;
  addListener(event: 'playback_update', listener: (update: PlaybackUpdate) => void): void;
};
type IFrameApi = {
  createController(element: HTMLElement, options: { uri: string; width: number; height: number }, ready: (controller: EmbedController) => void): void;
};

declare global {
  interface Window { onSpotifyIframeApiReady?: (api: IFrameApi) => void }
}

const API_URL = 'https://open.spotify.com/embed/iframe-api/v1';
let api: Promise<IFrameApi> | null = null;

/** Spotify calls one global when its script is ready, so every embed shares one load. */
function loadSpotifyApi() {
  api ??= new Promise<IFrameApi>((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement('script');
    script.src = API_URL;
    script.async = true;
    script.onerror = () => { api = null; script.remove(); reject(new Error('The Spotify player didn’t load.')); };
    document.head.appendChild(script);
  });
  return api;
}

export type Playback = {
  paused: boolean;
  positionMs: number;
  durationMs: number;
  /** Play was pressed but Spotify never started, e.g. a browser that only lets the embed's own button start audio. */
  stalled: boolean;
  /** The Spotify script didn't load (offline or blocked). */
  failed: boolean;
};

const STALL_MS = 4000;

/** Mounts a Spotify embed in `host`, keeps it on `uri`, and reports its playback. `onEnded` runs when a track plays out. */
export function useSpotifyEmbed(uri: string | null, onEnded: () => void) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<EmbedController | null>(null);
  const loadedUri = useRef<string | null>(null);
  const wantedUri = useRef(uri);
  const wantsPlay = useRef(false);
  const last = useRef({ paused: true, positionMs: 0, ended: false });
  const endedRef = useRef(onEnded);
  const stallTimer = useRef<number | undefined>(undefined);
  const [playback, setPlayback] = useState<Playback>({ paused: true, positionMs: 0, durationMs: 0, stalled: false, failed: false });

  useEffect(() => { endedRef.current = onEnded; wantedUri.current = uri; });

  // One embed for the page's life; track changes reuse it.
  const hasUri = uri !== null;
  useEffect(() => {
    const box = host.current;
    if (!box || !hasUri) return;
    const element = document.createElement('div');
    box.appendChild(element);
    let cancelled = false;
    loadSpotifyApi().then(spotify => {
      const first = wantedUri.current;
      if (cancelled || !first) return;
      spotify.createController(element, { uri: first, width: 300, height: 80 }, embed => {
        if (cancelled) { embed.destroy(); return; }
        controller.current = embed;
        loadedUri.current = first;
        embed.addListener('playback_update', ({ data }) => {
          // A track that plays out reports position === duration and still says it's playing, so that's the end.
          const atEnd = data.duration > 0 && data.position >= data.duration;
          const finished = atEnd && !last.current.ended;
          last.current = { paused: data.isPaused, positionMs: data.position, ended: atEnd };
          if (!data.isPaused) window.clearTimeout(stallTimer.current);
          setPlayback(current => ({ ...current, paused: data.isPaused, positionMs: data.position, durationMs: data.duration, stalled: current.stalled && data.isPaused }));
          if (finished) endedRef.current();
        });
      });
    }, () => { if (!cancelled) setPlayback(current => ({ ...current, failed: true })); });
    return () => {
      cancelled = true;
      window.clearTimeout(stallTimer.current);
      controller.current?.destroy();
      controller.current = null;
      loadedUri.current = null;
      box.replaceChildren();
    };
  }, [hasUri]);

  useEffect(() => {
    const embed = controller.current;
    if (!embed || !uri || loadedUri.current === uri) return;
    loadedUri.current = uri;
    last.current = { paused: true, positionMs: 0, ended: false };
    embed.loadUri(uri);
    if (wantsPlay.current) embed.play();
    setPlayback(current => ({ ...current, positionMs: 0, durationMs: 0 }));
  }, [uri]);

  /** False when there's no embed to drive yet. */
  const toggle = useCallback(() => {
    const embed = controller.current;
    if (!embed) return false;
    const starting = last.current.paused;
    wantsPlay.current = starting;
    embed.togglePlay();
    window.clearTimeout(stallTimer.current);
    if (starting) stallTimer.current = window.setTimeout(() => setPlayback(current => (current.paused ? { ...current, stalled: true } : current)), STALL_MS);
    return true;
  }, []);

  const restart = useCallback((play = false) => {
    const embed = controller.current;
    if (!embed) return;
    embed.seek(0);
    if (play) embed.play();
  }, []);

  return { host, playback, toggle, restart };
}
