import { jsx as _jsx } from "react/jsx-runtime";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva("inline-flex items-center justify-center rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-60", {
    variants: {
        variant: {
            primary: "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_10px_30px_rgba(247,90,53,0.35)] hover:translate-y-[-1px]",
            secondary: "bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--stroke)] hover:bg-white",
            ghost: "bg-transparent text-[var(--ink)] hover:bg-[var(--surface-2)]",
        },
        size: {
            sm: "h-9 px-4",
            md: "h-11 px-6",
            lg: "h-12 px-7 text-base",
        },
    },
    defaultVariants: {
        variant: "primary",
        size: "md",
    },
});
export function Button({ className, variant, size, ...props }) {
    const { type, ...rest } = props;
    return (_jsx("button", { type: type ?? "button", className: cn(buttonVariants({ variant, size, className })), ...rest }));
}
