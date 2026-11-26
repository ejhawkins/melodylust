import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listeningRoomEnabled } from "@/lib/listening-mode";
import { PKCE_STORAGE_KEY, buildAuthorizeUrl, createCodeChallenge, createCodeVerifier, createState, safeReturnPath } from "@/lib/spotify-pkce";

// "Enter the listening room" without a remembered sign-in lands here: make the PKCE pair, keep the verifier and state
// in this tab's sessionStorage for the trip, and hand the reader to Spotify. No Melody Lust account is involved.
export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Signing in with Spotify · Melody Lust" }, { name: "robots", content: "noindex" }] }),
  component: SpotifyLogin,
});

function SpotifyLogin() {
  const [problem, setProblem] = useState(false);

  useEffect(() => {
    const clientId = import.meta.env["VITE_SPOTIFY_CLIENT_ID"] as string | undefined;
    const redirectUri = import.meta.env["VITE_SPOTIFY_REDIRECT_URI"] as string | undefined;
    if (!listeningRoomEnabled() || !clientId || !redirectUri) { setProblem(true); return; }
    let cancelled = false;
    (async () => {
      const verifier = createCodeVerifier();
      const state = createState();
      const returnTo = safeReturnPath(new URLSearchParams(window.location.search).get("returnTo"));
      sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify({ verifier, state, returnTo }));
      const challenge = await createCodeChallenge(verifier);
      if (!cancelled) window.location.replace(buildAuthorizeUrl({ clientId, redirectUri, challenge, state }));
    })().catch(() => setProblem(true));
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="ls-auth" aria-live="polite">
      {problem
        ? <p>The listening room isn't open here. <Link to="/">Back to the room</Link></p>
        : <p>Taking you to Spotify…</p>}
    </main>
  );
}
