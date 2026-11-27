import { createFileRoute, redirect } from "@tanstack/react-router";
import { ListeningRoomPage } from "@/components/ListeningRoomPage";
import { DEFAULT_THEME_ID, isListeningRoomEnabled } from "@/lib/themes/room-flag";
import { isThemeId } from "@/lib/themes/style-choice";
import type { ThemeId } from "@/lib/themes/theme-spec";

// Flag off (default): /listen redirects home, exactly as before.
export const Route = createFileRoute("/listen")({
  // ?theme= only when the link names one, so a reader's saved room style isn't overridden by the default.
  validateSearch: (search: Record<string, unknown>): { theme?: ThemeId } => (isThemeId(search["theme"]) ? { theme: search["theme"] } : {}),
  beforeLoad: () => {
    if (!isListeningRoomEnabled()) throw redirect({ to: "/", replace: true });
  },
  component: function ListenRoute() {
    const { theme } = Route.useSearch();
    return <ListeningRoomPage themeId={theme ?? DEFAULT_THEME_ID} />;
  },
});
