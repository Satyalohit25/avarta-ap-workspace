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
  "onChange"
> {
  label?: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
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
      id,
      name,
      placeholder,
      ...props
    },
    _ref,
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    function handleChange(val: string) {
      onValueChange?.(val);
      if (onChange) {
        onChange({ target: { value: val, name } });
      }
    }

    return (
      <div className="space-y-1.5 w-full">
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
            aria-label={props["aria-label"] ?? label ?? selectId}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-body-sm text-neutral-900 dark:text-zinc-100 shadow-2xs transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
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
                size={16}
                strokeWidth={1.75}
                className="text-neutral-400 dark:text-zinc-500 shrink-0"
              />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={4}
              className="z-50 min-w-[var(--radix-select-trigger-width)] max-h-60 overflow-y-auto rounded-md border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-neutral-900 dark:text-zinc-100 shadow-lg animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1"
            >
              <SelectPrimitive.Viewport className="p-1">
                {options.map((opt) => (
                  <SelectPrimitive.Item
                    key={opt.value}
                    value={opt.value}
                    className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-body-sm outline-none focus:bg-neutral-100 dark:focus:bg-zinc-800 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <Check
                          size={14}
                          strokeWidth={2}
                          className="text-accent-500"
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
