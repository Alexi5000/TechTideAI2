/**
 * Stat Card
 *
 * Single KPI metric display card with icon, label, and value.
 */

import { Card } from "@/components/ui/card.js";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

export function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--muted)] mb-1">{label}</p>
          <p className="text-3xl font-semibold text-[var(--ink)]">{value}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
          {icon}
        </div>
      </div>
    </Card>
  );
}
