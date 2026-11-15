import { useCallback, useEffect, useState } from "react";
import { isGenreChoice, type GenreChoice } from "./genre-edition";

const KEY = "ml-genre";
const EVT = "ml-genre-change";

/** The genre the reader last chose on this device, or "all" when they haven't (or storage is unavailable). */
export function readGenre(): GenreChoice {
  try {
    const saved = window.localStorage.getItem(KEY);
    return isGenreChoice(saved) ? saved : "all";
  } catch { return "all"; }
}

/** The genre the room is curated for, kept on this device like likes and the Want List: no account needed. It reads
 *  "all" on the server and on the first paint, then the saved choice, and follows a change made in another tab. */
export function useGenrePreference(): [GenreChoice, (choice: GenreChoice) => void] {
  const [choice, setChoice] = useState<GenreChoice>("all");
  useEffect(() => {
    const sync = () => setChoice(readGenre());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const choose = useCallback((next: GenreChoice) => {
    try { window.localStorage.setItem(KEY, next); } catch { /* storage unavailable: the choice lasts for this visit */ }
    setChoice(next);
    window.dispatchEvent(new Event(EVT));
  }, []);
  return [choice, choose];
}
