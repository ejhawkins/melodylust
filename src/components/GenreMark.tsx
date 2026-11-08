import { useMemo } from "react";
import { blendPath, type GenreWeights } from "@/lib/genre-shapes";
import { cn } from "@/lib/utils";

/** A mix drawn in the shape lexicon (src/lib/genre-shapes.ts): its genres blended into one shape, filled orange and
 *  outlined in two plum lines on a bright ground. The two lines are one thick plum stroke with a thinner stroke of the
 *  ground run down its middle, so they stay parallel round every curve. Decorative, since whatever holds it names the
 *  mix; `title` adds a hover note naming the blend. */
export function GenreMark({ genres, title, className }: { genres: GenreWeights; title?: string | undefined; className?: string | undefined }) {
  const d = useMemo(() => blendPath(genres, 50, 50, 38), [genres]);
  return (
    <svg viewBox="0 0 100 100" className={cn("genre-mark", className)} aria-hidden="true">
      {title && <title>{title}</title>}
      <rect className="genre-mark-ground" width="100" height="100" />
      <path className="genre-mark-line" d={d} />
      <path className="genre-mark-gap" d={d} />
    </svg>
  );
}
