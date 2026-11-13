import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { boardId, isBoardId, type BoardItem } from "@/lib/style-board";

const url = z.string().max(500).refine(v => v === "" || /^https?:\/\//i.test(v));
const boardInput = z.object({
  displayName: z.string().trim().min(1).max(60),
  title: z.string().trim().min(3).max(120),
  note: z.string().trim().min(10).max(2000),
  items: z.array(z.object({
    section: z.enum(["fashion", "music", "read"]), name: z.string().trim().min(1).max(160),
    detail: z.string().max(200), link: url, image: url,
  }).strict()).min(1).max(24),
}).strict();

export const createStyleBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => boardInput.parse(input))
  .handler(async ({ data, context }) => {
    const id = boardId();
    const { error } = await context.supabase.from("style_boards").insert({
      id, owner_id: context.userId, author_display_name: data.displayName, title: data.title, note: data.note, items: data.items,
    });
    if (error) { console.error(error); throw new Error("Your board couldn't be saved. Please try again."); }
    return { id };
  });

export type StyleBoard = { id: string; author: string; title: string; note: string; items: BoardItem[]; createdAt: string };

export const getStyleBoard = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data }): Promise<StyleBoard | null> => {
    if (!isBoardId(data.id)) return null;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: { fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      } },
    });
    const { data: rows, error } = await sb.rpc("get_style_board", { _id: data.id });
    if (error) { console.error(error); throw new Error("This board is unavailable right now."); }
    const row = rows?.[0];
    if (!row) return null;
    return { id: row.id, author: row.author_display_name, title: row.title, note: row.note, items: row.items as unknown as BoardItem[], createdAt: row.created_at };
  });
