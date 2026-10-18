import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        profileChoice: "rounded-none border border-input bg-background text-foreground h-auto min-h-10 whitespace-normal text-left hover:bg-accent aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary",
        stylus: "rounded-none bg-stylus-ink text-stylus-paper hover:bg-stylus-accent hover:text-stylus-ink",
        stylusTool: "rounded-none bg-transparent text-stylus-paper hover:bg-stylus-paper/10 border border-stylus-paper/30",
        coverNav: "rounded-none bg-transparent text-foreground hover:text-foreground/70 uppercase text-[11px] font-normal",
        editorial: "rounded-none bg-transparent text-foreground hover:text-editorial-accent p-0 h-auto font-normal",
        coverLink: "rounded-none bg-transparent text-foreground hover:text-foreground/70 font-editorial uppercase text-2xl font-normal p-0 h-auto tracking-[-0.02em]",
        coverStart: "rounded-none bg-transparent text-foreground hover:text-foreground/70 font-editorial uppercase text-2xl font-normal p-0 h-auto tracking-[-0.02em]",
        category: "rounded-none bg-transparent text-muted-foreground hover:text-foreground text-[11px] uppercase h-auto p-0 data-[active=true]:text-foreground data-[active=true]:underline underline-offset-4",
        railCta: "rounded-full bg-primary text-primary-foreground hover:bg-primary/90 uppercase text-[9.5px] font-normal tracking-[0.14em] h-7 px-3.5 whitespace-nowrap",
        stylePill: "rounded-full border border-foreground bg-transparent text-foreground hover:bg-foreground/10 aria-pressed:bg-foreground aria-pressed:text-background uppercase text-[11px] font-normal tracking-[0.14em] h-11 px-5 whitespace-nowrap",
        soundCta: "rounded-full bg-primary text-primary-foreground hover:bg-primary/90 uppercase text-[11px] font-normal tracking-[0.22em] h-11 px-8 mt-2 transition-all hover:-translate-y-0.5",
        dossier: "rounded-none border border-current bg-transparent text-current hover:bg-current/10 uppercase text-[11px] font-normal tracking-[0.14em] h-11 px-5",
        dossierSolid: "rounded-none bg-foreground text-background hover:bg-[#221A20] uppercase text-[11px] font-normal tracking-[0.14em] h-11 px-5",
        dossierTab: "rounded-none bg-transparent text-muted-foreground hover:text-foreground aria-selected:text-foreground border-b-2 border-transparent aria-selected:border-foreground uppercase text-[11px] font-normal tracking-[0.16em] h-auto px-0 py-3",
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
