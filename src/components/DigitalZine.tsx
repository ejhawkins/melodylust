import { Fragment, useEffect, useRef, useState } from "react";
import type { PageFlip, SizeType } from "page-flip";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import cover from "@/assets/grunge-cover.jpg";
import street from "@/assets/street-style.jpg";
import { LikeButton } from "./LikeButton";
import { useReadingBook } from "./useReadingBook";
import { addWish, useWishlist } from "@/lib/wishlist";
import { drawCard } from "./ListenStudio";
import type { StudioTrack } from "@/lib/studio";

const PAGE_COUNT = 7;

// Sample links — swap in the real reads.
const GOOD_READS = [
  { source: "Sample read", title: "Why every pop star wants a uniform again", note: "On stage style as a signature.", url: "https://example.com/read-1" },
  { source: "Sample read", title: "The return of the music magazine", note: "Print's quiet comeback.", url: "https://example.com/read-2" },
  { source: "Sample read", title: "How a tour wardrobe gets built", note: "From fitting to opening night.", url: "https://example.com/read-3" },
  { source: "Sample read", title: "Thrift culture and the new It-girl", note: "Second-hand, first choice.", url: "https://example.com/read-4" },
];

export function DigitalZine({ tone, nowReadingWith }: { tone?: "room"; nowReadingWith?: StudioTrack }) {
  const source = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const book = useRef<PageFlip | null>(null);
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduced = useRef(false);
  const room = tone === "room";
  const reading = useReadingBook(room, source, mount);
  const wishes = useWishlist();
  const touch = useRef<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!room || !heading.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setRevealed(true); observer.disconnect(); } });
    observer.observe(heading.current); return () => observer.disconnect();
  }, [room]);
  const activePage = room ? reading.page : page;
  const activeReady = room ? reading.ready : ready;
  const restart = () => room ? reading.turn(0) : book.current?.turnToPage(0);
  const share = async () => {
    setSharing(true); setShareMessage("");
    try {
      const link = `${window.location.origin}/#reading-room`;
      const blob = await drawCard(nowReadingWith ?? { id: "reading-room", title: "The Reading Room", artist: "Melody Lust", art: cover }, link, { label: "Reading", title: "The Zine · Sample issue 01", sub: "Fashion × Music", image: cover });
      if (!blob) throw new Error("Could not create the issue card. Try again.");
      const file = new File([blob], "melodylust-reading-room.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "The Reading Room", url: link });
      else {
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
        await navigator.clipboard?.writeText(link).catch(() => {}); setShareMessage("Issue card downloaded.");
      }
    } catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setShareMessage(error instanceof Error ? error.message : "Could not share this issue."); }
    finally { setSharing(false); }
  };

  useEffect(() => {
    if (room) return;
    let cancelled = false;
    let instance: PageFlip | null = null;
    const container = mount.current;
    const originals = source.current;
    if (!container || !originals) return;
    const host = document.createElement("div");
    host.className = "zine-book";
    container.appendChild(host);
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void import("page-flip").then(({ PageFlip }) => {
      if (cancelled) return;
      const pages = Array.from(originals.children).map(node => node.cloneNode(true) as HTMLElement);
      pages.forEach(node => host.appendChild(node));
      instance = new PageFlip(host, {
        width: 340, height: 460, size: "stretch" as SizeType, minWidth: 230, maxWidth: 340,
        minHeight: 311, maxHeight: 460, showCover: true, usePortrait: true,
        autoSize: true, mobileScrollSupport: true, flippingTime: 750,
        maxShadowOpacity: 0.2, showPageCorners: !reduced.current,
      });
      instance.on("flip", event => setPage(Number(event.data)));
      instance.loadFromHTML(pages);
      book.current = instance;
      setReady(true);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      book.current = null;
      instance?.destroy();
      host.remove();
    };
  }, [room]);

  function turn(direction: "next" | "previous") {
    if (room) { reading.turn(activePage + (direction === "next" ? 1 : -1)); return; }
    const current = book.current;
    if (!current) return;
    if (reduced.current) {
      if (direction === "next") current.turnToNextPage();
      else current.turnToPrevPage();
    } else if (direction === "next") current.flipNext();
    else current.flipPrev();
  }

  return <section className="zine-section" data-tone={tone} id={room ? "reading-room" : "zine"} aria-labelledby={room ? "reading-room-heading" : "zine-heading"}>
    <header className="zine-header">
      <span className="zine-eyebrow">+ The reading room</span>
      <h2 ref={heading} data-revealed={revealed} id={room ? "reading-room-heading" : "zine-heading"}>{room ? ["The", "Reading", "Room"].map((word, i) => <Fragment key={word}>{i > 0 && " "}<span className="reading-word">{Array.from(word).map((letter, j) => <span key={j}>{letter}</span>)}</span></Fragment>) : "THE ZINE"}</h2>
      <p>A little fashion. A little music. Something to keep.</p>
    </header>
    <div className="zine-layout">
    <div className="zine-main">
    {room && <div className="zine-cover-heart"><LikeButton look="quick" kind="story" id="reading-room-issue-01" name="The Zine · Sample issue 01" image={cover} /></div>}
    <div className="zine-stage" ref={mount} role="group" aria-label="Melody Lust digital booklet" tabIndex={0}
      data-plain={room && reading.plain}
      onTouchStart={event => { touch.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={event => { const end = event.changedTouches[0]?.clientX; if (room && touch.current !== null && end !== undefined && Math.abs(end - touch.current) > 40) turn(end < touch.current ? "next" : "previous"); touch.current = null; }}
      onKeyDown={event => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          turn(event.key === "ArrowRight" ? "next" : "previous");
        }
      }} />
    {!activeReady && <p className="zine-status" role="status">{failed ? "The booklet could not open. Please refresh to try again." : "Opening the booklet…"}</p>}
    <div className="zine-controls">
      <Button variant={room ? "listenOutline" : "ghost"} size="icon" title="Previous page" aria-label="Previous zine page" disabled={!activeReady || activePage === 0} onClick={() => turn("previous")}><ArrowLeft /></Button>
      <span aria-live="polite" aria-atomic="true">{room ? `Page ${activePage + 1} of ${PAGE_COUNT}` : page === 0 ? "Cover" : page === PAGE_COUNT - 1 ? "Back cover" : `Page ${page + 1} of ${PAGE_COUNT}`}</span>
      <Button variant={room ? "listenOutline" : "ghost"} size="icon" title="Next page" aria-label="Next zine page" disabled={!activeReady || activePage === PAGE_COUNT - 1} onClick={() => turn("next")}><ArrowRight /></Button>
      <Button variant={room ? "listenOutline" : "ghost"} size="icon" title="Back to cover" aria-label="Return to zine cover" disabled={!activeReady || activePage === 0} onClick={restart}><RotateCcw /></Button>
    </div>
    <p className="zine-caption">Melody Lust · Sample issue · 7 pages</p>
    {room && <p className="zine-caption">Now reading with · {nowReadingWith ? `${nowReadingWith.title} — ${nowReadingWith.artist}` : "The Autumn Mix"}</p>}
    {room && activePage === 6 && <div className="zine-end"><Button variant="listenOutline" size="bar" onClick={restart}>Back to the cover</Button><Button variant="listenSolid" size="bar" disabled={sharing} onClick={() => void share()}>{sharing ? "Creating card…" : "Share this issue"}</Button></div>}
    {shareMessage && <p role="status" className="zine-caption">{shareMessage}</p>}
    </div>
    <aside className="good-reads" aria-labelledby="good-reads-heading">
      <h3 id="good-reads-heading">GOOD READS</h3>
      <p className="good-reads-note">Links worth your time, from around the web. Sample picks — the real list is on its way.</p>
      <ol className="good-reads-list">
        {GOOD_READS.map(read => <li key={read.url}>
          <a href={read.url} target="_blank" rel="noopener noreferrer">
            <span className="good-reads-source">{read.source}</span>
            <span className="good-reads-title">{read.title}</span>
            <span className="good-reads-desc">{read.note}</span>
            <span className="good-reads-arrow" aria-hidden>↗</span>
          </a>
          {room && <Button variant="listenOutline" size="bar" onClick={() => addWish({ kind: "piece", name: read.title, detail: read.source, link: read.url, note: read.note, from: "Reading Room · Sample read" })}>{wishes.some(w => w.name === read.title && w.from === "Reading Room · Sample read") ? "In Want List" : "+ Want List"}</Button>}
        </li>)}
      </ol>
    </aside>
    </div>
    <div ref={source} hidden>
      <article className="zine-page zine-cover" data-density="hard">
        <img src={cover} alt="Argyle knit, tartan skirt and layered belts in a grunge-inspired outfit" />
        <div className="zine-cover-copy"><span>Sample issue / 01</span><h3>MELODY<br />LUST</h3><p>WORN LOUD.<br />PLAYED LOUDER.</p><span>Fashion × Music × A point of view</span></div>
      </article>
      <article className="zine-page"><div className="zine-page-inner"><span className="zine-folio">Melody Lust / 02</span><h3>IN THIS<br />ISSUE</h3><ol className="zine-contents"><li><span>03</span>The thrift-store uniform</li><li><span>04</span>One piece, your rules</li><li><span>05</span>Street notes</li><li><span>06</span>The October mix</li></ol><p className="zine-italic">For the clothes you live in.<br />The records you return to.</p><p className="zine-small">A sample edit from Melody Lust.</p></div></article>
      <article className="zine-page"><div className="zine-page-inner"><span className="zine-folio">The wardrobe / 03</span><img className="zine-editorial-photo" src={cover} alt="Close look at layered grunge textures, knitwear, tartan and silver belts" /><h3 className="zine-small-heading">THE THRIFT-STORE UNIFORM</h3><p>One soft piece. One hard piece. A knit, a pleated skirt, a belt you have worn a hundred times.</p></div></article>
      <article className="zine-page zine-accent"><div className="zine-page-inner"><span className="zine-folio">Style notes / 04</span><h3>ONE PIECE.<br />YOUR<br />RULES.</h3><p className="zine-italic">Start with the piece you keep coming back to.</p><p>Wear it with a loose knit. Try a sharper silhouette. Let one texture interrupt another.</p><p>These are styling ideas, not a dress code.</p><span className="zine-bottom">We index influence; we don't declare taste.</span></div></article>
      <article className="zine-page"><div className="zine-page-inner"><span className="zine-folio">Street notes / 05</span><img className="zine-editorial-photo" src={street} alt="Street-style photograph from the Melody Lust image archive" /><h3 className="zine-small-heading">OFF THE RECORD.</h3><p>The outfit doesn't need an occasion. The playlist doesn't need an explanation.</p></div></article>
      <article className="zine-page"><div className="zine-page-inner"><span className="zine-folio">The playlist / 06</span><h3 className="zine-small-heading">SIDE A.<br />THE OCTOBER MIX.</h3><p className="zine-italic">Four songs from the artists in this issue.</p><ol className="zine-tracks"><li><span>01</span><div><strong>Day 'N' Nite</strong><em>Kid Cudi</em></div><a href="https://www.youtube.com/results?search_query=Kid+Cudi+Day+%27N%27+Nite" target="_blank" rel="noopener noreferrer">Listen ↗</a></li><li><span>02</span><div><strong>DANCE...</strong><em>Slayyyter</em></div><a href="https://www.youtube.com/results?search_query=Slayyyter+DANCE" target="_blank" rel="noopener noreferrer">Listen ↗</a></li><li><span>03</span><div><strong>WE ON GO II</strong><em>BIA</em></div><a href="https://www.youtube.com/results?search_query=BIA+WE+ON+GO+II" target="_blank" rel="noopener noreferrer">Listen ↗</a></li><li><span>04</span><div><strong>Nicole Kidman</strong><em>ADÉLA</em></div><a href="https://www.youtube.com/results?search_query=AD%C3%89LA+Nicole+Kidman" target="_blank" rel="noopener noreferrer">Listen ↗</a></li></ol><p className="zine-small">Every link opens YouTube in a new tab.</p></div></article>
      <article className="zine-page zine-back" data-density="hard"><div className="zine-page-inner"><span className="zine-folio">Melody Lust / 07</span><h3>UNTIL<br />NEXT<br />ISSUE.</h3><p className="zine-italic">The magazine of<br />music you can wear.</p><span className="zine-bottom">End of sample issue / Melody Lust</span></div></article>
    </div>
  </section>;
}