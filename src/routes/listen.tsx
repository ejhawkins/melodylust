import { createFileRoute, redirect } from "@tanstack/react-router";
import { ListeningRoomPage } from "@/components/ListeningRoomPage";
import { isListeningRoomEnabled, parseThemeId } from "@/lib/themes/room-flag";

// Flag off (default): /listen redirects home, exactly as before.
export const Route = createFileRoute("/listen")({
  validateSearch: (search: Record<string, unknown>) => ({ theme: parseThemeId(search["theme"]) }),
  beforeLoad: () => {
    if (!isListeningRoomEnabled()) throw redirect({ to: "/", replace: true });
  },
  component: function ListenRoute() {
    const { theme } = Route.useSearch();
    return <ListeningRoomPage themeId={theme} />;
  },
});
