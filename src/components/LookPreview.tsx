import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LOOK_MAX_PIECES, seasonFor, type LookImageStatus } from '@/lib/look-image';
import { formatPrice, type ShopProduct } from '@/lib/farfetch';
import { addWish } from '@/lib/wishlist';

type State = { status: 'idle' | LookImageStatus; image: string | null };

const MESSAGES: Partial<Record<State['status'], string>> = {
  failed: 'That image didn’t come out. Try again.',
  not_configured: 'Model images aren’t set up on this site yet.',
  rate_limited: 'That’s the limit for model images this hour. Try again later.',
  out_of_credits: 'Model images are paused for now.',
  unavailable: 'Model images are unavailable right now. The pieces above still stand.',
};
/** A small copy of the image to keep on this device: FASHN removes its own after three days. Null when no copy could be made. */
async function keepCopy(src: string): Promise<string | null> {
  try {
    // FASHN's host doesn't let a page read its images, so the server hands the bytes over.
    const { fetchLookCopy } = await import('@/lib/look-image.functions');
    const { image: data } = await fetchLookCopy({ data: src });
    if (!data) return null;
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = data; });
    const width = Math.min(480, image.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = Math.round(width * image.naturalHeight / image.naturalWidth);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const copy = canvas.toDataURL('image/jpeg', 0.8);
    return copy.startsWith('data:image/jpeg') ? copy : null;
  } catch { return null; }
}

const POLL_MS = 2500;
const GIVE_UP_MS = 180_000;

/** On request, one AI image of an anonymous model wearing up to three of the idea's Farfetch pieces, styled for the season. Costs a credit, so it never runs on its own. */
export function LookPreview({ products, mood, from }: { products: ShopProduct[]; mood?: string | undefined; from: string }) {
  const [state, setState] = useState<State>({ status: 'idle', image: null });
  const [saved, setSaved] = useState<'no' | 'saving' | 'look' | 'photo'>('no');
  const run = useRef(0); // a newer outfit, or leaving the page, drops an older answer
  const worn = products.slice(0, LOOK_MAX_PIECES);
  const lead = worn[0];
  const names = worn.map(product => `${product.brand} ${product.name}`);
  const key = `${worn.map(product => product.id).join(',')}|${mood ?? ''}`;
  useEffect(() => { run.current += 1; setState({ status: 'idle', image: null }); setSaved('no'); return () => { run.current += 1; }; }, [key]);
  if (!lead) return null;

  const generate = async () => {
    const mine = ++run.current;
    const live = () => run.current === mine;
    setState({ status: 'working', image: null });
    try {
      // Loaded on the tap, so pages that never ask for an image don't carry it.
      const { checkLookImage, startLookImage } = await import('@/lib/look-image.functions');
      const start = await startLookImage({ data: {
        pieces: worn.map((product, index) => ({ image: product.image, name: names[index]!.slice(0, 160) })),
        season: seasonFor(new Date()), ...(mood ? { mood: mood.slice(0, 80) } : {}),
      } });
      if (!live()) return;
      if (start.status === 'ready') { setState({ status: 'ready', image: start.image }); return; }
      if (start.status !== 'working' || !start.id) { setState({ status: start.status, image: null }); return; }
      const began = Date.now();
      while (live() && Date.now() - began < GIVE_UP_MS) {
        await new Promise(resolve => setTimeout(resolve, POLL_MS));
        if (!live()) return;
        const result = await checkLookImage({ data: start.id });
        if (!live()) return;
        if (result.status !== 'working') { setState(result); return; }
      }
      if (live()) setState({ status: 'unavailable', image: null });
    } catch { if (live()) setState({ status: 'unavailable', image: null }); }
  };

  // The Want List keeps its own small copy of the image; if the browser can't make one, it keeps the Farfetch photo instead.
  const save = async () => {
    if (!state.image || saved !== 'no') return;
    const mine = run.current;
    setSaved('saving');
    const copy = await keepCopy(state.image);
    if (run.current !== mine) return;
    addWish({ kind: 'piece', name: `${names.join(' + ')}, on a model`.slice(0, 200), detail: worn.map(product => formatPrice(product.price, product.currency)).join(' + '), link: lead.link,
      note: copy ? 'AI-generated image. The model is not a real person.' : '', from: mood ? `${from}: ${mood}` : from, image: copy ?? lead.image });
    setSaved(copy ? 'look' : 'photo');
  };

  const working = state.status === 'working';
  const message = MESSAGES[state.status];
  return <div className="stylus-look-preview">
    {state.image
      ? <figure>
          <img src={state.image} alt={`AI-generated image of a model wearing ${names.join(', ')}`} width={768} height={1024}
            onError={() => setState({ status: 'failed', image: null })} />
          <figcaption>AI-generated image, styled for {seasonFor(new Date())}, made from the Farfetch {worn.length > 1 ? 'photos' : 'photo'} of {names.join(', ')}. The model is not a real person, and the pieces may differ in detail.</figcaption>
          <Button variant="stylusTool" onClick={save} disabled={saved !== 'no'}>
            {saved === 'look' || saved === 'photo' ? <Check aria-hidden="true" /> : saved === 'saving' ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
            {saved === 'look' || saved === 'photo' ? 'In your Want List' : 'Add to Want List'}
          </Button>
        </figure>
      : <Button variant="stylusTool" onClick={generate} disabled={working} aria-busy={working}>
          {working ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Sparkles aria-hidden="true" />}
          {working ? 'Styling the model…' : 'See it on a model'}
        </Button>}
    <p role="status" className="stylus-shop-status">{working ? 'This takes up to a minute.' : saved === 'look' ? 'Saved with this image.' : saved === 'photo' ? 'Saved with the Farfetch photo; this image couldn’t be copied.' : message ?? ''}</p>
  </div>;
}
