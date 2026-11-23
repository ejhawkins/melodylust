import type { ComponentProps } from "react";
import { ArrowUpRight } from "lucide-react";
import { spotifyOpenUrl } from "@/lib/in-app-browser";
import { setSoundChoice, useSilentMode } from "@/lib/silent-mode";

/** A Spotify embed, except in silent mode (in-app browsers only): there it's a card that opens the song in Spotify,
 *  with a way to play it here after all. Takes the same props as the iframe it replaces. */
export function SpotifyFrame({ src = "", title, ...frame }: ComponentProps<"iframe">) {
  const silent = useSilentMode();
  if (!silent) return <iframe src={src} title={title} {...frame} />;
  return (
    <span className="spotify-silent" role="group" aria-label={title ? `${title} (silent mode)` : "Silent mode"}>
      <a className="spotify-silent-open" href={spotifyOpenUrl(src)} target="_blank" rel="noopener noreferrer">
        Open in Spotify <ArrowUpRight aria-hidden />
      </a>
      <button type="button" className="spotify-silent-here" onClick={() => setSoundChoice("sound")}>Play here instead</button>
    </span>
  );
}
