import { ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap gap-2 transition-all duration-fast disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:focus-visible:ring-zinc-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-zinc-900 shrink-0 rounded-md",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/80 font-semibold",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-2xs font-medium",
        outline:
          "border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-700 dark:text-zinc-200 shadow-2xs hover:bg-neutral-50 dark:hover:bg-zinc-800 font-medium",
        ghost:
          "text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 hover:text-neutral-900 dark:hover:text-zinc-100 font-medium",
        destructive:
          "border border-rose-300 dark:border-rose-800/80 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:border-rose-400 dark:hover:border-rose-600 shadow-2xs font-semibold",
        icon: "h-9 w-9 p-0 inline-flex items-center justify-center text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-md",
      },
      size: {
        sm: "h-8 px-4 text-caption font-medium rounded-md min-w-[64px]",
        md: "h-10 px-5 text-body-sm font-semibold rounded-md min-w-[88px]",
        lg: "h-11 px-6 text-body font-semibold rounded-lg min-w-[108px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      className,
      children,
      disabled,
      isLoading = false,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? "true" : undefined}
        className={cn(
          buttonVariants({
            variant,
            size: variant === "icon" ? undefined : size,
            className,
          }),
        )}
        {...props}
      >
        {isLoading && (
          <Loader2
            className="animate-spin shrink-0 -ml-0.5 mr-1.5"
            size={size === "sm" ? 12 : size === "lg" ? 18 : 15}
          />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
