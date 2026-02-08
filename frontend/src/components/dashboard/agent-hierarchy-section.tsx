/**
 * Agent Hierarchy Section
 *
 * Displays the agent org chart with toggle controls.
 * Colocates toggle state internally via useAgentToggles.
 */

import { Link } from "react-router-dom";
import type { AgentRegistry, ExecutionMapSummary } from "@/lib/api-client.js";
import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { AgentTree } from "@/components/agent-tree.js";
import { IconAgents } from "@/components/icons/index.js";
import { useAgentToggles } from "@/hooks/use-agent-toggles.js";

interface AgentHierarchySectionProps {
  registry: AgentRegistry | null;
  executionMap: ExecutionMapSummary | null;
  loading: boolean;
  onRetry: () => void;
}

export function AgentHierarchySection({
  registry,
  executionMap,
  loading,
  onRetry,
}: AgentHierarchySectionProps) {
  const { isEnabled, setToggle, toggleAll } = useAgentToggles();

  const allAgentIds = registry
    ? [registry.ceo.id, ...registry.orchestrators.map((o) => o.id), ...registry.workers.map((w) => w.id)]
    : [];

  return (
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

        {loading && !executionMap ? (
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
            action={<Button size="sm" onClick={onRetry}>Retry</Button>}
          />
        )}
      </Card>
    </section>
  );
}
