import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LikeButton } from "@/components/LikeButton";
import type { Story } from "@/data/home";

/** A journal story read in place, from the editorial home page or the listening room. Its heart adds it to the listening
 *  room's library from either page. */
export function StoryDialog({ story, onClose }: { story: Story | null; onClose: () => void }) {
  return <Dialog open={story !== null} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="article-dialog">{story && <><span className="text-xs uppercase text-muted-foreground">{story.category} · {story.genre} / {story.date}</span><DialogTitle className="font-editorial text-4xl font-normal">{story.title}</DialogTitle><DialogDescription>{story.intro}</DialogDescription><div><LikeButton kind="story" id={String(story.id)} name={story.title} /></div><img src={story.image} alt={story.title} className="w-full aspect-[4/3] object-cover" width={1024} height={768} />{story.body.split("\n\n").map(p => <p className="article-copy" key={p}>{p}</p>)}</>}</DialogContent></Dialog>;
}
