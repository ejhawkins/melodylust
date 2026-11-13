import { queryOptions, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LikeButton } from "@/components/LikeButton";
import { formatDay } from "@/lib/tumblr";
import { getTumblrPosts, TUMBLR_BLOG } from "@/lib/tumblr.functions";
import { addWish, useWishlist } from "@/lib/wishlist";

// The same feed the journal's Tumblr section reads, so the two share one request.
const tumblrPosts = queryOptions({ queryKey: ["tumblr-posts"], queryFn: () => getTumblrPosts(), staleTime: 5 * 60 * 1000 });
const SHOWN = 8;

/** A post's headline: its title, else the start of its text, else its first tag. */
const headline = (post: { title: string; excerpt: string; tags: string[] }) => {
  const text = post.title.trim() || post.excerpt.trim();
  if (!text) return post.tags[0] ?? "Untitled";
  return text.length > 48 ? `${text.slice(0, 48).replace(/\s+\S*$/, "")}…` : text;
};

/** The Fashion tab's Tumblr shelf: the blog's latest picture posts, set like the capsule's looks, each one a tap from its
 *  post and savable to the Want List or Your Favorites. Loads only when the tab is open. */
export function ListenTumblr() {
  const { data, isPending, isError } = useQuery(tumblrPosts);
  const wishes = useWishlist();
  const posts = (data?.posts ?? []).filter(post => post.image).slice(0, SHOWN);
  return <>
    <h3 className="ls-fashion-sub">From Tumblr</h3>
    {isPending ? <p className="ls-empty" role="status">Loading the latest posts…</p>
      : isError || !posts.length ? <p className="ls-empty" role="status">The Tumblr posts aren’t loading right now. <a className="ls-section-link" href={`https://${TUMBLR_BLOG}`} target="_blank" rel="noopener noreferrer">Open the blog<ArrowUpRight aria-hidden /></a></p>
      : <ul className="ls-fashion-grid">
          {posts.map((post, i) => {
            const title = headline(post);
            const name = `Tumblr: ${title}`;
            const saved = wishes.some(w => w.name === name);
            const day = formatDay(post.timestamp);
            return <li key={post.id} className="ls-fashion-card">
              <a href={post.url} target="_blank" rel="noopener noreferrer" aria-label={`Open “${title}” on Tumblr`}>
                <img src={post.image!} alt={post.alt || `Tumblr post: ${title}`} loading="lazy" width={400} height={500} />
              </a>
              <span className="ls-fashion-num">Post {String(i + 1).padStart(2, "0")}</span>
              <span className="ls-fashion-title ls-tumblr-title">{title}</span>
              <span className="ls-fashion-song">{[day, post.tags[0] && `#${post.tags[0]}`].filter(Boolean).join(" · ")}</span>
              <div className="ls-fashion-actions">
                <Button variant="listenCategory" size="chip" disabled={saved} onClick={() => addWish({ kind: "piece", name, detail: day, link: post.url, note: post.tags.slice(0, 4).map(tag => `#${tag}`).join(" "), from: "Tumblr", image: post.image! })}>
                  {saved ? <Check className="size-4" /> : <Plus className="size-4" />}{saved ? "In Want List" : "Want List"}
                </Button>
                <LikeButton look="quick" kind="fashion" id={`tumblr-${post.id}`} name={title} sub="Tumblr" image={post.image!} />
              </div>
            </li>;
          })}
        </ul>}
  </>;
}
