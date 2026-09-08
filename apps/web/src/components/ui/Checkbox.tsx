import React, { forwardRef, useEffect, useRef } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked = false,
      indeterminate = false,
      onCheckedChange,
      disabled = false,
      className,
      label,
      description,
      id,
      ...props
    },
    forwardedRef,
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const resolvedRef = (forwardedRef || internalRef) as React.RefObject<HTMLInputElement>;
    const inputId = id || (label ? `cb-${Math.random().toString(36).substring(2, 9)}` : undefined);

    useEffect(() => {
      if (resolvedRef.current) {
        resolvedRef.current.indeterminate = Boolean(indeterminate && !checked);
      }
    }, [indeterminate, checked, resolvedRef]);

    const isChecked = Boolean(checked);
    const isIndeterminate = Boolean(indeterminate && !checked);

    const checkboxBox = (
      <div
        className={cn(
          "relative flex items-center justify-center w-4 h-4 rounded border transition-colors shrink-0 cursor-pointer select-none",
          isChecked || isIndeterminate
            ? "bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500"
            : "border-neutral-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 hover:border-neutral-400 dark:hover:border-zinc-500",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none bg-neutral-100 dark:bg-zinc-800",
          "focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-1 dark:focus-within:ring-offset-zinc-900",
          className,
        )}
      >
        <input
          ref={resolvedRef}
          type="checkbox"
          id={inputId}
          checked={isChecked}
          disabled={disabled}
          aria-checked={isIndeterminate ? "mixed" : isChecked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed w-full h-full m-0 p-0 z-10"
          {...props}
        />
        {isIndeterminate ? (
          <Minus size={12} strokeWidth={3} className="text-white animate-in zoom-in-50 duration-100" />
        ) : isChecked ? (
          <Check size={12} strokeWidth={3} className="text-white animate-in zoom-in-50 duration-100" />
        ) : null}
      </div>
    );

    if (!label) {
      return checkboxBox;
    }

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex items-start gap-2.5 cursor-pointer text-body-sm select-none",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <div className="pt-0.5">{checkboxBox}</div>
        <div className="flex flex-col">
          <span className="font-medium text-neutral-800 dark:text-zinc-200">{label}</span>
          {description && (
            <span className="text-caption text-neutral-500 dark:text-zinc-400">{description}</span>
          )}
        </div>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
