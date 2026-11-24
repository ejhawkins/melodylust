// A guard for a tab left open across a deploy. Each deploy renames the site's script files (index-<hash>.js), and the
// old ones are gone, so a page loaded before the deploy, or the service worker's offline copy of it, fails the next
// time it fetches a screen's code, and the router shows "This page didn't load". "Try again" only re-runs the same
// missing import, so for this one kind of error the page reloads itself once, which fetches the current page and code.
// The once-per-tab flag means a page that still can't load (offline, say) shows the error rather than looping.
export const CHUNK_RETRY_KEY = "ml-chunk-retry";

/** True for a failed dynamic import or module script, in the wording of Safari, Chrome, Firefox and Vite. */
export function isChunkLoadError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk [\w-]+ failed/i.test(text);
}

/** Reloads once per tab for a chunk-load error. Returns true when it reloaded, so the caller can skip its error UI. */
export function reloadOnceForChunkError(error: unknown, win: Pick<Window, "sessionStorage" | "location"> = window): boolean {
  if (!isChunkLoadError(error)) return false;
  try {
    if (win.sessionStorage.getItem(CHUNK_RETRY_KEY)) return false;
    win.sessionStorage.setItem(CHUNK_RETRY_KEY, "1");
  } catch { return false; }
  win.location.reload();
  return true;
}
