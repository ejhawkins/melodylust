import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDesignerRadio } from "@/lib/designer-radio.functions";
import { getRunwayArchive } from "@/lib/runway-archive.functions";
import { withArchive } from "@/lib/runway-archive";
import { resolveSampler } from "@/lib/runway-sampler";
import { useSamplerEdits } from "@/lib/runway-sampler-store";
import { hiddenTracks, runwaySongs, type RunwaySong } from "@/lib/runway-songs";

// The archive and designer radio Runway Songs adds to the sampler's songs; a failed fetch leaves the sampler's alone.
const extraSongs = queryOptions({
  queryKey: ["runway-songs", "extra"],
  queryFn: async () => {
    const [archive, radio] = await Promise.all([getRunwayArchive(), getDesignerRadio()]);
    return [...archive.songs, ...radio.songs];
  },
  staleTime: 10 * 60 * 1000,
});

/** Runway Songs' list, built the way its page builds it. The server half loads only once `enabled`. */
export function useRunwaySongs(enabled: boolean): RunwaySong[] {
  const [edits] = useSamplerEdits();
  const { data: extra } = useQuery({ ...extraSongs, enabled });
  return useMemo(() => {
    const rows = resolveSampler(edits);
    return withArchive(runwaySongs(rows), extra ?? [], hiddenTracks(rows));
  }, [edits, extra]);
}

/** The feed's "+ Runway Songs" section under the RUNWAY filter: one row per show, played through the room's
 *  own player bar. The full page, with its portraits and show notes, is a link away. */
export function ListenRunway({ songs, playing, onPlay }: { songs: readonly RunwaySong[]; playing: number | null; onPlay: (index: number) => void }) {
  return (
    <section className="ls-section" aria-labelledby="ls-runway">
      <div className="ls-section-head">
        <h2 id="ls-runway">+ Runway Songs</h2>
        <Link to="/runway-songs" className="ls-section-link">Open Runway Songs<ArrowUpRight aria-hidden /></Link>
      </div>
      {songs.length === 0 ? <p className="ls-empty">Runway Songs has nothing to play yet.</p> : (
        <ol className="ls-runway">
          {songs.map((s, i) => <li key={s.id}>
            <Button variant="listenTile" size="block" className="ls-runway-row w-full" data-active={i === playing}
              aria-label={`Play ${s.name} by ${s.artist}, from ${s.house} ${s.season} ${s.year}`} onClick={() => onPlay(i)}>
              <span className="ls-runway-num" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
              <span className="ls-runway-show"><span className="ls-runway-house">{s.house}</span><span className="ls-runway-season">{s.season} {s.year}</span></span>
              <span className="ls-runway-song"><span className="ls-runway-name">{s.name}</span><span className="ls-runway-artist">{s.artist}</span></span>
              <span className="ls-runway-play" aria-hidden><Play /></span>
            </Button>
          </li>)}
        </ol>
      )}
    </section>
  );
}
