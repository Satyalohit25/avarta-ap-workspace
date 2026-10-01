import { SelectHTMLAttributes, forwardRef } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "size"
> {
  label?: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
  containerClassName?: string;
  size?: "sm" | "md";
  onValueChange?: (value: string) => void;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      value,
      onValueChange,
      onChange,
      disabled,
      className,
      containerClassName,
      size = "md",
      id,
      name,
      placeholder,
      ...props
    },
    _ref,
  ) => {
    const fallbackId = (label ? label.toLowerCase().replace(/[^a-z0-9]/g, "-") : undefined)
      ?? (placeholder ? placeholder.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30) : undefined)
      ?? (name ? name.toLowerCase().replace(/[^a-z0-9]/g, "-") : "select-field");
    const selectId = id ?? name ?? fallbackId;
    const selectName = name ?? selectId;

    function handleChange(val: string) {
      onValueChange?.(val);
      if (onChange) {
        onChange({ target: { value: val, name: selectName } });
      }
    }

    const isCompact = size === "sm";

    return (
      <div className={cn(label || error ? "space-y-1.5" : "", containerClassName ?? "w-full")}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-label text-neutral-700 dark:text-zinc-300 font-medium"
          >
            {label}
          </label>
        )}
        <SelectPrimitive.Root
          name={name ?? selectId}
          value={value ? String(value) : undefined}
          onValueChange={handleChange}
          disabled={disabled}
        >
          <SelectPrimitive.Trigger
            id={selectId}
            aria-label={props["aria-label"] ?? label ?? name ?? placeholder ?? "Select option"}
            className={cn(
              "flex w-full items-center justify-between rounded-md border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 shadow-2xs transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
              isCompact ? "h-8 px-2.5 py-1 text-micro font-mono" : "h-9 px-3 py-2 text-body-sm",
              error
                ? "border-error-500 dark:border-error-500 focus-visible:ring-error-500/50"
                : "focus-visible:border-neutral-400 dark:focus-visible:border-zinc-500",
              className,
            )}
          >
            <SelectPrimitive.Value
              placeholder={placeholder ?? "Select an option..."}
            />
            <SelectPrimitive.Icon>
              <ChevronDown
                size={isCompact ? 13 : 16}
                strokeWidth={1.75}
                className="text-neutral-400 dark:text-zinc-500 shrink-0 ml-1.5"
              />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={4}
              className="z-50 min-w-[var(--radix-select-trigger-width)] max-h-60 overflow-y-auto rounded-md border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 shadow-xl animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1"
            >
              <SelectPrimitive.Viewport className="p-1">
                {options.map((opt) => (
                  <SelectPrimitive.Item
                    key={opt.value}
                    value={opt.value}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm text-neutral-900 dark:text-zinc-100 outline-none hover:bg-neutral-100 dark:hover:bg-zinc-800 focus:bg-neutral-100 dark:focus:bg-zinc-800 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors",
                      isCompact ? "py-1 pl-6 pr-2 text-micro font-mono" : "py-1.5 pl-8 pr-2 text-body-sm",
                    )}
                  >
                    <span className={cn("absolute flex items-center justify-center", isCompact ? "left-1.5 h-3 w-3" : "left-2 h-3.5 w-3.5")}>
                      <SelectPrimitive.ItemIndicator>
                        <Check
                          size={isCompact ? 12 : 14}
                          strokeWidth={2}
                          className="text-indigo-600 dark:text-indigo-400"
                        />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>
                      {opt.label}
                    </SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
        {error && (
          <p className="text-caption text-error-700 dark:text-error-400 font-medium">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
