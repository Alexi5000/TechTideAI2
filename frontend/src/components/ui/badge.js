import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function Badge({ className, ...props }) {
    return (_jsx("span", { className: cn("inline-flex items-center rounded-full border border-[var(--stroke)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]", className), ...props }));
}
