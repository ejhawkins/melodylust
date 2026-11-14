import { useEffect, useSyncExternalStore } from "react";

const subscribe = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

/**
 * Makes Melody Lust installable to a phone's home screen: registers the service worker
 * (public/sw.js) on the live site and says so plainly when there's no connection.
 * Not registered in development or inside an editor preview frame, where a saved copy
 * would only get in the way.
 */
export function AppShell() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator) || window.self !== window.top) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        const urls = [location.href, ...performance.getEntriesByType("resource").map((entry) => entry.name)];
        registration.active?.postMessage({ type: "save", page: location.href, urls });
      })
      .catch(() => { /* the site works the same without it */ });
  }, []);

  if (online) return null;
  return (
    <p className="app-offline" role="status">
      You're offline. Your saved things are here; search, shopping and playback need a connection.
    </p>
  );
}
