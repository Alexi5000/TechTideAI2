import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function SectionHeader({ eyebrow, title, description, className, ...props }) {
    return (_jsxs("div", { className: cn("max-w-2xl space-y-3", className), ...props, children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]", children: eyebrow }), _jsx("h2", { className: "font-display text-3xl sm:text-4xl text-[var(--ink)]", children: title }), _jsx("p", { className: "text-base text-[var(--muted-strong)] leading-relaxed", children: description })] }));
}
