import { Disc3 } from "lucide-react";
import type { ReactNode } from "react";
import type { MixSong } from "@/lib/listening-room";
import type { Playlist } from "@/lib/playlists";

type Chapter = { id: string; title: string; dek: string; songs: MixSong[]; play: (index: number) => void; open?: () => void };

/** The library's playlists as a magazine contents page: every playlist is a numbered feature with a contact-sheet strip
 *  of its covers and a dotted index of its songs, so songs from all of them sit on one screen. A tap plays that song. */
export function ListenContents({ mix, playlists, nowPlaying, onPlayMix, onPlayList, onRunway, onPlaylist, footer }: {
  mix: readonly MixSong[];
  playlists: readonly Playlist[];
  nowPlaying?: string | undefined;
  onPlayMix: (index: number) => void;
  onPlayList: (id: string, index: number) => void;
  onRunway: () => void;
  onPlaylist: (id: string) => void;
  footer?: ReactNode;
}) {
  const chapters: Chapter[] = [
    { id: "mix", title: "The Autumn Mix", dek: "The season, scored", songs: [...mix], play: onPlayMix },
    ...playlists.map((p): Chapter => ({
      id: p.id, title: p.name, dek: "Your edit",
      songs: p.songs.flatMap(c => mix.filter(s => s.caption === c)),
      play: i => onPlayList(p.id, i), open: () => onPlaylist(p.id),
    })),
  ];
  const issue = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <section className="ls-toc" aria-label="Contents: songs from every playlist">
      <header className="ls-toc-mast">
        <p className="ls-toc-kicker">Melody Lust · {issue}</p>
        <h2 className="ls-toc-title">Contents</h2>
        <p className="ls-toc-dek">Every playlist, one spread.</p>
      </header>
      <ol className="ls-toc-list">
        {chapters.map((ch, n) => (
          <li key={ch.id} className="ls-toc-chapter">
            <div className="ls-toc-head">
              <span className="ls-toc-num" aria-hidden>{String(n + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <p className="ls-toc-dekline">{ch.dek} · {ch.songs.length} {ch.songs.length === 1 ? "song" : "songs"}</p>
                {ch.open ? <button type="button" className="ls-toc-name" onClick={ch.open}>{ch.title}</button> : <h3 className="ls-toc-name">{ch.title}</h3>}
              </div>
            </div>
            {ch.songs.length > 0 ? <>
              <div className="ls-toc-strip">
                {ch.songs.slice(0, 6).map((s, i) => (
                  <button key={s.caption} type="button" className="ls-toc-frame" data-now={nowPlaying === s.caption} aria-label={`Play ${s.title} by ${s.artist}`} onClick={() => ch.play(i)}>
                    {s.art ? <img src={s.art} alt="" width={72} height={96} loading="lazy" /> : <Disc3 aria-hidden />}
                  </button>
                ))}
              </div>
              <ul className="ls-toc-index">
                {ch.songs.map((s, i) => (
                  <li key={s.caption}>
                    <button type="button" className="ls-toc-line" data-now={nowPlaying === s.caption} onClick={() => ch.play(i)}>
                      <span className="ls-toc-song"><em>{s.title}</em> <span>{s.artist}</span></span>
                      <span className="ls-toc-dots" aria-hidden />
                      <span className="ls-toc-page">{String(i + 1).padStart(2, "0")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </> : <p className="ls-toc-empty">Add songs from any look to fill this feature.</p>}
          </li>
        ))}
        <li className="ls-toc-chapter">
          <button type="button" className="ls-toc-head ls-toc-runway" onClick={onRunway}>
            <span className="ls-toc-num" aria-hidden>{String(chapters.length + 1).padStart(2, "0")}</span>
            <span className="min-w-0 text-left">
              <span className="ls-toc-dekline">Special report</span>
              <span className="ls-toc-name">Runway Songs</span>
            </span>
          </button>
        </li>
      </ol>
      {footer}
    </section>
  );
}
