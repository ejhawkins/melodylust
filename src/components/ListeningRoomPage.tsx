import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { RoomLoader } from "@/components/RoomLoader";
import type { ThemeId } from "@/lib/themes/theme-spec";

// Progress from real signals: page hydrated (50), then fonts ready (100).
// The Spotify SDK "ready" signal joins these when the listening-room branch lands.
export function ListeningRoomPage({ themeId }: { themeId: ThemeId }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    let alive = true;
    setProgress(50);
    const fonts = typeof document !== "undefined" ? document.fonts?.ready : undefined;
    (fonts ?? Promise.resolve()).finally(() => {
      if (alive) setProgress(100);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (entered) {
    return (
      <main className="p-8 text-center" role="status">
        Listening mode needs Spotify sign-in, which is not connected yet.
      </main>
    );
  }

  return (
    <RoomLoader
      themeId={themeId}
      progress={progress}
      onEnter={() => setEntered(true)}
      onStaySilent={() => void navigate({ to: "/" })}
    />
  );
}
