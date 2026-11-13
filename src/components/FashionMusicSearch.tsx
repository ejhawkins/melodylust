import { useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ArrowUpRight, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hot100QueryOptions } from "@/components/BillboardBroadsheet";
import { listenLink } from "@/lib/billboard";
import { formatPrice, type ShopProduct } from "@/lib/farfetch";
import { findProducts, findSongs, liveItem, mergeProducts, namesHouse, relevantLive, type SongHit } from "@/lib/fashion-music-search";
import { useMusicLibrary } from "@/lib/music-library";
import { lookupProducts, lookupShopCatalog } from "@/lib/products.functions";
import { songCatalog, spotifySearchUrl } from "@/lib/song-recommendations";
import { useTasteSongs } from "@/lib/taste-songs";
import { listenUrl } from "@/lib/youtube-takeout";

type Live = { item: string; products: ShopProduct[]; status: "loading" | "ok" | "not_configured" | "unavailable" };

const spotify = (title: string, artist: string) => `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`;

// The shop catalogue, fetched once the search first opens; the server also keeps it for 30 minutes.
const catalogQuery = queryOptions({
  queryKey: ["shop-catalog"],
  queryFn: () => lookupShopCatalog(),
  staleTime: 30 * 60 * 1000,
});

/** The cover menu's Fashion & Music Search: a large search unveiled over the page, with products
 *  and songs loading underneath as the reader types. Enter also asks Farfetch for the piece. */
export function FashionMusicSearch({ open, onOpenChange, playlist = [], tone }: {
  open: boolean;
  /** "room" dresses the search in the Listening Room's tokens (fig, chalk, acid lime, Hammer); the journal keeps its own. */
  tone?: "room";
  onOpenChange: (open: boolean) => void;
  /** The home playlist, searchable alongside the chart and the editor's picks. */
  playlist?: readonly { title: string; artist: string }[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const getProducts = useServerFn(lookupProducts);
  const { data: catalog, isError: catalogFailed } = useQuery({ ...catalogQuery, enabled: open });
  const [live, setLive] = useState<Live | null>(null);
  const { data: feed } = useQuery({ ...hot100QueryOptions, enabled: open });
  const library = useMusicLibrary();
  const taste = useTasteSongs();

  // Chart first, then the editor's picks and the playlist, then the reader's own songs on this device.
  const songs = useMemo<SongHit[]>(() => [
    ...(feed?.chart.entries ?? []).map(e => ({ id: `hot-${e.pos}`, title: e.title, artist: e.artist, source: `Hot 100 · No. ${e.pos}`, href: listenLink(e) })),
    ...songCatalog.map(s => ({ id: `pick-${s.title}-${s.artist}`, title: s.title, artist: s.artist, source: s.moment ? `Editor's pick · ${s.moment.designer}` : "Editor's pick", href: spotifySearchUrl(s), extra: [...s.artists, s.album, ...s.genres, ...s.moods, s.moment?.designer ?? ""].join(" ") })),
    ...playlist.map(t => ({ id: `list-${t.title}-${t.artist}`, title: t.title, artist: t.artist, source: "On the playlist", href: spotify(t.title, t.artist) })),
    ...taste.map(t => ({ id: `taste-${t.id}`, title: t.title, artist: t.artist, source: "Your taste profile", href: spotify(t.title, t.artist), extra: t.note })),
    ...library.map(s => ({ id: `lib-${s.videoId}`, title: s.title, artist: s.artist, source: "Your library", href: listenUrl(s.videoId), extra: s.album })),
  ], [feed, playlist, taste, library]);

  const q = query.trim();
  const item = liveItem(q);
  const liveNow = live && live.item === item ? live : null;
  const products: ShopProduct[] = q
    ? mergeProducts<ShopProduct>(findProducts(catalog?.products ?? [], q), liveNow?.status === "ok" ? relevantLive(liveNow.products, q) : [])
    : (catalog?.products ?? []).slice(0, 8);
  const songHits = q ? findSongs(songs, q) : songs.slice(0, 8);

  const searchLive = async () => {
    if (!item || liveNow) return;
    setLive({ item, products: [], status: "loading" });
    try {
      const response = await getProducts({ data: { item, limit: 8 } });
      let found = response.products;
      // A house name reads its signature pieces, priciest first, rather than its charms and phone cases.
      if (response.status === "ok" && namesHouse(found, item)) {
        const house = await getProducts({ data: { designer: item, limit: 8 } });
        if (house.status === "ok" && house.products.length) found = house.products;
      }
      setLive(l => (l?.item === item ? { item, products: found, status: response.status } : l));
    } catch {
      setLive(l => (l?.item === item ? { item, products: [], status: "unavailable" } : l));
    }
  };

  const liveNote = !q ? "" : liveNow?.status === "loading" ? `Searching Farfetch for “${q}”…`
    : liveNow?.status === "not_configured" ? "Live product search isn't connected yet."
    : liveNow?.status === "unavailable" ? "Farfetch isn't answering right now. Please try again soon."
    : liveNow?.status === "ok" && !products.length ? `Farfetch had nothing for “${q}” either.` : "";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content id="fashion-music-search" className="fms" data-tone={tone} onOpenAutoFocus={event => { event.preventDefault(); input.current?.focus(); }}>
          <div className="fms-inner">
            <div className="fms-head">
              <Dialog.Title className="fms-kicker">Fashion &amp; Music Search</Dialog.Title>
              <Dialog.Close asChild><Button variant="editorial" className="h-9 px-1 uppercase text-[11px] tracking-[0.16em]">Close <X aria-hidden /></Button></Dialog.Close>
            </div>
            <form role="search" className="fms-form" onSubmit={event => { event.preventDefault(); void searchLive(); }}>
              <label htmlFor="fms-query" className="sr-only">Search fashion and music</label>
              <input ref={input} id="fms-query" type="search" autoComplete="off" spellCheck={false} className="fms-input" placeholder="Fashion & music…" value={query} onChange={event => setQuery(event.target.value)} />
              <Button type="submit" variant="searchGo" size="roundLg" aria-label="Search">{liveNow?.status === "loading" ? <LoaderCircle className="animate-spin" aria-hidden /> : <ArrowRight aria-hidden />}</Button>
            </form>
            <Dialog.Description className="fms-hint">An artist, a song, a designer or a piece. Products and songs load underneath as you type.</Dialog.Description>
            <p className="sr-only" role="status">{q ? `${products.length} products and ${songHits.length} songs for ${q}` : ""}</p>

            <div className="fms-results">
              <section className="fms-group" aria-labelledby="fms-products-title">
                <div className="fms-group-head">
                  <h3 id="fms-products-title">{q ? "Products" : "The current edit"}</h3>
                  {products.length > 0 && <span>{products.length}</span>}
                </div>
                {!catalog && !catalogFailed ? <p className="fms-note"><LoaderCircle className="fms-spin animate-spin" aria-hidden /> Loading the edit…</p>
                  : products.length > 0 ? (
                    <ul className="fms-products">
                      {products.map((p, i) => (
                        <li key={p.id} className="fms-rise" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                          <a className="fms-product" href={p.link} target="_blank" rel="noopener noreferrer">
                            <span className="fms-product-frame"><img src={p.image} alt={`${p.brand} ${p.name}`} loading="lazy" width={400} height={500} /></span>
                            <span className="fms-product-brand">{p.brand}</span>
                            <span className="fms-product-name">{p.name}</span>
                            <span className="fms-product-price">{formatPrice(p.price, p.currency)}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="fms-note">{q ? `No pieces in the current edit match “${q}”.` : catalog?.error || (catalogFailed ? "Live products are unavailable right now. Please try again soon." : "The edit is empty right now.")}</p>}
                {liveNote && <p className="fms-note">{liveNote}</p>}
                {item && !liveNow && <Button variant="editorial" className="fms-more" onClick={() => void searchLive()}>Search Farfetch for “{q}” <ArrowUpRight aria-hidden /></Button>}
              </section>

              <section className="fms-group" aria-labelledby="fms-songs-title">
                <div className="fms-group-head">
                  <h3 id="fms-songs-title">{q ? "Songs" : feed ? "This week's Hot 100" : "Songs"}</h3>
                  {songHits.length > 0 && <span>{songHits.length}</span>}
                </div>
                {songHits.length > 0 ? (
                  <ol className="fms-songs">
                    {songHits.map((s, i) => (
                      <li key={s.id} className="fms-song fms-rise" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                        <span className="fms-song-num">{String(i + 1).padStart(2, "0")}</span>
                        <span>
                          <span className="fms-song-title">{s.title}</span>
                          <span className="fms-song-artist">{s.artist}</span>
                          <span className="fms-song-source">{s.source}</span>
                        </span>
                        <a className="fms-song-listen" href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`Listen to ${s.title} by ${s.artist}`}>Listen <ArrowUpRight aria-hidden /></a>
                      </li>
                    ))}
                  </ol>
                ) : <p className="fms-note">{q ? `No songs match “${q}” yet.` : "Songs are loading…"}</p>}
              </section>
            </div>
            <p className="fms-credit">Products from Farfetch. Songs from the Billboard Hot 100, our picks, and your own library on this device.</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
