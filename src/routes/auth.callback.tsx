import { useEffect, useRef } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { exchangeSpotifyCode } from "@/lib/spotify-auth.functions";
import { PKCE_STORAGE_KEY, readCallback, readPendingSignIn } from "@/lib/spotify-pkce";
import { spotifyRoom } from "@/lib/spotify-room";

// Spotify sends the reader back here. The code and the saved verifier go to the server function, which sets the
// refresh-token cookie and returns the access token; the room takes it in memory and the reader is back in the room,
// now in listening mode, with no page reload (so the in-memory token survives).
export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Entering the listening room · Melody Lust" }, { name: "robots", content: "noindex" }] }),
  component: SpotifyCallback,
});

function SpotifyCallback() {
  const router = useRouter();
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const pending = readPendingSignIn(sessionStorage.getItem(PKCE_STORAGE_KEY));
    sessionStorage.removeItem(PKCE_STORAGE_KEY);
    const result = readCallback(window.location.search, pending);
    const back = () => router.history.replace(result.returnTo);
    const room = spotifyRoom();

    if (result.kind === "denied") { room.signInFailed("denied"); back(); return; }
    if (result.kind === "invalid") { room.signInFailed("signed_out"); back(); return; }
    const redirectUri = import.meta.env["VITE_SPOTIFY_REDIRECT_URI"] as string | undefined ?? "";
    exchangeSpotifyCode({ data: { code: result.code, verifier: result.verifier, redirectUri } })
      .then(reply => {
        if (reply.status === "ok") room.signedIn({ accessToken: reply.accessToken, expiresAt: reply.expiresAt });
        else room.signInFailed("unavailable");
      })
      .catch(() => room.signInFailed("unavailable"))
      .finally(back);
  }, [router]);

  return <main className="ls-auth" aria-live="polite"><p>Entering the listening room…</p></main>;
}
