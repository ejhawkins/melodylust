import type { CSSProperties } from "react";
import { useAlbumArt } from "@/lib/album-art";
import { coverTheme, coverTitleSize } from "@/lib/playlist-cover";

/** A Studio playlist's own sleeve: the name in Bodoni Moda on the playlist's house ground, with its first song's album
 *  art faded in behind. Decorative, so the tile's text carries the name for screen readers. */
export function PlaylistCover({ name, count, art, spotify }: { name: string; count: number; art?: string | undefined; spotify?: string | undefined }) {
  const theme = coverTheme(name);
  const fetched = useAlbumArt(art ? null : spotify);
  const behind = art ?? fetched;
  const style = { "--pc-ground": theme.ground, "--pc-ink": theme.ink, "--pc-rule": theme.rule } as CSSProperties;
  return (
    <div className="playlist-cover" style={style} aria-hidden="true">
      {behind && <img className="playlist-cover-art" src={behind} alt="" loading="lazy" />}
      <span className="playlist-cover-mark">Melody Lust</span>{" "}
      <span className="playlist-cover-title" data-size={coverTitleSize(name)}>{name}</span>{" "}
      <span className="playlist-cover-count">{count} {count === 1 ? "song" : "songs"}</span>
    </div>
  );
}
