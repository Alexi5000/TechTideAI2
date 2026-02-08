/**
 * KPI Stats Section
 *
 * Displays the 4 executive KPI stat cards and an error banner if insights fail.
 */

import type { KpiSummary } from "@/lib/api-client.js";
import {
  IconActivity,
  IconAgents,
  IconHistory,
  IconZap,
} from "@/components/icons/index.js";
import { StatCard } from "./stat-card.js";

interface KpiStatsSectionProps {
  totalAgents: number | null;
  kpis: KpiSummary | null;
  error: string | null;
}

export function KpiStatsSection({ totalAgents, kpis, error }: KpiStatsSectionProps) {
  const kpiTotals = kpis?.totals;

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<IconAgents size={24} />}
          label="Total Agents"
          value={totalAgents != null ? totalAgents : "\u2014"}
        />
        <StatCard
          icon={<IconActivity size={24} />}
          label="Active Runs"
          value={kpis ? kpiTotals?.running ?? 0 : "\u2014"}
        />
        <StatCard
          icon={<IconHistory size={24} />}
          label="Runs (30d)"
          value={kpis ? kpiTotals?.runsTotal ?? 0 : "\u2014"}
        />
        <StatCard
          icon={<IconZap size={24} />}
          label="Success Rate"
          value={kpis ? `${kpis.successRate}%` : "\u2014"}
        />
      </section>

      {error && (
        <div className="p-4 bg-[var(--error-light)] border border-[var(--error)]/20 rounded-lg">
          <p className="text-[var(--error)]">{error}</p>
        </div>
      )}
    </>
  );
}
