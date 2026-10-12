import { createServerFn } from "@tanstack/react-start";
import { mapTumblrPosts, type TumblrPost } from "./tumblr";

// Public blog address — not a secret, but change it if the blog moves.
export const TUMBLR_BLOG = "turnto-pg28.tumblr.com";

const POST_LIMIT = 12;
const CACHE_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 5000;

export type TumblrFeed = { posts: TumblrPost[]; connected: boolean };

let cache: { at: number; posts: TumblrPost[] } | null = null;

/**
 * Reads the latest posts from the blog. Public reads need only the consumer
 * key, so no visitor ever authenticates. The key is read inside the handler
 * and never reaches the browser.
 */
export const getTumblrPosts = createServerFn({ method: "GET" }).handler(async (): Promise<TumblrFeed> => {
  const key = process.env["TUMBLR_CONSUMER_KEY"];
  if (!key) return { posts: [], connected: false };

  if (cache && Date.now() - cache.at < CACHE_MS) return { posts: cache.posts, connected: true };

  const endpoint =
    `https://api.tumblr.com/v2/blog/${encodeURIComponent(TUMBLR_BLOG)}/posts` +
    `?api_key=${encodeURIComponent(key)}&limit=${POST_LIMIT}`;

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json", "User-Agent": "MelodyLustJournal/1.0" },
    });

    if (!response.ok) {
      console.error(`Tumblr request failed [${response.status}]: ${await response.text()}`);
      return { posts: cache?.posts ?? [], connected: true };
    }

    const posts = mapTumblrPosts(await response.json());
    cache = { at: Date.now(), posts };
    return { posts, connected: true };
  } catch (error) {
    console.error("Tumblr request could not be completed", error);
    return { posts: cache?.posts ?? [], connected: true };
  }
});
