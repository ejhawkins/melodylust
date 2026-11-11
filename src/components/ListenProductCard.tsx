import { LikeButton } from "@/components/LikeButton";
import { useEffect, useState } from "react";
import { Check, ChevronRight, Heart, Plus, ShoppingBag, X } from "lucide-react";
import amber from "@/assets/shades-amber.webp";
import black from "@/assets/shades-black.webp";
import tortoise from "@/assets/shades-tortoise.webp";
import { Button } from "@/components/ui/button";
import { findWish } from "@/lib/listening-room";
import { cn } from "@/lib/utils";
import { addWish, removeWish, useWishlist } from "@/lib/wishlist";

export type FeaturedProduct = {
  id: string;
  kicker: string;
  name: string;
  collection: string;
  price: string;
  sizes: readonly string[];
  /** One photo per colour; swatch is a Tailwind colour class backed by a token in src/styles.css. */
  colors: readonly { name: string; image: string; alt: string; swatch: string }[];
};

/** The Shield Aviator, the product the gilded-verdant-harmony home page features. Its photos are real files here, so they
 *  load on any host (the originals are Lovable-hosted assets that only resolve on Lovable). */
export const shieldAviator: FeaturedProduct = {
  id: "shield-aviator",
  kicker: "Fashion month edit",
  name: "Shield Aviator",
  collection: "The Shades Edit",
  price: "$420",
  sizes: ["S", "M", "L"],
  colors: [
    { name: "Tortoise", image: tortoise, alt: "Tortoise shield sunglasses", swatch: "bg-product-tortoise" },
    { name: "Amber", image: amber, alt: "Amber shield sunglasses", swatch: "bg-product-amber" },
    { name: "Black", image: black, alt: "Black shield sunglasses", swatch: "bg-product-black" },
  ],
};

const shades = [shieldAviator.colors[0]!, shieldAviator.colors[1]!, shieldAviator.colors[2]!];
const rotate = (n: number) => [shades[n % 3]!, shades[(n + 1) % 3]!, shades[(n + 2) % 3]!];
const piece = (n: number, id: string, name: string, price: string, sizes: readonly string[] = ["S", "M", "L"]): FeaturedProduct =>
  ({ id, kicker: "Fashion month edit", name, collection: "The Shades Edit", price, sizes, colors: rotate(n) });

/** Up to ten pieces shown during one listening session, one at a time. Placeholder line-up until the real catalogue is wired in. */
export const sessionProducts: readonly FeaturedProduct[] = [
  shieldAviator,
  piece(1, "visor-wrap", "Visor Wrap", "$385"),
  piece(2, "cat-eye-shield", "Cat-Eye Shield", "$410"),
  piece(0, "runway-mask", "Runway Mask", "$460"),
  piece(1, "oval-noir", "Oval Noir", "$340"),
  piece(2, "pilot-gilt", "Pilot Gilt", "$395"),
  piece(0, "square-frame", "Square Frame", "$360"),
  piece(1, "butterfly-lens", "Butterfly Lens", "$430"),
  piece(2, "rimless-sport", "Rimless Sport", "$375"),
  piece(0, "encore-shield", "Encore Shield", "$450"),
];
export const MAX_SESSION_PRODUCTS = 10;

const REMINDER_AFTER_MS = 60 * 60 * 1000; // an hour

/** A featured-product card, the gilded-verdant-harmony hero card brought into the listening room (shown over its hero on
 *  phones). It appears five seconds after mobile song playback is requested; a swatch swaps the photo, S / M / L picks a size, Add to cart
 *  toggles and Wishlist saves the piece to the Want List. Closing it keeps it away for an hour behind a gold bag button; after
 *  that it comes back on its own as a reminder. The hidden time is stored per product, so each card keeps its own. */
export function ListenProductCard({ active, products = sessionProducts, songKey }: { active: boolean; products?: readonly FeaturedProduct[]; songKey?: string }) {
  const lineup = products.slice(0, MAX_SESSION_PRODUCTS);
  const [index, setIndex] = useState(0);
  const product = lineup[Math.min(index, lineup.length - 1)] ?? shieldAviator;
  const hiddenKey = `ml-hero-card-hidden-at:shop`;
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(true);
  const [reminder, setReminder] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState(product.sizes[1] ?? product.sizes[0] ?? "");
  const [added, setAdded] = useState(false);
  const items = useWishlist();
  const saved = findWish(items, "piece", product.name, product.collection);
  const color = product.colors[colorIndex] ?? product.colors[0];

  // One piece at a time: a new song (after the first) brings the next one, until all of this session's pieces have shown.
  const [lastSong, setLastSong] = useState(songKey);
  if (songKey !== lastSong) {
    setLastSong(songKey);
    if (revealed) setIndex(i => Math.min(i + 1, lineup.length - 1));
  }
  useEffect(() => { setColorIndex(0); setSize(product.sizes[1] ?? product.sizes[0] ?? ""); setAdded(false); }, [product]);

  useEffect(() => {
    setRevealed(false);
    if (!active) return;
    const timer = window.setTimeout(() => setRevealed(true), 5000);
    return () => window.clearTimeout(timer);
  }, [active]);

  // Hidden less than an hour ago: stay hidden. Longer ago: come back as a reminder.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(hiddenKey);
      if (!raw) return;
      const hiddenAt = Number(raw);
      if (Number.isFinite(hiddenAt) && Date.now() - hiddenAt < REMINDER_AFTER_MS) setOpen(false);
      else { window.localStorage.removeItem(hiddenKey); setReminder(true); }
    } catch { /* storage unavailable: the card shows as usual */ }
  }, [hiddenKey]);

  const hide = () => {
    setOpen(false);
    try { window.localStorage.setItem(hiddenKey, String(Date.now())); } catch { /* ignore */ }
  };
  const show = () => {
    setOpen(true);
    setReminder(false);
    try { window.localStorage.removeItem(hiddenKey); } catch { /* ignore */ }
  };
  const toggleWish = () => {
    if (saved) { removeWish(saved.id); return; }
    if (color) addWish({ kind: "piece", name: product.name, detail: product.price, link: "", note: `${color.name} · Size ${size}`, from: product.collection, image: color.image });
  };

  if (!active || !revealed || !color) return null;

  if (!open) {
    return (
      <Button variant="productBag" size="roundMd" className="ls-product-bag" aria-label="Show featured product" title="Show featured product" onClick={show}>
        <ShoppingBag aria-hidden="true" />
      </Button>
    );
  }

  return (
    <aside className="ls-product" aria-label="Featured product">
      <Button variant="productRound" size="roundSm" className="ls-product-close" aria-label="Hide featured product" title="Hide featured product" onClick={hide}>
        <X aria-hidden="true" />
      </Button>
      <div className="ls-product-card">
        {/* The photo, with nothing over it */}
        <div className="ls-product-photo">
          <img key={color.name} src={color.image} alt={color.alt} width={1000} height={1334} />
        </div>

        {/* The plate below: what it is, the choices and the actions */}
        <div className="ls-product-plate">
          <div className="ls-product-head">
            <div className="min-w-0">
              <p className="ls-product-kicker">{reminder ? `Reminder · ${product.kicker}` : product.kicker}</p>
              <h2 className="ls-product-name">{product.name}</h2>
              <p className="ls-product-meta">{product.collection} · {color.name}</p>
            </div>
            <span className="ls-product-price">{product.price}</span>
            <LikeButton look="quick" kind="fashion" id={`product-${product.name}`} name={product.name} sub={product.price} image={color.image} />
          </div>

          <div className="ls-product-pick">
            <div className="ls-product-group" role="group" aria-label="Choose color">
              {product.colors.map((option, index) => (
                <Button key={option.name} variant="productSwatch" size="dot" aria-label={option.name} aria-pressed={colorIndex === index}
                  onClick={() => { setColorIndex(index); setAdded(false); }}>
                  <span className={cn("block size-full rounded-full", option.swatch)} aria-hidden="true" />
                </Button>
              ))}
            </div>
            <div className="ls-product-group" role="group" aria-label="Choose size">
              {product.sizes.map(option => (
                <Button key={option} variant="productSize" size="dot" aria-label={`Size ${option}`} aria-pressed={size === option} onClick={() => setSize(option)}>{option}</Button>
              ))}
            </div>
          </div>

          <div className="ls-product-actions">
            <Button variant="productSolid" size="pill" onClick={() => setAdded(value => !value)}>
              {added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
              {added ? "Added" : "Add to cart"}
            </Button>
            <Button variant="productWish" size="pill" aria-pressed={Boolean(saved)} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} onClick={toggleWish}>
              <Heart aria-hidden="true" className={cn(saved && "fill-current")} />
              {saved ? "Wishlisted" : "Wishlist"}
            </Button>
          </div>
          {lineup.length > 1 && (
            <div className="ls-product-step">
              <span aria-live="polite">{index + 1} / {lineup.length}</span>
              {index < lineup.length - 1 && (
                <Button variant="productWish" size="pill" onClick={() => setIndex(i => i + 1)}>Next piece <ChevronRight aria-hidden="true" /></Button>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
