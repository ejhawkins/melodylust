import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isLiked, toggleLike, useLikes, type LikeKind, type LikeMeta } from "@/lib/likes";
import { cn } from "@/lib/utils";

/** The heart that adds a look, video, moodboard or story to Your Library (and takes it off again). "page" is the labelled
 *  button on the item's own page; "quick" is the round heart set on a feed tile's photo. A host that saves the item
 *  somewhere else as well (the product card also files it in the Want List) passes `onLike` and names both places in `into`. */
export function LikeButton({ kind, id, name, look = "page", className, sub, image, into = "your library", onLike }: { kind: LikeKind; id: string; name: string; look?: "page" | "quick"; className?: string; sub?: string; image?: string; into?: string; onLike?: (liked: boolean) => void }) {
  const liked = isLiked(useLikes(), kind, id);
  const label = liked ? `Remove ${name} from your library` : `Like ${name} and add it to ${into}`;
  return (
    <Button variant={look === "quick" ? "listenHeart" : "listenSave"} size={look === "quick" ? "icon" : "bar"} className={className}
      aria-pressed={liked} aria-label={label} title={label} onClick={() => { const meta: LikeMeta = { title: name }; if (sub) meta.sub = sub; if (image) meta.image = image;
        // Toggle first, then tell the host: `onLike?.(toggleLike(…))` skips the toggle itself whenever there is no onLike.
        const now = toggleLike(kind, id, meta); onLike?.(now); }}>
      <Heart aria-hidden className={cn(liked && "fill-current")} />
      {look === "page" && (liked ? "Liked · In your library" : "Like")}
    </Button>
  );
}
