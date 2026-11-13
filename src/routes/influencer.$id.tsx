import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { getInfluencerBoards, getStylistProfile } from "@/lib/style-board.functions";
import { spotifyTrackId } from "@/lib/style-board";
import { FollowButton } from "@/components/FollowButton";

export const Route = createFileRoute("/influencer/$id")({
  loader: async ({ params }) => {
    const [page, profile] = await Promise.all([getInfluencerBoards({ data: { id: params.id } }), getStylistProfile({ data: { id: params.id } })]);
    if (!page) throw notFound();
    return { ...page, profile };
  },
  head: ({ loaderData: p }) => {
    const title = p ? `${p.author} — Style Influencer · Melodylust` : "Style Influencer · Melodylust";
    const description = p?.profile.bio ? p.profile.bio.slice(0, 155) : p ? `${p.boards.length} style board${p.boards.length === 1 ? "" : "s"} by ${p.author}: outfits, the songs they're worn to, and good reads.` : "A Melodylust Style Influencer.";
    const image = p?.boards.flatMap(b => b.items).find(i => i.image)?.image;
    return { meta: [
      { title }, { name: "description", content: description },
      { property: "og:title", content: title }, { property: "og:description", content: description },
      { property: "og:type", content: "profile" }, { name: "twitter:card", content: "summary_large_image" },
      ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
    ] };
  },
  errorComponent: () => <main className="ls-board-page grid min-h-screen place-items-center p-6 text-center"><p>This page couldn't load. Please try again.</p></main>,
  notFoundComponent: () => <main className="ls-board-page grid min-h-screen place-items-center p-6 text-center">
    <div><h1 className="ls-board-title">Influencer not found</h1><Link to="/" className="mt-4 inline-block underline">Open the Listening Room</Link></div>
  </main>,
  component: InfluencerPage,
});

function InfluencerPage() {
  const { author, boards, profile } = Route.useLoaderData();
  const [tab, setTab] = useState<"boards" | "portfolio" | "notes">("boards");
  const items = boards.flatMap(b => b.items.map(i => ({ ...i, board: b })));
  const photos = items.filter(i => i.section === "fashion" && i.image);
  const music = items.filter(i => i.section === "music");
  const reads = items.filter(i => i.section === "read");
  return <main className="ls-board-page ls-inf min-h-screen px-5 py-10">
    <article className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-3">
        <p className="ls-board-kicker">Style Influencer</p>
        <h1 className="ls-board-title">{author}</h1>
        <div className="flex gap-3 items-center"><FollowButton id={Route.useParams().id} author={author} /><Link to="/influencers" className="underline text-sm">All stylists</Link></div>
        <p className="ls-board-note">{boards.length} board{boards.length === 1 ? "" : "s"} · {photos.length} looks · {music.length} songs · {reads.length} reads</p>
        {profile.bio && <p className="ls-board-note ls-sp-bio">{profile.bio}</p>}
        {profile.inspirations && <p className="ls-board-item-detail"><span className="ls-board-kicker">Inspirations · </span>{profile.inspirations}</p>}
      </header>
      <div role="tablist" aria-label="Stylist sections" className="ls-sp-tabs">
        {([["boards", "Boards"], ["portfolio", `Portfolio (${profile.portfolio.length})`], ["notes", `Styling notes (${profile.notes.length})`]] as const).map(([id, label]) =>
          <button key={id} role="tab" type="button" aria-selected={tab === id} aria-controls={`sp-${id}`} id={`sp-tab-${id}`} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === "portfolio" && <section id="sp-portfolio" role="tabpanel" aria-labelledby="sp-tab-portfolio">
        {profile.portfolio.length ? <ul className="ls-inf-photos">{profile.portfolio.map((p, n) => <li key={n}>
          <img src={p.image} alt={p.title} loading="lazy" width={400} height={500} />
          <p className="ls-board-item-name">{p.title}</p>
          {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer nofollow">View</a>}
        </li>)}</ul> : <p className="ls-board-note">No portfolio pieces yet.</p>}
      </section>}
      {tab === "notes" && <section id="sp-notes" role="tabpanel" aria-labelledby="sp-tab-notes">
        {profile.notes.length ? <ul className="ls-inf-boards">{profile.notes.map((n, i) => <li key={i}>
          <p className="ls-board-item-name">{n.title}</p><p className="ls-board-note">{n.idea}</p>
          <p className="ls-board-item-detail">Soundtrack: {n.track} — {n.artist}{n.reason ? ` · ${n.reason}` : ""}</p>
          {n.tags.length > 0 && <p className="ls-board-item-detail">{n.tags.map(t => `#${t}`).join(" ")}</p>}
        </li>)}</ul> : <p className="ls-board-note">No approved styling notes yet.</p>}
      </section>}
      {tab === "boards" && <div id="sp-boards" role="tabpanel" aria-labelledby="sp-tab-boards" className="space-y-10">
      {photos.length > 0 && <section aria-labelledby="inf-photos"><h2 id="inf-photos" className="ls-board-h2">The fashion</h2>
        <ul className="ls-inf-photos">{photos.map((i, n) => <li key={n}>
          <img src={i.image!} alt={i.name} loading={n < 4 ? "eager" : "lazy"} width={400} height={500} />
          <p className="ls-board-item-name">{i.name}</p>
          {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer nofollow">Shop</a>}
        </li>)}</ul></section>}
      {music.length > 0 && <section aria-labelledby="inf-music"><h2 id="inf-music" className="ls-board-h2">The music</h2>
        <ul className="ls-inf-music">{music.map((i, n) => { const t = spotifyTrackId(i.link); return <li key={n}>
          {t ? <iframe title={`${i.name} on Spotify`} src={`https://open.spotify.com/embed/track/${t}`} width="100%" height="80" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" />
            : <p><span className="ls-board-item-name">{i.name}</span>{i.detail ? ` — ${i.detail}` : ""} {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer nofollow">Listen</a>}</p>}
        </li>; })}</ul></section>}
      {reads.length > 0 && <section aria-labelledby="inf-reads"><h2 id="inf-reads" className="ls-board-h2">Good reads</h2>
        <ul className="ls-board-items">{reads.map((i, n) => <li key={n}>
          {i.image && <img src={i.image} alt="" loading="lazy" width={96} height={96} />}
          <div><p className="ls-board-item-name">{i.name}</p>{i.detail && <p className="ls-board-item-detail">{i.detail}</p>}
            {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer nofollow">Read</a>}</div>
        </li>)}</ul></section>}
      <section aria-labelledby="inf-boards"><h2 id="inf-boards" className="ls-board-h2">Boards</h2>
        <ul className="ls-inf-boards">{boards.map(b => <li key={b.id}><Link to="/board/$id" params={{ id: b.id }}>{b.title}</Link><p>{b.note.slice(0, 140)}</p></li>)}</ul></section>
      </div>}
      <Link to="/" className="inline-block rounded-full bg-primary px-5 py-2 font-isidora text-sm text-primary-foreground">Make your own in the Listening Room</Link>
    </article>
  </main>;
}
