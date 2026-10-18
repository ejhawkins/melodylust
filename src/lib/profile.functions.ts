import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const displayNameInput = z.object({ displayName: z.string().trim().min(1, "Add a name.").max(60, "Keep it under 60 characters.") }).strict();

/** Renames the signed-in reader. Runs as them, so it can only ever touch their own profile row. */
export const updateDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => displayNameInput.parse(input))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("profiles")
      .update({ display_name: data.displayName, updated_at: new Date().toISOString() })
      .eq("id", context.userId).select("display_name").maybeSingle();
    if (error || !row) throw new Error("Your name could not be saved.");
    return { displayName: row.display_name };
  });
