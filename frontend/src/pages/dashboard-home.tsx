/**
 * Dashboard Home Page
 *
 * Executive cockpit — composes KPI stats, agent hierarchy,
 * market intel search, and knowledge ingestion sections.
 */

import { useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/index.js";
import { PageTransition } from "@/components/page-transition.js";
import { Button } from "@/components/ui/button.js";
import { IconRefresh } from "@/components/icons/index.js";
import { KpiStatsSection } from "@/components/dashboard/kpi-stats-section.js";
import { AgentHierarchySection } from "@/components/dashboard/agent-hierarchy-section.js";
import { MarketIntelSection } from "@/components/dashboard/market-intel-section.js";
import { KnowledgeIngestSection } from "@/components/dashboard/knowledge-ingest-section.js";
import { useAgents } from "@/hooks/use-agents.js";
import { useInsights } from "@/hooks/use-insights.js";
import type { DashboardContextType } from "@/components/layout/index.js";

export function DashboardHome() {
  const { onMobileMenuToggle } = useOutletContext<DashboardContextType>();
  const { registry } = useAgents();
  const { kpis, executionMap, loading, error, refresh } = useInsights();

  const totalAgents = registry
    ? 1 + registry.orchestrators.length + registry.workers.length
    : null;

  return (
    <PageTransition>
      <Topbar
        title="Executive Cockpit"
        onMobileMenuToggle={onMobileMenuToggle}
        actions={
          <Button variant="ghost" onClick={refresh} aria-label="Refresh insights">
            <IconRefresh size={18} />
          </Button>
        }
      />

      <div className="p-6 max-w-[var(--content-max-width)] mx-auto space-y-8">
        <KpiStatsSection totalAgents={totalAgents} kpis={kpis} error={error} />

        <AgentHierarchySection
          registry={registry}
          executionMap={executionMap}
          loading={loading}
          onRetry={refresh}
        />

        <section className="grid gap-6 lg:grid-cols-2">
          <MarketIntelSection />
          <KnowledgeIngestSection />
        </section>
      </div>
    </PageTransition>
  );
}
