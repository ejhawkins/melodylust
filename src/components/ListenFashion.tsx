import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Lock, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FitCompass } from "@/components/FitCompass";
import { LikeButton } from "@/components/LikeButton";
import { ListenTumblr } from "@/components/ListenTumblr";
import { supabase } from "@/integrations/supabase/client";
import { FIT_ITEMS, fitWishName } from "@/lib/fit-compass";
import { getStylistStatus } from "@/lib/stylist.functions";
import { drawStylistCard } from "@/lib/stylist-card";
import { addWish, useWishlist } from "@/lib/wishlist";

/** The Listening Room's Fashion tab: the Fit Compass, the capsule of looks with their songs, the blog's latest Tumblr posts, and a Story card only stylists can share. */
export function ListenFashion({ onProfile }: { onProfile: () => void }) {
  const item = FIT_ITEMS[0]!;
  const wishes = useWishlist();
  const status = useServerFn(getStylistStatus);
  const [me, setMe] = useState<{ stylist: boolean; name: string } | null | "out">(null);
  const [pick, setPick] = useState(item.looks[0]!.id);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const check = async (signedIn: boolean) => {
      if (!signedIn) { if (live) setMe("out"); return; }
      try { const s = await status(); if (live) setMe(s); } catch { if (live) setMe("out"); }
    };
    supabase.auth.getSession().then(({ data }) => check(!!data.session)).catch(() => setMe("out"));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => void check(!!s));
    return () => { live = false; data.subscription.unsubscribe(); };
  }, [status]);

  const look = item.looks.find(l => l.id === pick) ?? item.looks[0]!;
  const share = async () => {
    if (!me || me === "out" || !me.stylist) return;
    setBusy(true);
    try {
      const link = `${location.origin}/song/${look.song.spotify}`;
      const blob = await drawStylistCard(look, item.name, me.name, link);
      if (!blob) { toast.error("The Story card couldn't be made. Try again."); return; }
      const name = `${look.id}-styled-story.png`;
      const file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: look.title, text: `Styled by ${me.name} · ${link}` }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      void navigator.clipboard?.writeText(link).catch(() => null);
      toast("Story card downloaded", { description: "Add it to your Instagram Story and paste the copied link as a link sticker." });
    } finally { setBusy(false); }
  };

  return (
    <section className="ls-section ls-fashion" aria-labelledby="ls-fashion">
      <div className="ls-section-head"><h2 id="ls-fashion">Fashion</h2><span>One piece, four ways, each with its song.</span></div>
      <FitCompass compact />

      <h3 className="ls-fashion-sub">The capsule</h3>
      <ul className="ls-fashion-grid">
        {item.looks.map(l => {
          const name = fitWishName(item, l);
          const saved = wishes.some(w => w.name === name);
          return <li key={l.id} className="ls-fashion-card">
            {l.images[0] && <img src={l.images[0].src} alt={l.images[0].alt} style={{ objectPosition: l.images[0].focus }} loading="lazy" width={400} height={500} />}
            <span className="ls-fashion-num">{l.num}</span>
            <span className="ls-fashion-title">{l.title}</span>
            <span className="ls-fashion-song">♪ {l.song.title} — {l.song.artist}</span>
            <div className="ls-fashion-actions">
              <Button variant="listenCategory" size="chip" disabled={saved} onClick={() => addWish({ kind: "piece", name, detail: l.line, link: "", note: `${l.song.title} — ${l.song.artist}`, from: "Fashion", ...(l.images[0] ? { image: l.images[0].src } : {}) })}>
                {saved ? <Check className="size-4" /> : <Plus className="size-4" />}{saved ? "In Want List" : "Want List"}
              </Button>
              <LikeButton look="quick" kind="fashion" id={`fashion-${l.id}`} name={l.title} sub={item.name} {...(l.images[0] ? { image: l.images[0].src } : {})} />
            </div>
          </li>;
        })}
      </ul>

      <ListenTumblr />

      <div className="ls-fashion-share">
        <p className="ls-fashion-kicker">For stylists</p>
        <h3 className="ls-fashion-sub">Share a look to your Story</h3>
        {me === null ? <p className="ls-empty">Checking your profile…</p>
          : me === "out" ? <><p className="ls-empty"><Lock className="inline size-4" /> Sign in as a stylist to share Story cards.</p><Button variant="listenOutline" size="bar" onClick={onProfile}>Open your profile</Button></>
          : !me.stylist ? <p className="ls-empty"><Lock className="inline size-4" /> Story cards open once one of your Styling Notes is published.</p>
          : <>
            <div className="ls-fashion-picks" role="radiogroup" aria-label="Look to share">
              {item.looks.map(l => <Button key={l.id} variant="listenCategory" size="chip" role="radio" aria-checked={pick === l.id} aria-pressed={pick === l.id} onClick={() => setPick(l.id)}>{l.title}</Button>)}
            </div>
            <Button variant="listenSolid" size="bar" disabled={busy} onClick={() => void share()}><Download className="size-4" />{busy ? "Making card…" : `Story card · styled by ${me.name}`}</Button>
          </>}
      </div>
    </section>
  );
}
