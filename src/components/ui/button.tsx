import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Every Button is set in Isidora Medium, the cover nav's face. It is the only cut loaded, so variants carry no weight of their
// own (asking for semibold would only fake-bold it). listenRow and listenTile are content cards, so they keep the page's sans.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-isidora text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        profileChoice: "rounded-none border border-input bg-background text-foreground h-auto min-h-10 whitespace-normal text-left hover:bg-accent aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary",
        stylus: "rounded-none bg-stylus-ink text-stylus-paper hover:bg-stylus-accent hover:text-stylus-ink",
        stylusTool: "rounded-none bg-transparent text-stylus-paper hover:bg-stylus-paper/10 border border-stylus-paper/30",
        player: "rounded-none bg-transparent p-0 text-stylus-paper hover:opacity-70 focus-visible:ring-2 focus-visible:ring-stylus-paper",
        playerPlay: "rounded-full border-[1.5px] border-stylus-paper bg-transparent p-0 text-stylus-paper hover:bg-stylus-paper/10 focus-visible:ring-2 focus-visible:ring-stylus-paper focus-visible:ring-offset-4 focus-visible:ring-offset-stylus-ink",
        tunerStation: "rounded-none bg-transparent text-stylus-paper hover:bg-stylus-paper/10 aria-pressed:bg-stylus-paper aria-pressed:text-stylus-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stylus-accent",
        coverNav: "rounded-none bg-transparent text-cover-type hover:text-cover-type/70 uppercase text-[11px]",
        searchGo: "rounded-full border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background shrink-0 mb-3 [&_svg]:size-5",
        // The listening room (/listen): white on the black panels, black on the white feed.
        listenIcon: "rounded-full bg-transparent text-cover-paper/65 hover:text-cover-paper hover:bg-cover-paper/10 aria-pressed:text-cover-paper shrink-0 [&_svg]:size-5",
        listenHome: "rounded-full bg-cover-paper/10 text-cover-paper hover:bg-cover-paper/20 shrink-0 [&_svg]:size-[22px]",
        listenPlay: "rounded-full bg-cover-paper text-cover-type hover:scale-105 transition-transform shrink-0 [&_svg]:size-5 [&_svg]:fill-current",
        listenSearch: "rounded-[2px] border border-cover-paper/16 bg-cover-paper/8 text-cover-paper/65 hover:text-cover-paper hover:border-cover-paper/40 justify-start gap-2.5 text-[15px] min-w-0 [&_svg]:size-5",
        listenFilter: "rounded-[2px] border border-cover-paper/30 bg-transparent text-cover-paper hover:border-cover-paper aria-pressed:bg-cover-paper aria-pressed:text-cover-type aria-pressed:border-cover-paper text-[13px]",
        listenCategory: "rounded-[2px] border border-cover-type/30 bg-transparent text-cover-type hover:border-cover-type aria-pressed:bg-cover-type aria-pressed:text-cover-paper aria-pressed:border-cover-type text-xs uppercase tracking-[0.14em]",
        listenSolid: "rounded-[2px] bg-cover-paper text-cover-type hover:bg-cover-paper/85 text-[13px] tracking-[0.04em]",
        listenOutline: "rounded-[2px] border border-cover-paper/30 bg-transparent text-cover-paper hover:border-cover-paper text-[13px] tracking-[0.04em]",
        // listenSolid's black twin (Now wearing's second and third calls): black, outlined in white, turning white on hover.
        listenBlack: "rounded-[2px] border border-cover-paper bg-cover-type text-cover-paper hover:bg-cover-paper hover:text-cover-type text-[13px] tracking-[0.04em]",
        listenSave: "rounded-[2px] border border-cover-type/30 bg-transparent text-cover-type hover:border-cover-type aria-pressed:bg-cover-type aria-pressed:text-cover-paper aria-pressed:border-cover-type text-[13px] tracking-[0.04em] shrink-0",
        listenInk: "rounded-[2px] bg-cover-type text-cover-paper hover:bg-cover-type/85 text-[13px] tracking-[0.04em]",
        listenRow: "rounded-[2px] bg-transparent text-cover-paper hover:bg-cover-paper/10 data-[active=true]:bg-cover-paper/15 justify-start gap-3 text-left font-sans font-normal whitespace-normal",
        listenTile: "rounded-[2px] bg-transparent text-cover-type hover:bg-cover-type/5 flex-col items-stretch justify-start gap-2 text-left font-sans font-normal whitespace-normal",
        // New playlist, under the library's playlists: a dashed block like the library's empty-shelf notes.
        listenNew: "w-full rounded-[2px] border border-dashed border-cover-paper/30 bg-transparent text-cover-paper/80 hover:border-cover-paper hover:text-cover-paper justify-start gap-2 text-[13px] tracking-[0.04em]",
        // The quick-like heart on a feed tile's photo: a white disc that turns black once the item is in Your Library.
        listenHeart: "rounded-full bg-cover-paper/90 text-cover-type shadow-md backdrop-blur hover:bg-cover-paper aria-pressed:bg-cover-type aria-pressed:text-cover-paper",
        // A small control set on the hero's film, Stop / Watch the show: a plum outline that fills on hover.
        listenCaption: "rounded-full border border-hero-type/70 bg-transparent text-hero-type hover:bg-hero-type hover:text-cover-paper uppercase text-[10px] tracking-[0.14em] gap-1.5 [&_svg]:size-3",
        // The featured-product card (ListenProductCard): paper and ink pills, a gold wishlist and bag.
        productSolid: "rounded-full border border-product-ink bg-product-ink text-product-paper uppercase text-[9px] tracking-[0.12em] shadow-sm hover:bg-product-gold hover:border-product-gold hover:text-product-ink",
        productWish: "rounded-full border border-product-ink/30 bg-transparent text-product-ink uppercase text-[9px] tracking-[0.12em] hover:bg-product-ink/10 aria-pressed:border-product-gold aria-pressed:bg-product-gold/15",
        productSwatch: "rounded-full border border-product-ink/30 bg-transparent hover:bg-product-ink/10 aria-pressed:border-product-ink aria-pressed:ring-1 aria-pressed:ring-product-ink",
        productSize: "rounded-full border border-product-ink/25 bg-transparent text-product-ink text-[8px] hover:bg-product-ink/10 aria-pressed:border-product-ink aria-pressed:bg-product-ink aria-pressed:text-product-paper",
        productRound: "rounded-full border border-product-ink/20 bg-product-paper/95 text-product-ink shadow-md backdrop-blur hover:bg-product-ink/10",
        productBag: "rounded-full border border-product-gold bg-product-paper/90 text-product-gold shadow-lg backdrop-blur hover:bg-product-gold hover:text-product-ink",
        editorial: "rounded-none bg-transparent text-foreground hover:text-editorial-accent p-0 h-auto",
        coverLink: "rounded-none bg-transparent text-cover-type hover:text-cover-type/70 uppercase text-2xl p-0 h-auto tracking-[-0.02em]",
        coverStart: "rounded-none bg-transparent text-cover-type hover:text-cover-type/70 uppercase text-2xl p-0 h-auto tracking-[-0.02em]",
        category: "rounded-none bg-transparent text-muted-foreground hover:text-foreground text-[11px] uppercase h-auto p-0 data-[active=true]:text-foreground data-[active=true]:underline underline-offset-4",
        railCta: "rounded-full bg-primary text-primary-foreground hover:bg-primary/90 uppercase text-[9.5px] tracking-[0.14em] h-7 px-3.5 whitespace-nowrap",
        stylePill: "rounded-full border border-foreground bg-transparent text-foreground hover:bg-foreground/10 aria-pressed:bg-foreground aria-pressed:text-background uppercase text-[11px] tracking-[0.14em] h-11 px-5 whitespace-nowrap",
        soundCta: "rounded-full bg-primary text-primary-foreground hover:bg-primary/90 uppercase text-[11px] tracking-[0.22em] h-11 px-8 mt-2 transition-all hover:-translate-y-0.5",
        dossier: "rounded-none border border-current bg-transparent text-current hover:bg-current/10 uppercase text-[11px] tracking-[0.14em] h-11 px-5",
        dossierSolid: "rounded-none bg-foreground text-background hover:bg-[#221A20] uppercase text-[11px] tracking-[0.14em] h-11 px-5",
        broadsheet: "rounded-[2px] bg-press-cyan text-press-paper hover:bg-press-cyan-600 active:bg-press-cyan-700 text-sm leading-[1.2] h-auto px-[18px] py-2.5 [&_svg]:size-3.5 [&_svg]:fill-current",
        dossierTab: "rounded-none bg-transparent text-muted-foreground hover:text-foreground aria-selected:text-foreground border-b-2 border-transparent aria-selected:border-foreground uppercase text-[11px] tracking-[0.16em] h-auto px-0 py-3",
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        round: "h-11 w-11 p-0",
        roundLg: "h-12 w-12 p-0",
        chip: "h-9 px-3",
        bar: "h-10 px-4",
        cta: "h-11 px-4",
        field: "h-12 px-4",
        block: "h-auto p-2",
        caption: "h-7 px-3",
        dot: "size-6 p-1",
        pill: "h-9 px-3 gap-1.5",
        roundSm: "size-7 p-0",
        roundMd: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
