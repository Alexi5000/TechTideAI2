/**
 * Radio Group Component
 *
 * Radio button group for exclusive selection.
 *
 * @example
 * <RadioGroup value={value} onValueChange={setValue}>
 *   <RadioGroupItem value="option1" label="Option 1" />
 *   <RadioGroupItem value="option2" label="Option 2" />
 *   <RadioGroupItem value="option3" label="Option 3" />
 * </RadioGroup>
 */

import * as React from "react";
import { cn } from "@/lib/utils.js";

// ============================================================================
// Context
// ============================================================================

interface RadioGroupContextValue {
  value: string | undefined;
  onValueChange: (value: string) => void;
  name: string;
  disabled: boolean | undefined;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

function useRadioGroupContext() {
  const context = React.useContext(RadioGroupContext);
  if (!context) {
    throw new Error("RadioGroupItem must be used within a RadioGroup");
  }
  return context;
}

// ============================================================================
// Radio Group
// ============================================================================

export interface RadioGroupProps {
  /** Current selected value */
  value?: string;
  /** Default value for uncontrolled usage */
  defaultValue?: string;
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
  /** Name attribute for form submission */
  name?: string;
  /** Disable all radio items */
  disabled?: boolean;
  /** Orientation of the group */
  orientation?: "horizontal" | "vertical";
  /** Additional class name */
  className?: string;
  children: React.ReactNode;
}

export function RadioGroup({
  value: controlledValue,
  defaultValue,
  onValueChange: controlledOnValueChange,
  name,
  disabled,
  orientation = "vertical",
  className,
  children,
}: RadioGroupProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const generatedName = React.useId();
  const groupName = name ?? generatedName;

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const onValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(newValue);
      }
      controlledOnValueChange?.(newValue);
    },
    [isControlled, controlledOnValueChange],
  );

  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name: groupName, disabled }}>
      <div
        role="radiogroup"
        aria-orientation={orientation}
        className={cn(
          orientation === "vertical" ? "flex flex-col gap-3" : "flex flex-row gap-4",
          className,
        )}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

// ============================================================================
// Radio Group Item
// ============================================================================

export interface RadioGroupItemProps {
  /** Value of this radio item */
  value: string;
  /** Label text */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Disable this item */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

export function RadioGroupItem({
  value,
  label,
  description,
  disabled: itemDisabled,
  className,
}: RadioGroupItemProps) {
  const { value: selectedValue, onValueChange, name, disabled: groupDisabled } = useRadioGroupContext();
  const id = React.useId();
  const isChecked = selectedValue === value;
  const isDisabled = itemDisabled || groupDisabled;

  const handleChange = () => {
    if (!isDisabled) {
      onValueChange(value);
    }
  };

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="relative flex items-center justify-center">
        <input
          type="radio"
          id={id}
          name={name}
          value={value}
          checked={isChecked}
          onChange={handleChange}
          disabled={isDisabled}
          className="sr-only"
        />
        <div
          data-state={isChecked ? "checked" : "unchecked"}
          className={cn(
            "relative h-5 w-5 rounded-full border-2 transition-all duration-[var(--duration-fast)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
            isDisabled && "cursor-not-allowed opacity-50",
            !isDisabled && "cursor-pointer hover:border-[var(--muted)]",
            isChecked
              ? "border-[var(--accent)] bg-[var(--accent)]"
              : "border-[var(--stroke)] bg-transparent",
          )}
          onClick={handleChange}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              handleChange();
            }
          }}
          role="radio"
          aria-checked={isChecked}
          aria-disabled={isDisabled}
          tabIndex={isDisabled ? -1 : 0}
        >
          {isChecked && (
            <div className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-white" />
          )}
        </div>
      </div>
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <label
              htmlFor={id}
              className={cn(
                "text-sm font-medium text-[var(--ink)] cursor-pointer select-none",
                isDisabled && "cursor-not-allowed opacity-50",
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
}
