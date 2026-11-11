import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isLiked, toggleLike, useLikes, type LikeKind, type LikeMeta } from "@/lib/likes";
import { cn } from "@/lib/utils";

/** The heart that adds a look, video, moodboard or story to Your Library (and takes it off again). "page" is the labelled
 *  button on the item's own page; "quick" is the round heart set on a feed tile's photo. */
export function LikeButton({ kind, id, name, look = "page", className, sub, image }: { kind: LikeKind; id: string; name: string; look?: "page" | "quick"; className?: string; sub?: string; image?: string }) {
  const liked = isLiked(useLikes(), kind, id);
  const label = liked ? `Remove ${name} from your library` : `Like ${name} and add it to your library`;
  return (
    <Button variant={look === "quick" ? "listenHeart" : "listenSave"} size={look === "quick" ? "icon" : "bar"} className={className}
      aria-pressed={liked} aria-label={label} title={label} onClick={() => { const meta: LikeMeta = { title: name }; if (sub) meta.sub = sub; if (image) meta.image = image; toggleLike(kind, id, meta); }}>
      <Heart aria-hidden className={cn(liked && "fill-current")} />
      {look === "page" && (liked ? "Liked · In your library" : "Like")}
    </Button>
  );
}
