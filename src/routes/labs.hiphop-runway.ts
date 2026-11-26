import { createFileRoute } from "@tanstack/react-router";
import { canViewRoom } from "@/lib/hiphop-preview/access";
import page from "@/lib/hiphop-preview/room.html?raw";

export const Route = createFileRoute("/labs/hiphop-runway")({
  server: {
    handlers: {
      GET: () => {
        const allowed = canViewRoom(
          process.env["VERCEL_ENV"],
          process.env["VERCEL_GIT_COMMIT_REF"],
          import.meta.env.DEV,
        );
        return new Response(allowed ? page : "Not found", {
          status: allowed ? 200 : 404,
          headers: {
            "Content-Type": allowed ? "text/html; charset=utf-8" : "text/plain",
            "Cache-Control": "private, no-store",
            "X-Robots-Tag": "noindex, nofollow, noarchive",
          },
        });
      },
    },
  },
});
