import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Play, SkipBack, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { spotifyEmbed } from "@/lib/listening-room";
import { runwayRoomLink, runwayShelf } from "@/lib/runway-shelf";

import { SpotifyFrame } from "@/components/SpotifyFrame";
/** The home page's listen shelf. A play button on the left edge pulls up a shelf of runway songs, Thom Browne's featured
 *  first, each on a card naming the house and show, in Spotify's own player (loaded only once the reader presses play,
 *  as in the Listening Room). Its link carries the same song and running order into the Listening Room. */
export function HomeListenShelf() {
  const songs = useMemo(() => runwayShelf(), []);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const shelf = useRef<HTMLElement>(null);
  const song = songs[index];

  // Escape closes the shelf and hands focus back to the button that opened it.
  useEffect(() => {
    if (!open) return;
    shelf.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!song) return null;
  const embed = spotifyEmbed(song.link);
  const close = () => { setOpen(false); opener.current?.focus(); };
  const step = (by: number) => setIndex(i => (i + by + songs.length) % songs.length);

  return (
    <>
      <Button ref={opener} variant="railCta" className="home-listen" data-hidden={open} aria-label="Listen to the runway songs" aria-expanded={open} aria-controls="home-listen-shelf" onClick={() => setOpen(true)}>
        <Play aria-hidden />
      </Button>
      <aside ref={shelf} id="home-listen-shelf" className="home-shelf" data-open={open} aria-label="Listen" tabIndex={-1} inert={!open}>
        <div className="home-shelf-head">
          <span className="home-shelf-kicker">{song.featured ? "+ Featured runway" : "+ Runway songs"}</span>
          <Button variant="listenIcon" size="round" aria-label="Close the player" onClick={close}><X /></Button>
        </div>
        {/* The runway card: a frame of the show where there is one, the house in display type, then the show and song. */}
        <div className="home-shelf-card" data-still={Boolean(song.still)}>
          {song.still && <img src={song.still} alt={song.alt} width={480} height={360} />}
          <p className="home-shelf-house">{song.house}</p>
          <p className="home-shelf-show">{song.show}</p>
        </div>
        <div className="home-shelf-song">
          <p className="home-shelf-title">{song.title}</p>
          <p className="home-shelf-artist">{song.artist}</p>
        </div>
        <div className="home-shelf-controls">
          <Button variant="listenIcon" size="round" aria-label="Previous song" onClick={() => step(-1)}><SkipBack /></Button>
          {listening && embed
            ? <SpotifyFrame key={embed} className="home-shelf-spotify" title={`${song.title} by ${song.artist} on Spotify`} src={embed} width="100%" height={80} allow="autoplay; clipboard-write; encrypted-media" loading="lazy" />
            : <Button variant="listenPlay" size="round" aria-label={`Play ${song.title} by ${song.artist}`} onClick={() => setListening(true)}><Play /></Button>}
          <Button variant="listenIcon" size="round" aria-label="Next song" onClick={() => step(1)}><SkipForward /></Button>
        </div>
        {!(listening && embed) && <p className="home-shelf-note">Plays through Spotify</p>}
        <a className="home-shelf-room" href={runwayRoomLink(song)}>Keep listening in the Listening Room <ArrowRight aria-hidden /></a>
      </aside>
    </>
  );
}
