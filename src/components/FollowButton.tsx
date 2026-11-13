import { Button } from "@/components/ui/button";
import { setFollow, useFollows } from "@/lib/follows";

export function FollowButton({ id, author }: { id: string; author: string }) {
  const on = useFollows().some(f => f.id === id);
  return <Button variant={on ? "listenOutline" : "listenSolid"} size="chip" aria-pressed={on} onClick={() => setFollow({ id, author })}>{on ? "Following" : "Follow"}</Button>;
}
