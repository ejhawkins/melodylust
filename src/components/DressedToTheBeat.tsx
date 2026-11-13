import { useEffect, useState } from "react";
import { addWish, removeWish, useWishlist } from "@/lib/wishlist";
import { celebrityCover as cover, celebrityLooks as looks, isLookSaved, lookChips, LOOK_FROM, photoCredits, trackLook, type CelebrityLook } from "@/lib/celebrity-looks";

function Photo({ src, alt, eager }: { src: string; alt: string; eager?: boolean }) {
  const [failed, setFailed] = useState(!src);
  return <div className="dtb-photo">
    {failed ? <div className="dtb-photo-empty" role="img" aria-label={alt}><span>Image to come</span></div>
      : <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} decoding="async" width={900} height={1200} onError={() => setFailed(true)} />}
  </div>;
}

function Look({ look, n, size }: { look: CelebrityLook; n: number; size: "lead" | "medium" | "small" }) {
  const items = useWishlist();
  const saved = isLookSaved(items, look);
  const chips = lookChips(look);
  const toggle = () => {
    if (saved) {
      items.filter(i => i.from === LOOK_FROM && i.name === look.name).forEach(i => removeWish(i.id));
      trackLook("celebrity_look_unsaved", look);
    } else {
      addWish({ kind: "piece", name: look.name, detail: [look.event, look.year].filter(Boolean).join(" · "), link: look.shopUrl, note: look.song ? `${look.song} — ${look.artist}` : "", from: LOOK_FROM, image: look.image });
      trackLook("celebrity_look_saved", look);
    }
  };
  // A cross-origin embed can't report plays; a click inside it moves focus to the iframe.
  useEffect(() => {
    if (!look.spotifyTrackId) return;
    const onBlur = () => window.setTimeout(() => {
      const el = document.activeElement;
      if (el instanceof HTMLIFrameElement && el.dataset["look"] === look.id) trackLook("celebrity_song_played", look);
    });
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [look]);
  return <article className={`dtb-look dtb-${size}`}>
    <Photo src={look.image} alt={look.imageAlt || look.name} />
    <div className="dtb-notes">
      {size === "lead" && <span className="dtb-numeral" aria-hidden="true">{String(n).padStart(2, "0")}</span>}
      <p className="dtb-mono">{String(n).padStart(2, "0")} · {look.event} · {look.year}</p>
      <h3 className="dtb-name">{look.name}</h3>
      {size !== "small" && look.look && <><p className="dtb-mono dtb-sub">The look</p><p className="dtb-body">{look.look}</p></>}
      {(look.song || look.spotifyTrackId) && <>
        <p className="dtb-mono dtb-sub">The sound</p>
        {look.song && <p className="dtb-body">{look.song}{look.artist && ` — ${look.artist}`}</p>}
        {look.spotifyTrackId && <iframe data-look={look.id} title={`Spotify preview: ${look.song} by ${look.artist}`} src={`https://open.spotify.com/embed/track/${look.spotifyTrackId}?utm_source=generator&theme=0`} width="100%" height="152" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="dtb-embed" />}
      </>}
      {look.whyItFits && <p className="dtb-why">{look.whyItFits}</p>}
      {chips.length > 0 && <ul className="dtb-chips">{chips.map(c => <li key={c}>{c}</li>)}</ul>}
      <div className="dtb-actions">
        <button type="button" className="dtb-btn" aria-pressed={saved} onClick={toggle}>{saved ? "Saved to Want List" : "Save to Want List"}</button>
        {look.shopUrl && <a className="dtb-btn dtb-btn-ghost" href={look.shopUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackLook("celebrity_look_shop_clicked", look)}>Shop the sound</a>}
      </div>
    </div>
  </article>;
}

export function DressedToTheBeat() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    [{ id: "cover", ...cover }, ...looks].forEach(l => {
      if (!l.imageAlt?.trim()) console.warn(`[Dressed to the Beat] ${l.id} is missing imageAlt`);
      if (!l.photoCredit?.trim()) console.warn(`[Dressed to the Beat] ${l.id} is missing photoCredit`);
    });
  }, []);
  const [lead, ...rest] = looks;
  return <section className="dtb" id="dressed-to-the-beat" aria-labelledby="dtb-title">
    <header className="dtb-head">
      <p className="dtb-mono">Celebrity style · Read for the sound</p>
      <h2 id="dtb-title" className="dtb-title">Dressed to the Beat</h2>
      <p className="dtb-dek">What the best-dressed people in music wear — and the songs their looks sound like.</p>
      <hr className="dtb-rule" />
      <p className="dtb-mono">Words by Erica Hawkins · Photography as credited</p>
      <figure className="dtb-cover">
        <Photo src={cover.image} alt={cover.imageAlt} eager />
        <figcaption><span>{cover.caption}</span>{cover.photoCredit && <span className="dtb-mono"> {cover.photoCredit}</span>}</figcaption>
      </figure>
    </header>
    <div className="dtb-label-row"><p className="dtb-mono">The looks</p><p className="dtb-mono">{looks.length} looks</p></div>
    <p className="dtb-intro">Each look below is read for its sound: the outfit, the song it plays like, and why the two belong together. Save the ones you want to live in.</p>
    <div className="dtb-gallery">
      {lead && <Look look={lead} n={1} size="lead" />}
      <div className="dtb-grid dtb-grid-2">{rest.slice(0, 2).map((l, i) => <Look key={l.id} look={l} n={i + 2} size="medium" />)}</div>
      <div className="dtb-grid dtb-grid-3">{rest.slice(2, 5).map((l, i) => <Look key={l.id} look={l} n={i + 4} size="small" />)}</div>
    </div>
    <div className="dtb-band"><p>Every playlist comes with a dress code.</p></div>
    <div className="dtb-cta">
      <p className="dtb-cta-title">Find the look your playlist belongs to</p>
      <div className="dtb-actions">
        <a className="dtb-btn" href="#search">Start with a song</a>
        <a className="dtb-btn dtb-btn-ghost" href="#wishlist">Build your Want List</a>
      </div>
    </div>
    <footer className="dtb-credits">
      <p className="dtb-mono">Credits</p>
      <ul>{photoCredits(cover, looks).map(c => <li key={c}>{c}</li>)}</ul>
      <p>Images used with permission. Song pairings are MelodyLust's editorial reading, not the artists' own choices unless stated.</p>
    </footer>
  </section>;
}
