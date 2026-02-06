/**
 * Dashboard Home Page
 *
 * Executive cockpit with KPI rollups, execution map, and market intel.
 */

import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Topbar } from "@/components/layout/index.js";
import { PageTransition } from "@/components/page-transition.js";
import { Button } from "@/components/ui/button.js";
import { Card } from "@/components/ui/card.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { Input } from "@/components/ui/input.js";
import { Textarea } from "@/components/ui/textarea.js";
import { Select } from "@/components/ui/select.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.js";
import { useAgents } from "@/hooks/use-agents.js";
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
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--muted)] mb-1">{label}</p>
          <p className="text-3xl font-semibold text-[var(--ink)]">{value}</p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export function DashboardHome() {
  const { onMobileMenuToggle } = useOutletContext<DashboardContextType>();
  const { registry } = useAgents();
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

  async function loadInsights() {
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
  }

  useEffect(() => {
    loadInsights();
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

      <div className="p-6 max-w-[var(--content-max-width)] mx-auto space-y-10">
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

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">Execution Map</h2>
                <p className="text-sm text-[var(--muted)]">
                  Recent run activity by agent.
                </p>
              </div>
              <Link to="/dashboard/runs">
                <Button variant="secondary" size="sm">
                  View Runs
                </Button>
              </Link>
            </div>
            {insightsLoading ? (
              <p className="text-[var(--muted)]">Loading execution map...</p>
            ) : executionMap?.nodes.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead>Success</TableHead>
                    <TableHead>Last Run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executionMap.nodes.slice(0, 8).map((node) => (
                    <TableRow key={node.id}>
                      <TableCell className="font-medium">{node.name}</TableCell>
                      <TableCell className="text-[var(--muted-strong)]">{node.tier}</TableCell>
                      <TableCell>{node.runStats.runsTotal}</TableCell>
                      <TableCell>{node.runStats.successRate}%</TableCell>
                      <TableCell className="text-[var(--muted)]">
                        {node.runStats.lastRunAt
                          ? new Date(node.runStats.lastRunAt).toLocaleString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={<IconHistory size={48} />}
                title="No execution data yet"
                description="Run an agent to populate the execution map."
                action={
                  registry?.ceo ? (
                    <Link to={`/dashboard/console/${registry.ceo.id}`}>
                      <Button size="sm">Run CEO Agent</Button>
                    </Link>
                  ) : undefined
                }
              />
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink)]">KPI Notes</h2>
              <p className="text-sm text-[var(--muted)]">
                Snapshot for the last 30 days.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Avg Duration</span>
                <span className="font-medium">
                  {kpis ? formatDuration(kpis.avgDurationMs) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Queued</span>
                <span className="font-medium">{kpis ? kpiTotals?.queued ?? 0 : "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Failed</span>
                <span className="font-medium">{kpis ? kpiTotals?.failed ?? 0 : "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Canceled</span>
                <span className="font-medium">{kpis ? kpiTotals?.canceled ?? 0 : "—"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Last Run</span>
                <span className="font-medium">
                  {kpis?.lastRunAt ? new Date(kpis.lastRunAt).toLocaleString() : "—"}
                </span>
              </div>
            </div>
          </Card>
        </section>

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
