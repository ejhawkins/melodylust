import { useEffect, useState } from 'react';
import { Check, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { lookupProducts } from '@/lib/products.functions';
import { formatPrice, type ShopProduct } from '@/lib/farfetch';
import { addWish } from '@/lib/wishlist';
import { CANDIDATE_POOL, pickOutfitProducts } from '@/lib/product-pick';

type ShopState = { status: 'loading' | 'ready' | 'none' | 'unavailable'; products: ShopProduct[] };

/** Real Farfetch listings for a look: a house's signature pieces, or one match per item. Product
 *  photos are the provider's own; a card whose photo fails to load is hidden, never replaced.
 *  With `showStatus`, loading / no-match / unavailable are spelled out instead of rendering nothing. */
export function ShopProducts({ designer, items, from, title, showStatus = false, note, seed, genres = [] }: {
  designer: string | null; items?: string[]; from: string; title?: string; showStatus?: boolean; note?: string;
  /** With a seed, each piece fetches several candidates and one is picked per artist and outfit (see product-pick). */
  seed?: string; genres?: string[];
}) {
  const [state, setState] = useState<ShopState>({ status: 'loading', products: [] });
  const [broken, setBroken] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const query = `${designer ?? ''}|${items?.join('|') ?? ''}|${seed ?? ''}|${genres.join(',')}`;
  useEffect(() => {
    setState({ status: 'loading', products: [] }); setBroken([]);
    let current = true; // a newer artist/outfit replaces this one's answer
    const pieces = [...new Set(items ?? [])].slice(0, 4);
    const searches = pieces.length
      ? pieces.map(item => lookupProducts({ data: { ...(designer ? { designer } : {}), item, limit: seed ? CANDIDATE_POOL : 1 } }))
      : designer ? [lookupProducts({ data: { designer, limit: 3 } })] : [];
    if (!searches.length) { setState({ status: 'none', products: [] }); return; }
    Promise.all(searches).then(responses => {
      if (!current) return;
      const products = seed
        ? pickOutfitProducts(pieces.map((item, index) => ({ item, products: responses[index]?.products ?? [] })), seed, genres)
        : responses.flatMap(response => response.products).filter((product, index, all) => all.findIndex(other => other.id === product.id) === index);
      const anyOk = responses.some(response => response.status === 'ok');
      setState({ status: products.length ? 'ready' : anyOk ? 'none' : 'unavailable', products });
    }).catch(() => { if (current) setState({ status: 'unavailable', products: [] }); });
    return () => { current = false; };
  }, [query]);

  const shown = state.products.filter(product => !broken.includes(product.id));
  const heading = title ?? (items?.length ? 'Shop these pieces' : 'Shop the house');
  if (!showStatus && !shown.length) return null;
  const allPhotosFailed = state.status === 'ready' && !shown.length;
  return <section className="stylus-shop" aria-label={designer ? `${heading}: ${designer}` : heading} aria-busy={state.status === 'loading'}>
    <span className="stylus-eyebrow">{heading}</span>
    {state.status === 'loading' && <p role="status" className="stylus-shop-status">Finding real pieces on Farfetch…</p>}
    {state.status === 'none' && <p role="status" className="stylus-shop-status">No matching pieces on Farfetch right now.</p>}
    {(state.status === 'unavailable' || allPhotosFailed) && <p role="status" className="stylus-shop-status">Shopping is unavailable right now. The outfit above still stands.</p>}
    {shown.length > 0 && <ul>{shown.map(product => <li key={product.id}>
      <img src={product.image} alt={`${product.brand} ${product.name}`} width={400} height={533} loading="lazy"
        onError={() => setBroken(ids => [...ids, product.id])} />
      <span className="stylus-shop-name"><strong>{product.brand}</strong> {product.name}</span>
      <span className="stylus-shop-price">{formatPrice(product.price, product.currency)}</span>
      <span className="stylus-shop-actions">
        <Button variant="stylusTool" size="sm" asChild><a href={product.link} target="_blank" rel="noopener noreferrer" aria-label={`Search Farfetch for ${product.brand} ${product.name}`}>Farfetch <ExternalLink aria-hidden="true" /></a></Button>
        <Button variant="stylusTool" size="icon" aria-label={`Save ${product.brand} ${product.name} to My Edit`} title="Save to My Edit" onClick={() => { addWish({ kind: 'piece', name: `${product.brand} ${product.name}`, detail: formatPrice(product.price, product.currency), link: product.link, note: '', from }); setSaved(s => [...s, product.id]); }}>{saved.includes(product.id) ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}</Button>
      </span>
    </li>)}</ul>}
    <p className="stylus-evidence-note">{note ?? 'Products via Farfetch search; prices and stock change. Not tracker evidence.'}</p>
  </section>;
}
