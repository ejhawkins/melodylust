import { createServerFn } from "@tanstack/react-start";
import { mapTumblrPosts, mapTumblrRss, type TumblrPost } from "./tumblr";

// Public blog address — not a secret, but change it if the blog moves.
export const TUMBLR_BLOG = "turnto-pg28.tumblr.com";

const POST_LIMIT = 12;
const CACHE_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 5000;

export type TumblrFeed = { posts: TumblrPost[]; connected: boolean };

let cache: { at: number; posts: TumblrPost[] } | null = null;

/**
 * Reads the latest posts from the blog. With TUMBLR_CONSUMER_KEY set it uses the API
 * (public reads need only that key, read inside the handler so it never reaches the
 * browser); without one it reads the blog's public RSS feed, which needs no key at all.
 * Either way no visitor ever authenticates.
 */
export const getTumblrPosts = createServerFn({ method: "GET" }).handler(async (): Promise<TumblrFeed> => {
  const key = process.env["TUMBLR_CONSUMER_KEY"];

  if (cache && Date.now() - cache.at < CACHE_MS) return { posts: cache.posts, connected: true };

  const endpoint = key
    ? `https://api.tumblr.com/v2/blog/${encodeURIComponent(TUMBLR_BLOG)}/posts` +
      `?api_key=${encodeURIComponent(key)}&limit=${POST_LIMIT}`
    : `https://${TUMBLR_BLOG}/rss`;

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: key ? "application/json" : "application/rss+xml", "User-Agent": "MelodyLustJournal/1.0" },
    });

    if (!response.ok) {
      console.error(`Tumblr request failed [${response.status}]: ${await response.text()}`);
      return { posts: cache?.posts ?? [], connected: true };
    }

    const posts = key ? mapTumblrPosts(await response.json()) : mapTumblrRss(await response.text());
    cache = { at: Date.now(), posts };
    return { posts, connected: true };
  } catch (error) {
    console.error("Tumblr request could not be completed", error);
    return { posts: cache?.posts ?? [], connected: true };
  }
});
