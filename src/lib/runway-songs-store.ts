import { useCallback, useEffect, useState } from 'react';

// Saved runway songs live on this device only, like the sampler edits: no account needed.
const KEY = 'ml-runway-songs-saved';
const EVT = 'ml-runway-songs-saved-change';

function read(): string[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
  } catch { return []; }
}

/** The saved song ids plus a toggle; other tabs and components stay in step. */
export function useSavedSongs() {
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setSaved(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter(other => other !== id) : [...current, id];
    setSaved(next);
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable: saves last for this visit */ }
    window.dispatchEvent(new Event(EVT));
  }, []);
  return [saved, toggle] as const;
}
