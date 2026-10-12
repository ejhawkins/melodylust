import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type NoteRow = Database["public"]["Tables"]["styling_notes"]["Row"];
export type StylingNoteView = NoteRow & { photo_urls: string[] };

const noteInput = z.object({
  id: z.string().uuid().optional(),
  displayName: z.string().trim().min(1).max(60),
  title: z.string().trim().min(3).max(120),
  stylingIdea: z.string().trim().min(10).max(2000),
  tags: z.array(z.string().trim().min(1).max(30)).max(8),
  songArtist: z.string().trim().min(1).max(120),
  songTrack: z.string().trim().min(1).max(160),
  songReason: z.string().trim().min(3).max(500),
  photoPaths: z.array(z.string().min(1).max(500)).min(1).max(4),
  photoAlts: z.array(z.string().trim().min(3).max(240)).min(1).max(4),
}).strict().refine(value => value.photoPaths.length === value.photoAlts.length, "Every photo needs alternative text.");

const reviewInput = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(500).optional(),
}).strict().refine(value => value.decision === "approved" || Boolean(value.reason), "A rejection reason is required.");

async function withSignedPhotos(rows: NoteRow[]): Promise<StylingNoteView[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return Promise.all(rows.map(async note => {
    const signed = await Promise.all(note.photo_paths.map(async path => {
      const { data } = await supabaseAdmin.storage.from("styling-notes").createSignedUrl(path, 3600);
      return data?.signedUrl ?? "";
    }));
    return { ...note, photo_urls: signed };
  }));
}

export const listApprovedStylingNotes = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("styling_notes")
    .select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(60);
  if (error) throw new Error("Styling Notes are unavailable.");
  return { notes: await withSignedPhotos(data) };
});

export const getStylingNotesWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }, { data: own, error }] = await Promise.all([
      context.supabase.from("profiles").select("display_name").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("styling_notes").select("*").eq("owner_id", context.userId).order("created_at", { ascending: false }),
    ]);
    if (error) throw new Error("Your submissions could not be loaded.");
    const canModerate = roles?.some(entry => entry.role === "moderator" || entry.role === "admin") ?? false;
    let queue: NoteRow[] = [];
    if (canModerate) {
      const { data } = await context.supabase.from("styling_notes").select("*").eq("status", "pending").order("created_at", { ascending: true });
      queue = data ?? [];
    }
    return {
      displayName: profile?.display_name ?? "",
      canModerate,
      own: await withSignedPhotos(own ?? []),
      queue: await withSignedPhotos(queue),
    };
  });

export const saveStylingNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => noteInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.photoPaths.some(path => !path.startsWith(`${context.userId}/`))) throw new Error("Invalid photo path.");
    const values = {
      owner_id: context.userId,
      author_display_name: data.displayName,
      title: data.title,
      styling_idea: data.stylingIdea,
      tags: [...new Set(data.tags.map(tag => tag.toLowerCase()))],
      song_artist: data.songArtist,
      song_track: data.songTrack,
      song_reason: data.songReason,
      photo_paths: data.photoPaths,
      photo_alts: data.photoAlts,
      status: "pending" as const,
    };
    const profileResult = await context.supabase.from("profiles").update({ display_name: data.displayName, updated_at: new Date().toISOString() }).eq("id", context.userId);
    if (profileResult.error) throw new Error("Your display name could not be saved.");
    const result = data.id
      ? await context.supabase.from("styling_notes").update(values).eq("id", data.id).eq("owner_id", context.userId).select("id").single()
      : await context.supabase.from("styling_notes").insert(values).select("id").single();
    if (result.error) throw new Error("Your Styling Note could not be submitted.");
    return { id: result.data.id };
  });

export const deleteStylingNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const { data: note } = await context.supabase.from("styling_notes").select("photo_paths").eq("id", data.id).eq("owner_id", context.userId).maybeSingle();
    if (!note) throw new Error("Styling Note not found.");
    const { error } = await context.supabase.from("styling_notes").delete().eq("id", data.id).eq("owner_id", context.userId);
    if (error) throw new Error("Your Styling Note could not be deleted.");
    if (note.photo_paths.length) await context.supabase.storage.from("styling-notes").remove(note.photo_paths);
    return { ok: true };
  });

export const reviewStylingNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reviewInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "moderator" });
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!allowed && !admin) throw new Error("Moderator access is required.");
    const { error } = await context.supabase.from("styling_notes").update({
      status: data.decision,
      rejection_reason: data.decision === "rejected" ? data.reason ?? "Not approved." : null,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    }).eq("id", data.id).eq("status", "pending");
    if (error) throw new Error("This review could not be saved.");
    return { ok: true };
  });