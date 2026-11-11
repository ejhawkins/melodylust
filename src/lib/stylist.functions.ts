import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isStylist } from "@/lib/stylist";

/** Whether the signed-in reader may share a stylist Story card, decided on the server from their roles and published notes. */
export const getStylistStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }, { count }] = await Promise.all([
      context.supabase.from("profiles").select("display_name").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("styling_notes").select("id", { count: "exact", head: true }).eq("owner_id", context.userId).eq("status", "approved"),
    ]);
    const stylist = isStylist({ roles: (roles ?? []).map(r => r.role), published: count ?? 0 });
    return { stylist, name: profile?.display_name || "Melodylust stylist" };
  });
