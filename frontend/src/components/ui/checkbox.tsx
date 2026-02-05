/**
 * Checkbox Component
 *
 * Accessible checkbox with custom styling.
 *
 * @example
 * // Basic usage
 * <Checkbox id="terms" />
 *
 * // With label
 * <Checkbox id="terms" label="Accept terms and conditions" />
 *
 * // Controlled
 * <Checkbox checked={checked} onCheckedChange={setChecked} />
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils.js";
import { IconCheck } from "@/components/icons/index.js";

const checkboxVariants = cva(
  [
    "peer relative h-5 w-5 shrink-0 rounded-[var(--radius-sm)] border-2",
    "transition-all duration-[var(--duration-fast)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border-[var(--stroke)] bg-transparent",
          "data-[state=checked]:bg-[var(--accent)] data-[state=checked]:border-[var(--accent)]",
          "hover:border-[var(--muted)]",
        ].join(" "),
        error: [
          "border-[var(--error)] bg-transparent",
          "data-[state=checked]:bg-[var(--error)] data-[state=checked]:border-[var(--error)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange">,
    VariantProps<typeof checkboxVariants> {
  /** Label text */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Controlled checked state */
  checked?: boolean;
  /** Callback when checked state changes */
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      variant,
      label,
      description,
      checked: controlledChecked,
      onCheckedChange,
      disabled,
      id,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(false);
    const generatedId = React.useId();
    const checkboxId = id ?? generatedId;

    const isControlled = controlledChecked !== undefined;
    const checked = isControlled ? controlledChecked : uncontrolledChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = e.target.checked;
      if (!isControlled) {
        setUncontrolledChecked(newChecked);
      }
      onCheckedChange?.(newChecked);
    };

    return (
      <div className={cn("flex items-start gap-3", className)}>
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            className="sr-only"
            {...props}
          />
          <div
            data-state={checked ? "checked" : "unchecked"}
            className={cn(checkboxVariants({ variant }))}
            onClick={() => {
              if (!disabled) {
                const newChecked = !checked;
                if (!isControlled) {
                  setUncontrolledChecked(newChecked);
                }
                onCheckedChange?.(newChecked);
              }
            }}
            role="checkbox"
            aria-checked={checked}
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                if (!disabled) {
                  const newChecked = !checked;
                  if (!isControlled) {
                    setUncontrolledChecked(newChecked);
                  }
                  onCheckedChange?.(newChecked);
                }
              }
            }}
          >
            {checked && (
              <IconCheck
                size={14}
                className="absolute inset-0 m-auto text-white"
                strokeWidth={3}
              />
            )}
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  "text-sm font-medium text-[var(--ink)] cursor-pointer select-none",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-xs text-[var(--muted)]">{description}</span>
            )}
          </div>
        )}
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";
