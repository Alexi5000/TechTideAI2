import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function Card({ className, ...props }) {
    return (_jsx("div", { className: cn("rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]", className), ...props }));
}
