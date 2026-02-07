/**
 * Dashboard Home Page
 *
 * Executive cockpit with KPI stats, agent hierarchy tree, and market intel.
 */

import { useEffect, useState, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/index.js";
import { PageTransition } from "@/components/page-transition.js";
import { Button } from "@/components/ui/button.js";
import { Card } from "@/components/ui/card.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { Input } from "@/components/ui/input.js";
import { Textarea } from "@/components/ui/textarea.js";
import { Select } from "@/components/ui/select.js";
import { AgentTree } from "@/components/agent-tree.js";
import { useAgents } from "@/hooks/use-agents.js";
import { useAgentToggles } from "@/hooks/use-agent-toggles.js";
import { useToastContext } from "@/contexts/toast-context.js";
import {
  IconActivity,
  IconAgents,
  IconHistory,
  IconRefresh,
  IconSearch,
  IconZap,
} from "@/components/icons/index.js";
import { apiClient, type ExecutionMapSummary, type KpiSummary, type MarketIntelResponse } from "@/lib/api-client.js";
import type { DashboardContextType } from "@/components/layout/index.js";

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
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

export function DashboardHome() {
  const { onMobileMenuToggle } = useOutletContext<DashboardContextType>();
  const { registry } = useAgents();
  const { isEnabled, setToggle, toggleAll } = useAgentToggles();
  const { success, error: toastError } = useToastContext();

  const [kpis, setKpis] = useState<KpiSummary | null>(null);
  const [executionMap, setExecutionMap] = useState<ExecutionMapSummary | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [intelQuery, setIntelQuery] = useState("");
  const [intelResult, setIntelResult] = useState<MarketIntelResponse | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);

  const [docTitle, setDocTitle] = useState("");
  const [docSource, setDocSource] = useState("");
  const [docCollection, setDocCollection] = useState("market-intel");
  const [docContent, setDocContent] = useState("");
  const [docSubmitting, setDocSubmitting] = useState(false);

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const [kpiData, mapData] = await Promise.all([
        apiClient.getKpis(),
        apiClient.getExecutionMap(),
      ]);
      setKpis(kpiData);
      setExecutionMap(mapData);
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Failed to load insights");
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  // Poll execution map every 10 seconds for real-time status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const mapData = await apiClient.getExecutionMap();
        setExecutionMap(mapData);
      } catch {
        // Silently fail — stale data is fine
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  async function handleIntelSearch() {
    if (!intelQuery.trim()) return;
    setIntelLoading(true);
    setIntelError(null);
    try {
      const result = await apiClient.getMarketIntel({
        query: intelQuery.trim(),
        collections: ["market-intel"],
      });
      setIntelResult(result);
    } catch (err) {
      setIntelError(err instanceof Error ? err.message : "Failed to fetch market intel");
    } finally {
      setIntelLoading(false);
    }
  }

  async function handleIngest() {
    if (!docTitle.trim() || !docSource.trim() || !docContent.trim()) {
      toastError("Missing fields", "Title, source, and content are required.");
      return;
    }

    setDocSubmitting(true);
    try {
      await apiClient.indexKnowledgeDocument({
        title: docTitle.trim(),
        source: docSource.trim(),
        collection: docCollection,
        content: docContent.trim(),
      });
      success("Document indexed", "Knowledge base updated successfully.");
      setDocTitle("");
      setDocSource("");
      setDocContent("");
    } catch (err) {
      toastError(
        "Index failed",
        err instanceof Error ? err.message : "Unable to index document.",
      );
    } finally {
      setDocSubmitting(false);
    }
  }

  const totalAgents = registry
    ? 1 + registry.orchestrators.length + registry.workers.length
    : 0;

  const allAgentIds = registry
    ? [registry.ceo.id, ...registry.orchestrators.map((o) => o.id), ...registry.workers.map((w) => w.id)]
    : [];

  const kpiTotals = kpis?.totals;

  return (
    <PageTransition>
      <Topbar
        title="Executive Cockpit"
        onMobileMenuToggle={onMobileMenuToggle}
        actions={
          <Button variant="ghost" onClick={loadInsights} aria-label="Refresh insights">
            <IconRefresh size={18} />
          </Button>
        }
      />

      <div className="p-6 max-w-[var(--content-max-width)] mx-auto space-y-8">
        {/* KPI Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<IconAgents size={24} />}
            label="Total Agents"
            value={registry ? totalAgents : "—"}
          />
          <StatCard
            icon={<IconActivity size={24} />}
            label="Active Runs"
            value={kpis ? kpiTotals?.running ?? 0 : "—"}
          />
          <StatCard
            icon={<IconHistory size={24} />}
            label="Runs (30d)"
            value={kpis ? kpiTotals?.runsTotal ?? 0 : "—"}
          />
          <StatCard
            icon={<IconZap size={24} />}
            label="Success Rate"
            value={kpis ? `${kpis.successRate}%` : "—"}
          />
        </section>

        {insightsError && (
          <div className="p-4 bg-[var(--error-light)] border border-[var(--error)]/20 rounded-lg">
            <p className="text-[var(--error)]">{insightsError}</p>
          </div>
        )}

        {/* Agent Hierarchy Tree */}
        <section>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">Agent Hierarchy</h2>
                <p className="text-sm text-[var(--muted)]">
                  Real-time org chart — toggle agents on/off with one click.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAll(true, allAgentIds)}
                >
                  All On
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAll(false, allAgentIds)}
                >
                  All Off
                </Button>
                <Link to="/dashboard/agents">
                  <Button variant="secondary" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </div>

            {insightsLoading && !executionMap ? (
              <p className="text-[var(--muted)] py-8 text-center">Loading agent hierarchy...</p>
            ) : registry ? (
              <AgentTree
                ceo={registry.ceo}
                orchestrators={registry.orchestrators}
                workers={registry.workers}
                executionNodes={executionMap?.nodes ?? []}
                isEnabled={isEnabled}
                onToggle={setToggle}
              />
            ) : (
              <EmptyState
                icon={<IconAgents size={48} />}
                title="No agents loaded"
                description="Unable to load agent registry."
                action={<Button size="sm" onClick={loadInsights}>Retry</Button>}
              />
            )}
          </Card>
        </section>

        {/* Market Intel + Knowledge Ingest */}
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink)]">Market Intel</h2>
              <p className="text-sm text-[var(--muted)]">
                Query your market intelligence knowledge base.
              </p>
            </div>
            <div className="flex gap-3">
              <Input
                value={intelQuery}
                onChange={(event) => setIntelQuery(event.target.value)}
                placeholder="Ask about competitors, pricing, or trends..."
              />
              <Button onClick={handleIntelSearch} disabled={intelLoading}>
                <IconSearch size={16} className="mr-2" />
                Search
              </Button>
            </div>
            {intelLoading && <p className="text-[var(--muted)]">Searching...</p>}
            {intelError && <p className="text-[var(--error)] text-sm">{intelError}</p>}
            {intelResult && (
              <div className="space-y-4">
                <div className="text-sm text-[var(--muted-strong)] whitespace-pre-wrap">
                  {intelResult.summary}
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">
                    Sources
                  </p>
                  <ul className="space-y-2 text-sm">
                    {intelResult.sources.map((source) => (
                      <li key={source.chunkId} className="text-[var(--muted-strong)]">
                        {source.title} — {source.source}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink)]">Knowledge Ingest</h2>
              <p className="text-sm text-[var(--muted)]">
                Add new intel or operational docs to the knowledge base.
              </p>
            </div>
            <div className="space-y-3">
              <Input
                value={docTitle}
                onChange={(event) => setDocTitle(event.target.value)}
                placeholder="Document title"
              />
              <Input
                value={docSource}
                onChange={(event) => setDocSource(event.target.value)}
                placeholder="Source (URL, file name, or note)"
              />
              <Select value={docCollection} onChange={(event) => setDocCollection(event.target.value)}>
                <option value="market-intel">market-intel</option>
                <option value="architecture">architecture</option>
                <option value="policies">policies</option>
                <option value="operations">operations</option>
                <option value="guides">guides</option>
              </Select>
              <Textarea
                value={docContent}
                onChange={(event) => setDocContent(event.target.value)}
                placeholder="Paste the document content here..."
                rows={6}
              />
              <Button onClick={handleIngest} disabled={docSubmitting}>
                {docSubmitting ? "Indexing..." : "Index Document"}
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </PageTransition>
  );
}
