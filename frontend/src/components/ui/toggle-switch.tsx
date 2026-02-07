/**
 * Toggle Switch Component
 *
 * Matrix-themed pill-shaped on/off switch with green glow.
 */

import * as React from "react";
import { cn } from "@/lib/utils.js";

export interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
}

export const ToggleSwitch = React.forwardRef<HTMLButtonElement, ToggleSwitchProps>(
  ({ checked, onCheckedChange, disabled = false, size = "sm", label }, ref) => {
    const isSmall = size === "sm";

    return (
      <button
        ref={ref}
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          "disabled:cursor-not-allowed disabled:opacity-40",
          isSmall ? "h-5 w-9" : "h-6 w-11",
          checked
            ? "bg-[var(--accent)] shadow-[0_0_10px_rgba(0,255,65,0.5)]"
            : "bg-neutral-700",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block rounded-full bg-white shadow-sm transition-transform",
            isSmall ? "h-4 w-4" : "h-5 w-5",
            checked
              ? isSmall ? "translate-x-4" : "translate-x-5"
              : "translate-x-0",
          )}
        />
      </button>
    );
  },
);

ToggleSwitch.displayName = "ToggleSwitch";
