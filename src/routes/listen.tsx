import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/listen")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
