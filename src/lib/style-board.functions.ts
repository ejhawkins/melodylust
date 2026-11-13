import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { boardId, cleanPortfolio, isBoardId, type BoardItem, type PortfolioPiece } from "@/lib/style-board";

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
type PublicRow = { id: string; author_display_name: string; title: string; note: string; items: unknown; created_at: string };
const toBoard = (r: PublicRow): StyleBoard => ({ id: r.id, author: r.author_display_name, title: r.title, note: r.note, items: r.items as BoardItem[], createdAt: r.created_at });

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
      h.set("apikey", key);
      return fetch(input, { ...init, headers: h });
    } },
  });
}

/** Approved boards only; pending or rejected links read as not found. */
export const getStyleBoard = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data }): Promise<StyleBoard | null> => {
    if (!isBoardId(data.id)) return null;
    const { data: rows, error } = await publicClient().rpc("get_style_board", { _id: data.id });
    if (error) { console.error(error); throw new Error("This board is unavailable right now."); }
    return rows?.[0] ? toBoard(rows[0]) : null;
  });

export const listStyleBoards = createServerFn({ method: "GET" }).handler(async (): Promise<{ boards: StyleBoard[] }> => {
  const { data, error } = await publicClient().rpc("list_style_boards", { _limit: 24 });
  if (error) { console.error(error); return { boards: [] }; }
  return { boards: (data ?? []).map(toBoard) };
});

export type MyBoard = StyleBoard & { status: "pending" | "approved" | "rejected"; rejectionReason: string | null };
type FullRow = PublicRow & { status: MyBoard["status"]; rejection_reason: string | null };
const toMine = (r: FullRow): MyBoard => ({ ...toBoard(r), status: r.status, rejectionReason: r.rejection_reason });

export const getBoardWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: own, error }, { data: roles }] = await Promise.all([
      context.supabase.from("style_boards").select("*").eq("owner_id", context.userId).order("created_at", { ascending: false }),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    if (error) throw new Error("Your boards could not be loaded.");
    const canModerate = roles?.some(r => r.role === "moderator" || r.role === "admin") ?? false;
    let queue: MyBoard[] = [];
    if (canModerate) {
      const { data } = await context.supabase.from("style_boards").select("*").eq("status", "pending").order("created_at", { ascending: true });
      queue = (data ?? []).map(toMine);
    }
    return { mine: (own ?? []).map(toMine), canModerate, queue };
  });

const reviewInput = z.object({ id: z.string().refine(isBoardId), decision: z.enum(["approved", "rejected"]), reason: z.string().trim().max(500).optional() })
  .strict().refine(v => v.decision === "approved" || Boolean(v.reason), "A rejection reason is required.");
export const reviewStyleBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reviewInput.parse(input))
  .handler(async ({ data, context }) => {
    // RLS lets only moderators/admins update; a non-moderator's update matches no row.
    const { data: rows, error } = await context.supabase.from("style_boards").update({
      status: data.decision, rejection_reason: data.decision === "rejected" ? data.reason ?? null : null,
      reviewed_at: new Date().toISOString(), reviewed_by: context.userId,
    }).eq("id", data.id).select("id");
    if (error || !rows?.length) throw new Error("You can't review this board.");
    return { ok: true };
  });

export const deleteStyleBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("style_boards").delete().eq("id", data.id).eq("owner_id", context.userId);
    if (error) throw new Error("This board couldn't be deleted.");
    return { ok: true };
  });

/** A Style Influencer page: every approved board by the author of one approved board (owner id never leaves the server). */
export const getInfluencerBoards = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data }): Promise<{ author: string; boards: StyleBoard[] } | null> => {
    if (!isBoardId(data.id)) return null;
    const { data: rows, error } = await publicClient().rpc("get_influencer_boards", { _board_id: data.id });
    if (error) { console.error(error); throw new Error("This page is unavailable right now."); }
    if (!rows?.length) return null;
    const boards = rows.map(toBoard);
    return { author: boards.find(b => b.id === data.id)?.author ?? boards[0]!.author, boards };
  });

export type InfluencerCard = { id: string; author: string; boardCount: number; photos: { name: string; image: string }[] };
export const listInfluencers = createServerFn({ method: "GET" }).handler(async (): Promise<{ influencers: InfluencerCard[] }> => {
  const { data, error } = await publicClient().rpc("list_influencers", { _limit: 48 });
  if (error) { console.error(error); throw new Error("Stylists are unavailable right now."); }
  return { influencers: (data ?? []).map(r => ({ id: r.board_id, author: r.author_display_name, boardCount: r.board_count,
    photos: (r.items as BoardItem[]).filter(i => i.image).map(i => ({ name: i.name, image: i.image! })) })) };
});

export type StylistNote = { title: string; idea: string; tags: string[]; artist: string; track: string; reason: string; createdAt: string };
export type StylistProfile = { bio: string; inspirations: string; portfolio: PortfolioPiece[]; notes: StylistNote[] };
export const getStylistProfile = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data }): Promise<StylistProfile> => {
    const empty = { bio: "", inspirations: "", portfolio: [], notes: [] };
    if (!isBoardId(data.id)) return empty;
    const { data: rows, error } = await publicClient().rpc("get_stylist_profile", { _board_id: data.id });
    if (error) { console.error(error); return empty; }
    const r = rows?.[0];
    return r ? { bio: r.bio, inspirations: r.inspirations, portfolio: r.portfolio as PortfolioPiece[], notes: r.notes as StylistNote[] } : empty;
  });

export const getMyStylistProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("profiles").select("bio, inspirations, portfolio").eq("id", context.userId).maybeSingle();
    return { bio: data?.bio ?? "", inspirations: data?.inspirations ?? "", portfolio: (data?.portfolio ?? []) as PortfolioPiece[] };
  });

const profileInput = z.object({ bio: z.string().max(1200), inspirations: z.string().max(600),
  portfolio: z.array(z.object({ title: z.string().max(200), image: z.string().max(1000), link: z.string().max(1000) })).max(30) });
export const saveMyStylistProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update({ bio: data.bio.trim(), inspirations: data.inspirations.trim(), portfolio: cleanPortfolio(data.portfolio) }).eq("id", context.userId);
    if (error) { console.error(error); throw new Error("Your profile couldn't be saved."); }
    return { ok: true };
  });
