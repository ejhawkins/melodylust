import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDesignerPortraits } from "@/lib/designer-radio.functions";
import { inspire, profileTags, TAG_KIND_LABELS, TAG_KINDS, tagKey, type InspiredPlaylist, type Tag } from "@/lib/runway-inspiration";
import type { RunwayNote } from "@/lib/runway-notes";
import type { Designer, RunwaySong } from "@/lib/runway-songs";
import { createStudioPlaylist, importTracks } from "@/lib/studio";
import { profileFields, type StyleProfile } from "@/lib/style-profile";

const options = (kind: (typeof TAG_KINDS)[number]) => (profileFields.find(field => field.key === kind)?.options ?? []) as readonly string[];
const spotify = (id: string) => `https://open.spotify.com/track/${id}`;

/**
 * After the style quiz: the runways that fit the reader's tags, the designers behind them and stacked playlists from
 * those shows' soundtracks. The agent only suggests; a playlist is saved to the reader's library when they tap.
 */
export function RunwayInspiration({ profile, notes, songs, onRetake, onToggleTag }: {
  profile: StyleProfile; notes: readonly RunwayNote[]; songs: readonly RunwaySong[]; onRetake: () => void;
  /** A tap in the cloud: the room saves it to the profile, so every pane follows the same tags. */
  onToggleTag: (tag: Tag, on: boolean) => void;
}) {
  const selected = useMemo(() => profileTags(profile), [profile]);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const { shows, designers, playlists } = useMemo(() => inspire(selected, notes, songs), [selected, notes, songs]);

  const unpictured = designers.filter(d => !d.designer.photo).map(d => d.designer.name);
  const { data: portraits } = useQuery({
    queryKey: ["runway-inspiration", "portraits", unpictured],
    queryFn: () => getDesignerPortraits({ data: { names: unpictured } }),
    enabled: unpictured.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });
  const withPortrait = (designer: Designer) => designer.photo ? designer : portraits?.find(p => p.name === designer.name) ?? designer;

  const toggle = (tag: Tag) => onToggleTag(tag, !selected.some(t => tagKey(t) === tagKey(tag)));
  const save = (playlist: InspiredPlaylist) => {
    const list = createStudioPlaylist(playlist.title);
    const count = importTracks(list.id, playlist.tracks.map(t => ({ title: t.title, artist: t.artist, ...(t.spotifyId ? { spotify: t.spotifyId } : {}) })));
    setSaved(now => ({ ...now, [playlist.id]: `Saved ${count} songs to your library` }));
  };

  return (
    <section id="runways-for-you" className="ri" aria-labelledby="ri-title" tabIndex={-1}>
      <p className="ri-kicker">Runway inspiration</p>
      <h2 id="ri-title" className="ri-title">Runways for your taste</h2>
      <p className="ri-dek">Shows picked by your tags, which the whole room follows and saves on this device. Every song is placed at its show by the sources cited; genre and aesthetic tags are our read.</p>

      <fieldset className="ri-cloud">
        <legend className="ri-label">Your tags</legend>
        {TAG_KINDS.map(kind => (
          <div key={kind} className="ri-cloud-group" role="group" aria-label={TAG_KIND_LABELS[kind]}>
            <span className="ri-cloud-kind" aria-hidden>{TAG_KIND_LABELS[kind]}</span>
            {options(kind).map(value => {
              const on = selected.some(t => t.kind === kind && t.value === value);
              return <button key={value} type="button" className="ri-tag" aria-pressed={on} onClick={() => toggle({ kind, value })}>{on && <Check aria-hidden />}{value}</button>;
            })}
          </div>
        ))}
      </fieldset>

      {!shows.length ? (
        <div className="ri-empty">
          <p>{selected.length ? "No runway on file shares these tags yet. Try another genre, aesthetic or season." : "Pick a few tags, or take the style quiz, and the runways that fit will show here."}</p>
          <Button variant="listenCategory" size="chip" onClick={onRetake}>Retake the style quiz</Button>
        </div>
      ) : <>
        <h3 className="ri-label" id="ri-designers">Designers for your profile</h3>
        <ul className="ri-designers" aria-labelledby="ri-designers">
          {designers.map(({ designer, shows: theirs, matched }) => {
            const d = withPortrait(designer);
            return (
              <li key={d.name} className="ri-designer">
                <figure className="ri-portrait">
                  {d.photo ? <img src={d.photo.src} alt={`Portrait of ${d.name}`} loading="lazy" referrerPolicy="no-referrer" /> : <span className="ri-initial" aria-hidden>{d.name.charAt(0)}</span>}
                  {d.photo && (d.photo.credit || d.photo.licence) && (
                    <figcaption>Photo: {[d.photo.credit, d.photo.licence].filter(Boolean).join(" · ")}{d.photo.source && <> · <a href={d.photo.source} target="_blank" rel="noopener noreferrer">Commons</a></>}</figcaption>
                  )}
                </figure>
                <div>
                  <a className="ri-name" href={d.wikipedia} target="_blank" rel="noopener noreferrer">{d.name}<ArrowUpRight aria-hidden /></a>
                  <p className="ri-meta">{theirs.join(" · ")}</p>
                  <p className="ri-matched">{matched.map(t => t.value).join(" · ")}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <h3 className="ri-label" id="ri-shows">Runways to inspire</h3>
        <ol className="ri-shows" aria-labelledby="ri-shows">
          {shows.map(show => (
            <li key={show.note.id} className="ri-show">
              <p className="ri-show-title">{show.label}</p>
              {show.tracks.length > 0 && (
                <ul className="ri-show-songs" aria-label={`Songs at ${show.label}`}>
                  {show.tracks.map(t => (
                    <li key={`${t.title}|${t.artist}`}>
                      {t.spotifyId
                        ? <a href={spotify(t.spotifyId)} target="_blank" rel="noopener noreferrer">{t.title}<ArrowUpRight aria-hidden /></a>
                        : <span>{t.title}</span>}
                      <span className="ri-show-artist"> · {t.artist}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="ri-meta">{show.designers.map(d => d.name).join(" & ")}</p>
              <ul className="ri-tags" aria-label="Tags">
                {show.tags.map(tag => (
                  <li key={tagKey(tag)} className={show.matched.some(m => tagKey(m) === tagKey(tag)) ? "ri-chip is-match" : "ri-chip"}>
                    {tag.value}{tag.basis === "ours" && <span className="ri-ours"> · our read</span>}
                  </li>
                ))}
              </ul>
              <p className="ri-sources">Sources: {show.sources.map((s, i) => <span key={s.url}>{i > 0 && " · "}<a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>{s.checked === "excerpt" && <small> (excerpt)</small>}</span>)}</p>
            </li>
          ))}
        </ol>

        {playlists.length > 0 && <>
          <h3 className="ri-label" id="ri-playlists">Playlists the agent suggests</h3>
          <div className="ri-stack" aria-labelledby="ri-playlists">
            {playlists.map(playlist => (
              <article key={playlist.id} className="ri-playlist" aria-label={playlist.title}>
                <header>
                  <h4>{playlist.title}</h4>
                  <span className="ri-meta">{playlist.tracks.length} songs from {new Set(playlist.tracks.map(t => t.showId)).size} shows</span>
                </header>
                <ol>
                  {playlist.tracks.map(track => (
                    <li key={`${track.title}|${track.artist}`}>
                      {track.spotifyId ? <a href={spotify(track.spotifyId)} target="_blank" rel="noopener noreferrer">{track.title}</a> : track.title}
                      <span className="ri-meta"> · {track.artist} · {track.show}</span>
                    </li>
                  ))}
                </ol>
                {saved[playlist.id]
                  ? <p role="status" className="ri-saved"><Check aria-hidden /> {saved[playlist.id]}</p>
                  : <Button variant="listenCategory" size="chip" onClick={() => save(playlist)}><Plus aria-hidden />Save to my library</Button>}
              </article>
            ))}
          </div>
        </>}
      </>}
    </section>
  );
}
