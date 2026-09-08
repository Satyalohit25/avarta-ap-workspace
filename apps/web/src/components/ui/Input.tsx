import { InputHTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="block text-label text-neutral-700 dark:text-zinc-300 font-medium">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && <div className="absolute left-3 text-neutral-400 dark:text-zinc-500 pointer-events-none">{leftIcon}</div>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "flex h-9 w-full rounded-md border border-neutral-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1 text-body-sm text-neutral-900 dark:text-zinc-100 shadow-2xs transition-all placeholder:text-neutral-400 dark:placeholder:text-zinc-500 hover:border-neutral-300 dark:hover:border-zinc-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              error
                ? "border-error-500 dark:border-error-500 focus-visible:ring-error-500/50"
                : "focus-visible:border-neutral-400 dark:focus-visible:border-zinc-600",
              className
            )}
            {...props}
          />
          {rightIcon && <div className="absolute right-3 text-neutral-400 dark:text-zinc-500 flex items-center">{rightIcon}</div>}
        </div>
        {error ? (
          <p className="text-caption text-error-700 dark:text-error-400 font-medium">{error}</p>
        ) : helpText ? (
          <p className="text-caption text-neutral-500 dark:text-zinc-400">{helpText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
