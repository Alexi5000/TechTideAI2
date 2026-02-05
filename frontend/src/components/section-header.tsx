import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow: string;
  title: string;
  description: string;
}

export function SectionHeader({ eyebrow, title, description, className, ...props }: SectionHeaderProps) {
  return (
    <div className={cn("max-w-2xl space-y-3", className)} {...props}>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
        {eyebrow}
      </p>
      <h2 className="font-display text-3xl sm:text-4xl text-[var(--ink)]">{title}</h2>
      <p className="text-base text-[var(--muted-strong)] leading-relaxed">{description}</p>
    </div>
  );
}
