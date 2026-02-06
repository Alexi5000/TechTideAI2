/**
 * Console Index Page
 *
 * Agent selector for the console. Shows when users navigate to
 * /dashboard/console without specifying an agent.
 */

import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAgents } from "@/hooks/use-agents.js";
import { Topbar } from "@/components/layout/index.js";
import { PageTransition } from "@/components/page-transition.js";
import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { Input } from "@/components/ui/input.js";
import { Select } from "@/components/ui/select.js";
import { IconTerminal, IconArrowRight } from "@/components/icons/index.js";
import type { Agent } from "@/lib/api-client.js";
import type { DashboardContextType } from "@/components/layout/index.js";

function QuickSelectCard({ agent }: { agent: Agent }) {
  return (
    <Link to={`/dashboard/console/${agent.id}`} className="block group">
      <Card className="flex items-center gap-4 hover:shadow-[var(--shadow-md)] hover:border-[var(--accent)]/30 transition-all cursor-pointer">
        <div className="h-10 w-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
          <IconTerminal size={20} className="text-[var(--accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium text-[var(--ink)] truncate">{agent.name}</h3>
            <Badge>{agent.tier}</Badge>
          </div>
          <p className="text-sm text-[var(--muted)] truncate">{agent.domain}</p>
        </div>
        <IconArrowRight
          size={18}
          className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0"
        />
      </Card>
    </Link>
  );
}

function QuickSelectSkeleton() {
  return (
    <Card className="flex items-center gap-4 animate-pulse">
      <div className="h-10 w-10 rounded-lg bg-[var(--stroke)]" />
      <div className="flex-1">
        <div className="h-5 w-32 bg-[var(--stroke)] rounded mb-1" />
        <div className="h-4 w-24 bg-[var(--stroke)] rounded" />
      </div>
    </Card>
  );
}

export function ConsoleIndexPage() {
  const { onMobileMenuToggle } = useOutletContext<DashboardContextType>();
  const { registry, loading, error, refetch } = useAgents();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  if (error) {
    return (
      <PageTransition>
        <Topbar
          title="Console"
          onMobileMenuToggle={onMobileMenuToggle}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Console" },
          ]}
        />
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-[var(--error)] mb-4">Error: {error.message}</p>
            <Button onClick={refetch}>Retry</Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Topbar
        title="Console"
        onMobileMenuToggle={onMobileMenuToggle}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Console" },
        ]}
      />

      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-[var(--muted-strong)] mb-8">
          Select an agent to start a conversation or run a task.
        </p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <QuickSelectSkeleton key={i} />
            ))}
          </div>
        ) : registry ? (
          <div className="space-y-8">
            <section className="rounded-2xl border border-[var(--stroke)] p-5 bg-[var(--surface-1)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)] mb-1">Primary</p>
                  <h2 className="text-lg font-semibold text-[var(--ink)]">
                    Start a run with the CEO agent
                  </h2>
                  <p className="text-sm text-[var(--muted)]">
                    Launch the executive console for high-level direction.
                  </p>
                </div>
                <Link to={`/dashboard/console/${registry.ceo.id}`}>
                  <Button>Start Run</Button>
                </Link>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search agents by name, domain, or mission..."
                />
                <Select
                  value={tierFilter}
                  onChange={(event) => setTierFilter(event.target.value)}
                  className="sm:w-40"
                >
                  <option value="all">All tiers</option>
                  <option value="ceo">CEO</option>
                  <option value="orchestrator">Orchestrators</option>
                  <option value="worker">Workers</option>
                </Select>
              </div>

              <div className="space-y-3">
                {(() => {
                  const allAgents = [
                    registry.ceo,
                    ...registry.orchestrators,
                    ...registry.workers,
                  ];
                  const normalized = search.trim().toLowerCase();
                  const filtered = allAgents.filter((agent) => {
                    if (tierFilter !== "all" && agent.tier !== tierFilter) return false;
                    if (!normalized) return true;
                    return (
                      agent.name.toLowerCase().includes(normalized) ||
                      agent.domain.toLowerCase().includes(normalized) ||
                      agent.mission.toLowerCase().includes(normalized)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <p className="text-sm text-[var(--muted)]">
                        No agents match your search.
                      </p>
                    );
                  }

                  return filtered.map((agent) => (
                    <QuickSelectCard key={agent.id} agent={agent} />
                  ));
                })()}
              </div>
            </section>

            <div className="pt-4 border-t border-[var(--stroke)]">
              <Link to="/dashboard/agents">
                <Button variant="secondary" className="w-full">
                  Browse All {registry.workers.length + registry.orchestrators.length + 1} Agents
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </PageTransition>
  );
}
