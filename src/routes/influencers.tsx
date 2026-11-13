import { createFileRoute, Link } from "@tanstack/react-router";
import { listInfluencers } from "@/lib/style-board.functions";
import { FollowButton } from "@/components/FollowButton";
import { useFollows } from "@/lib/follows";

export const Route = createFileRoute("/influencers")({
  loader: () => listInfluencers(),
  head: () => ({ meta: [
    { title: "Style Influencers · Melodylust" },
    { name: "description", content: "Follow Melodylust stylists: approved style boards with outfit photos, the songs they're worn to, and good reads." },
    { property: "og:title", content: "Style Influencers · Melodylust" },
    { property: "og:description", content: "Follow Melodylust stylists and their approved style boards." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  errorComponent: () => <main className="ls-board-page grid min-h-screen place-items-center p-6 text-center"><p>Stylists couldn't load. Please try again.</p></main>,
  notFoundComponent: () => <main className="ls-board-page grid min-h-screen place-items-center p-6"><p>Not found.</p></main>,
  component: InfluencersPage,
});

function InfluencersPage() {
  const { influencers } = Route.useLoaderData();
  const follows = useFollows();
  const followed = influencers.filter(i => follows.some(f => f.id === i.id));
  const Card = ({ i }: { i: (typeof influencers)[number] }) => <li className="ls-infdir-card">
    <Link to="/influencer/$id" params={{ id: i.id }} className="ls-infdir-photos" aria-label={`${i.author}'s profile`}>
      {i.photos.length ? i.photos.slice(0, 4).map((p, n) => <img key={n} src={p.image} alt={p.name} loading="lazy" width={200} height={250} />) : <span className="ls-boards-noimg" />}
    </Link>
    <div className="ls-infdir-meta"><div><Link to="/influencer/$id" params={{ id: i.id }} className="ls-board-item-name">{i.author}</Link>
      <p className="ls-board-item-detail">{i.boardCount} approved board{i.boardCount === 1 ? "" : "s"}</p></div>
      <FollowButton id={i.id} author={i.author} /></div>
  </li>;
  return <main className="ls-board-page min-h-screen px-5 py-10">
    <div className="mx-auto max-w-4xl space-y-10">
      <header className="space-y-3"><p className="ls-board-kicker">Melodylust stylists</p><h1 className="ls-board-title">Style Influencers</h1>
        <p className="ls-board-note">Reader stylists whose boards passed review. Follow the ones you like; we keep your list on this device.</p></header>
      {followed.length > 0 && <section aria-labelledby="inf-following"><h2 id="inf-following" className="ls-board-h2">Following</h2><ul className="ls-infdir">{followed.map(i => <Card key={i.id} i={i} />)}</ul></section>}
      <section aria-labelledby="inf-all"><h2 id="inf-all" className="ls-board-h2">All stylists</h2>
        {influencers.length ? <ul className="ls-infdir">{influencers.map(i => <Card key={i.id} i={i} />)}</ul>
          : <p className="ls-board-note">No stylists yet — the first approved board will appear here.</p>}</section>
      <Link to="/" className="inline-block rounded-full bg-primary px-5 py-2 font-isidora text-sm text-primary-foreground">Post a board in the Listening Room</Link>
    </div>
  </main>;
}
