import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { RoomLoader } from "@/components/RoomLoader";
import { StyleOptions } from "@/components/StylePicker";
import { ROOM_THEMES, type ThemeId } from "@/lib/themes/theme-spec";
import { isListeningRoomEnabled } from "@/lib/themes/room-flag";
import { resolveSetlist, roomReadinessSteps, trackReadiness } from "@/lib/themes/readiness";
import { useStyleChoice } from "@/lib/themes/style-choice";
import { themeStyle } from "@/lib/themes/theme-css";

// Progress from real signals (src/lib/themes/readiness.ts): the theme's content, fonts, and the Spotify
// player when the listening room has registered its readiness. Never a fixed timer.
export function ListeningRoomPage({ themeId }: { themeId: ThemeId }) {
  const navigate = useNavigate();
  const style = useStyleChoice();
  // With personalization on, the reader's chosen style wins; otherwise ?theme= as before.
  const activeId = style.selection?.primary ?? themeId;
  const theme = ROOM_THEMES[activeId];
  const [progress, setProgress] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => trackReadiness(roomReadinessSteps({ theme, roomOn: isListeningRoomEnabled() }), setProgress), [theme]);

  if (entered) {
    return (
      <main className="p-8 text-center" role="status">
        Listening mode needs Spotify sign-in, which is not connected yet.
      </main>
    );
  }

  const setlist = resolveSetlist(theme);
  return (
    <div data-room-style={activeId} style={themeStyle(theme)}>
      <RoomLoader
        themeId={activeId}
        progress={progress}
        onEnter={() => setEntered(true)}
        onStaySilent={() => void navigate({ to: "/" })}
      />
      <div className="flex flex-wrap items-start justify-center gap-6 p-6" style={{ background: theme.palette.ink, color: theme.palette.text }}>
        {style.enabled && <StyleOptions selection={{ primary: activeId }} onChoose={next => style.choose(next)} includeDefault={false} />}
        <section aria-labelledby="ml-setlist" className="max-w-md">
          <h2 id="ml-setlist" className="mb-2 text-xs uppercase tracking-[0.3em]" style={{ color: theme.palette.highlight }}>Setlist · {theme.label}</h2>
          <ol className="grid gap-2">
            {setlist.map(entry => (
              <li key={entry.slot}>
                <span className="mr-2 text-xs uppercase tracking-widest opacity-80">{entry.slot}</span>
                <strong>{entry.song.title}</strong> · {entry.song.artist}
                <span className="block text-sm opacity-80">{entry.why}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
