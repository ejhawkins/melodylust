import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FIT_ITEMS, findLook } from "@/lib/fit-compass";

const voterId = z.string().regex(/^[A-Za-z0-9-]{16,64}$/);

/** Aggregate vote counts per look for one item, plus the visitor's own pick. Never returns other voters. */
export const getStyleVotes = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ itemId: z.string().max(64), voter: voterId.optional() }).parse(i))
  .handler(async ({ data }) => {
    const item = FIT_ITEMS.find(i => i.id === data.itemId);
    if (!item) return { counts: {} as Record<string, number>, mine: null as string | null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("style_votes").select("look_id, voter").eq("item_id", item.id);
    if (error) { console.error("getStyleVotes", error); return { counts: {}, mine: null }; }
    const counts: Record<string, number> = {};
    let mine: string | null = null;
    for (const r of rows ?? []) { counts[r.look_id] = (counts[r.look_id] ?? 0) + 1; if (data.voter && r.voter === data.voter) mine = r.look_id; }
    return { counts, mine };
  });

/** One vote per visitor per item; voting again moves the vote. */
export const castStyleVote = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ itemId: z.string().max(64), lookId: z.string().max(64), voter: voterId }).parse(i))
  .handler(async ({ data }) => {
    if (!findLook(data.itemId, data.lookId)) throw new Error("Unknown look");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("style_votes")
      .upsert({ item_id: data.itemId, look_id: data.lookId, voter: data.voter }, { onConflict: "item_id,voter" });
    if (error) { console.error("castStyleVote", error); throw new Error("Your vote couldn't be saved."); }
    return { ok: true };
  });
