import { useState } from "react";
import { ArrowUpRight, BookmarkPlus, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SongStyleNotes } from "@/components/SongStyleNotes";
import { iconicSongs, moodPool, songLooks, songPairings, type Look } from "@/data/home";
import { addWish, useWishlist } from "@/lib/wishlist";
import { editNumber, inEdit, splitCaption } from "@/lib/shop-song";
import { cn } from "@/lib/utils";

/** Shop the Song: the wardrobe that dresses one track, as a magazine spread in a frosted drawer. The cover and two
 *  moodboard swatches open it, each garment is a card that saves to the Want List, a moodboard strip and the stylist's
 *  pairing note tie the cloth to the sound, and a footer that never scrolls away saves the whole edit. */
export function ShopTheSong({ song, onClose, onViewList }: { song: string | null; onClose: () => void; onViewList: () => void }) {
  return (
    <Sheet open={song !== null} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent className="shop-panel backdrop-blur-md bg-background/95 border-l border-border/50">
        {song && <Edit key={song} song={song} onViewList={onViewList} />}
      </SheetContent>
    </Sheet>
  );
}

function Edit({ song, onViewList }: { song: string; onViewList: () => void }) {
  const items = useWishlist();
  const [justSaved, setJustSaved] = useState(false);
  const entry = iconicSongs.find(x => x.caption === song);
  const k = Math.max(0, iconicSongs.findIndex(x => x.caption === song));
  const looks = songLooks[song] ?? [];
  const pairing = songPairings[song];
  const { title, artist } = splitCaption(song);
  const link = entry && "link" in entry ? entry.link : undefined;
  const mood = (j: number) => moodPool[(k * 2 + j) % moodPool.length]!;
  const swatches = [mood(0), mood(1)];
  const strip = [0, 1, 2, 3, 4, 5].map(mood);
  const references = swatches.map((image, index) => ({ image, quote: index === 0 ? "Start with one soft piece and one hard piece." : "Keep the pieces you love, and try wearing them differently." }));
  const allSaved = looks.length > 0 && looks.every(l => inEdit(items, song, l.name));

  const save = (look: Look) => {
    const added = addWish({ kind: "piece", name: look.name, detail: look.price, link: "", note: "", from: song, ...(look.image ? { image: look.image } : {}) });
    if (added) toast.success(`${look.name} is on your Want List`, { description: `${look.price} · for ${title}` });
    else toast(`${look.name} is already on your Want List`);
  };
  const saveEdit = () => {
    let added = 0;
    for (const look of looks) if (addWish({ kind: "piece", name: look.name, detail: look.price, link: "", note: "", from: song, ...(look.image ? { image: look.image } : {}) })) added++;
    if (link) addWish({ kind: "song", name: song, detail: "", link, note: "", ...(entry ? { image: entry.image } : {}) });
    setJustSaved(true);
    toast.success(added ? `The ${title} edit is on your Want List` : `The ${title} edit was already saved`, {
      description: added ? `${added} ${added === 1 ? "piece" : "pieces"}${link ? " and the song" : ""}` : undefined,
      action: { label: "View list", onClick: onViewList },
    });
  };

  return <>
    <div className="shop-scroll">
      <header className="shop-head">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Dressed in sound · The edit</p>
        <SheetTitle className="font-editorial text-3xl font-normal leading-tight">{title}</SheetTitle>
        <div className="shop-head-row">
          {artist && <SheetDescription className="shop-artist">{artist}</SheetDescription>}
          {link
            ? <a className="shop-eq" href={link} target="_blank" rel="noreferrer" aria-label={`Listen to ${title} on Spotify (opens a new tab)`}>
                <span className="shop-eq-bars" aria-hidden><i /><i /><i /><i /></span>Listen<ArrowUpRight aria-hidden />
              </a>
            : <SheetDescription className="sr-only">The pieces that dress this song.</SheetDescription>}
        </div>
      </header>

      <div className="shop-collage" aria-hidden>
        {entry && <img className="shop-collage-cover border border-border/40" src={entry.image} alt="" />}
        <img className="shop-collage-swatch border border-border/40" src={swatches[0]} alt="" loading="lazy" />
        <img className="shop-collage-swatch is-low border border-border/40" src={swatches[1]} alt="" loading="lazy" />
        <span className="shop-collage-tag">Vol. {String(k + 1).padStart(2, "0")} / Moodboard</span>
      </div>

      <section aria-labelledby="shop-wardrobe">
        <h3 id="shop-wardrobe" className="shop-section-title">The wardrobe <span>{String(looks.length).padStart(2, "0")} pieces</span></h3>
        <ul className="shop-garments">{looks.map((look, i) => {
          const saved = inEdit(items, song, look.name);
          return <li key={look.name} className="shop-garment">
            <div className="shop-garment-thumb border border-border/40">
              {look.image
                ? <img src={look.image} alt={look.name} loading="lazy" />
                : <span className="shop-garment-silhouette" aria-hidden>{look.name.charAt(0)}</span>}
            </div>
            <div className="shop-garment-text">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{look.house ?? editNumber(i)}</p>
              <p className="shop-garment-name">{look.name}</p>
              <p className="shop-garment-note">{look.note}</p>
            </div>
            <span className="shop-garment-price">{look.price}</span>
            <Button variant="outline" size="icon" className={cn("shop-garment-add", saved && "is-saved")} aria-pressed={saved}
              aria-label={saved ? `${look.name} is on your Want List` : `Add ${look.name} to your Want List`} onClick={() => save(look)}>
              <span className="shop-garment-icon" aria-hidden><Plus /><Check /></span>
            </Button>
          </li>;
        })}</ul>
      </section>

      <section aria-labelledby="shop-mood">
        <h3 id="shop-mood" className="shop-section-title">Moodboard</h3>
        <ul className="shop-strip" tabIndex={0} aria-label="Moodboard images, scroll sideways">
          {strip.map((image, j) => <li key={j}><img className="border border-border/40" src={image} alt="" loading="lazy" /></li>)}
        </ul>
      </section>

      {pairing && <figure className="shop-pairing">
        <blockquote>{pairing}</blockquote>
        <figcaption>Stylist pairing note · {title}</figcaption>
      </figure>}

      <SongStyleNotes song={song} references={references} />
    </div>

    <footer className="shop-foot">
      <Button className="shop-foot-save" data-saved={allSaved || justSaved} onClick={saveEdit} disabled={!looks.length}>
        {allSaved ? <Check aria-hidden /> : <BookmarkPlus aria-hidden />}
        {allSaved ? "Edit saved to Want List" : "Save edit to Want List"}
      </Button>
    </footer>
  </>;
}
