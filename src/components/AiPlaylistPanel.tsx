import { useState } from "react";
import { Music2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMusicLibrary } from "@/lib/music-library";
import { TASTE_LIMIT, addTasteSong, removeTasteSong, useTasteSongs, type AddResult } from "@/lib/taste-songs";
import { useWishlist } from "@/lib/wishlist";

const EXAMPLES = ["Getting ready for a night out", "A Sunday thrift run", "Front row at a fall show", "Slow songs for a long coat"];
const LENGTHS = [10, 20, 30] as const;
type Source = "added" | "dna" | "library" | "wants";
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/**
 * The Curator Dossier's AI playlist area: describe a mood, a look or an occasion, choose what the
 * playlist may draw on, pick a length. A preview — it isn't connected to any AI or music service
 * yet, so nothing leaves this page and no songs are made up in the meantime.
 */
export function AiPlaylistPanel({ genres }: { genres: string[] }) {
  const library = useMusicLibrary();
  const wantSongs = useWishlist().filter(w => w.kind === "song");
  const [prompt, setPrompt] = useState("");
  const [sources, setSources] = useState<Source[]>(["dna"]);
  const [length, setLength] = useState<number>(20);
  const [status, setStatus] = useState("");
  const added = useTasteSongs();
  const toggle = (s: Source) => setSources(list => (list.includes(s) ? list.filter(x => x !== s) : [...list, s]));

  const options: { id: Source; label: string; detail: string; empty: boolean }[] = [
    { id: "added", label: "Songs I've added", detail: added.length ? plural(added.length, "song") : "Add songs above", empty: !added.length },
    { id: "dna", label: "My Style DNA", detail: genres.length ? genres.join(", ") : "Take the style quiz first", empty: !genres.length },
    { id: "library", label: "My music library", detail: library.length ? plural(library.length, "song") : "Import it on the Music library tab", empty: !library.length },
    { id: "wants", label: "Songs on my Want List", detail: wantSongs.length ? plural(wantSongs.length, "song") : "None saved yet", empty: !wantSongs.length },
  ];

  return <div className="dossier-playlist">
    <div className="dossier-toolbar">
      <p>Describe a mood, a look or an occasion, and Stylist AI will put a playlist together from what you choose.</p>
      <span className="dossier-preview"><Sparkles aria-hidden /> Preview · not connected yet</span>
    </div>

    <TasteSongs onAdded={() => setSources(list => (list.includes("added") ? list : [...list, "added"]))} />

    <form className="dossier-playlist-form" onSubmit={e => {
      e.preventDefault();
      setStatus("AI playlists aren't connected yet, so nothing was sent anywhere. Your description stays here.");
    }}>
      <label className="dossier-field">
        <span>Describe the playlist</span>
        <textarea value={prompt} onChange={e => { setPrompt(e.target.value); setStatus(""); }} rows={4} maxLength={400} placeholder="A mood, a look, a place, a time of day…" />
      </label>
      <div className="dossier-playlist-examples" aria-label="Examples">
        {EXAMPLES.map(x => <button key={x} type="button" className="dossier-chip" onClick={() => { setPrompt(x); setStatus(""); }}>{x}</button>)}
      </div>

      <fieldset className="dossier-playlist-options">
        <legend>Draw on</legend>
        {options.map(o => <label key={o.id} className="dossier-playlist-option" data-empty={o.empty || undefined}>
          <input type="checkbox" checked={sources.includes(o.id)} onChange={() => toggle(o.id)} />
          <span><strong>{o.label}</strong><small>{o.detail}</small></span>
        </label>)}
      </fieldset>

      <fieldset className="dossier-playlist-options">
        <legend>Length</legend>
        <div className="dossier-playlist-lengths">
          {LENGTHS.map(n => <label key={n} className="dossier-playlist-length">
            <input type="radio" name="playlist-length" checked={length === n} onChange={() => setLength(n)} />
            <span>{n} songs</span>
          </label>)}
        </div>
      </fieldset>

      <Button type="submit" variant="dossierSolid" disabled={!prompt.trim() || !sources.length}><Sparkles aria-hidden /> Create playlist</Button>
      <p role="status" className="dossier-status">{status}</p>
    </form>

    <section className="dossier-playlist-result" aria-labelledby="playlist-result-title">
      <h2 id="playlist-result-title" className="dossier-section">Your playlist</h2>
      <p className="dossier-playlist-empty">Your playlist will appear here once AI playlists are connected.</p>
      <ul className="dossier-playlist-promises">
        <li>It reads only what you tick above.</li>
        <li>Each song says why it's there, so you can see what it drew on.</li>
        <li>Keep the songs you like on your Want List, or open them in Spotify or YouTube Music.</li>
        <li>Nothing is shared or saved unless you choose to.</li>
      </ul>
    </section>
  </div>;
}

const ADD_MESSAGES: Record<AddResult, string> = {
  added: "Added to your taste profile.",
  duplicate: "That song is already in your taste profile.",
  invalid: "Add the song's title and its artist.",
  full: `Your taste profile holds ${TASTE_LIMIT} songs. Remove one to add another.`,
  unsaved: "This browser couldn't save it. Private browsing or a full device can stop it.",
};

/** Songs you add by hand to shape your taste profile; kept on this device. */
function TasteSongs({ onAdded }: { onAdded: () => void }) {
  const songs = useTasteSongs();
  const [song, setSong] = useState({ title: "", artist: "", note: "" });
  const [message, setMessage] = useState("");
  return <section className="dossier-taste" aria-labelledby="taste-title">
    <h2 id="taste-title" className="dossier-section">Build your taste profile</h2>
    <p className="dossier-taste-lede">Add songs you love. They stay on this device and shape the playlists made for you.</p>
    <form className="dossier-taste-form" onSubmit={e => {
      e.preventDefault();
      const result = addTasteSong(song);
      setMessage(ADD_MESSAGES[result]);
      if (result === "added") { setSong({ title: "", artist: "", note: "" }); onAdded(); }
    }}>
      <label className="dossier-field"><span>Song</span><input value={song.title} maxLength={120} onChange={e => setSong({ ...song, title: e.target.value })} autoComplete="off" /></label>
      <label className="dossier-field"><span>Artist</span><input value={song.artist} maxLength={120} onChange={e => setSong({ ...song, artist: e.target.value })} autoComplete="off" /></label>
      <label className="dossier-field dossier-taste-note"><span>What you like about it (optional)</span><input value={song.note} maxLength={200} onChange={e => setSong({ ...song, note: e.target.value })} placeholder="The bass line, the video, the way it builds…" autoComplete="off" /></label>
      <Button type="submit" variant="dossier" disabled={!song.title.trim() || !song.artist.trim()}><Plus aria-hidden /> Add song</Button>
    </form>
    <p role="status" className="dossier-status">{message}</p>
    {songs.length > 0 && <ul className="dossier-songs dossier-taste-songs">{songs.map(s => <li key={s.id}>
      <Music2 aria-hidden />
      <div className="dossier-library-song"><strong>{s.title}</strong><small>{[s.artist, s.note].filter(Boolean).join(" · ")}</small></div>
      <Button variant="editorial" onClick={() => removeTasteSong(s.id)} aria-label={`Remove ${s.title} by ${s.artist}`}><Trash2 aria-hidden /></Button>
    </li>)}</ul>}
  </section>;
}
