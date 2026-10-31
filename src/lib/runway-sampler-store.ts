import { useCallback, useEffect, useState } from 'react';
import { emptySamplerEdits, readSamplerEdits, type SamplerEdits } from './runway-sampler';

// The reader's sampler edits live on this device only, like the style profile: no account needed.
const KEY = 'ml-runway-sampler';
const EVT = 'ml-runway-sampler-change';

function read(): SamplerEdits {
  try { return readSamplerEdits(JSON.parse(window.localStorage.getItem(KEY) ?? 'null')); } catch { return emptySamplerEdits(); }
}
function write(edits: SamplerEdits) {
  try { window.localStorage.setItem(KEY, JSON.stringify(edits)); } catch { /* storage unavailable: edits last for this visit */ }
  window.dispatchEvent(new Event(EVT));
}

/** The saved edits plus an updater; other tabs and components stay in step. */
export function useSamplerEdits() {
  const [edits, setEdits] = useState<SamplerEdits>(emptySamplerEdits);
  useEffect(() => {
    const sync = () => setEdits(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const update = useCallback((change: (current: SamplerEdits) => SamplerEdits) => {
    const next = change(read());
    setEdits(next);
    write(next);
  }, []);
  return [edits, update] as const;
}
