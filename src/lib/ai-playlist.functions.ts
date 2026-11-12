import { createServerFn } from "@tanstack/react-start";
import { AI_PLAYLIST_PROMPT, aiPlaylistInputSchema, readAIPlaylist, type AIPlaylistResponse } from "./ai-playlist";
import { createRateLimiter } from "./rate-limit";

// Each answer costs AI credit, so each visitor gets a handful an hour (memory, per server instance).
const limiter = createRateLimiter({ limit: 15, windowMs: 60 * 60_000 });

/** A playlist for the reader's prompt, picked only from the Studio songs they sent. The key is read here, on the server. */
export const generateAIPlaylist = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => aiPlaylistInputSchema.parse(input))
  .handler(async ({ data }): Promise<AIPlaylistResponse> => {
    const { getAIProvider, readAIJSON } = await import("./ai/read-json.server");
    if (!getAIProvider()) return { status: "not_configured", playlist: null };
    const { clientKey } = await import("./client-key.server");
    if (!limiter.allow(await clientKey())) return { status: "rate_limited", playlist: null };
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const playlist = readAIPlaylist(await readAIJSON(AI_PLAYLIST_PROMPT, data, getRequest()), data);
      return playlist ? { status: "ok", playlist } : { status: "unavailable", playlist: null };
    } catch (failure) {
      // Server log only; never a key.
      console.error("[AI playlist] failed", failure instanceof Error ? failure.message : failure);
      return { status: "unavailable", playlist: null };
    }
  });
