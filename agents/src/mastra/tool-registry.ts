import type { ToolsInput } from "@mastra/core/agent";
import type { AgentDefinition } from "../core/types.js";
import { CORE_TOOL_IDS, CORE_TOOL_ID_SET, TOOL_IDS, TOOL_ID_SET } from "../core/tool-catalog.js";
import {
  systemStatusTool,
  llmRouterTool,
  knowledgeBaseTool,
  workflowRunnerTool,
  orgKpiDashboardTool,
  executionMapTool,
  marketIntelTool,
  memoryRecallTool,
  memoryStoreTool,
  talentHubTool,
  financeLedgerTool,
  crmInsightsTool,
  contentLabTool,
  supportHubTool,
  userInsightsTool,
  dataLakeTool,
  runbookTool,
} from "./tools/index.js";

export const sharedTools: ToolsInput = {
  "system-status": systemStatusTool,
  "llm-router": llmRouterTool,
  "knowledge-base": knowledgeBaseTool,
  "workflow-runner": workflowRunnerTool,
  "org-kpi-dashboard": orgKpiDashboardTool,
  "execution-map": executionMapTool,
  "market-intel": marketIntelTool,
  "memory-recall": memoryRecallTool,
  "memory-store": memoryStoreTool,
};

export const toolRegistry: ToolsInput = {
  ...sharedTools,
  "talent-hub": talentHubTool,
  "finance-ledger": financeLedgerTool,
  "crm-insights": crmInsightsTool,
  "content-lab": contentLabTool,
  "support-hub": supportHubTool,
  "user-insights": userInsightsTool,
  "data-lake": dataLakeTool,
  "runbook": runbookTool,
};

const sharedToolIds = Object.keys(sharedTools);
const registryToolIds = Object.keys(toolRegistry);
const missingCoreTools = CORE_TOOL_IDS.filter((tool) => !(tool in sharedTools));
const extraSharedTools = sharedToolIds.filter(
  (tool) => !CORE_TOOL_ID_SET.has(tool as (typeof CORE_TOOL_IDS)[number]),
);
const missingRegistryTools = TOOL_IDS.filter((tool) => !(tool in toolRegistry));
const extraRegistryTools = registryToolIds.filter(
  (tool) => !TOOL_ID_SET.has(tool as (typeof TOOL_IDS)[number]),
);

if (missingCoreTools.length > 0) {
  throw new Error(`Missing core tool implementations: ${missingCoreTools.join(", ")}`);
}

if (extraSharedTools.length > 0) {
  throw new Error(`Unexpected shared tool implementations: ${extraSharedTools.join(", ")}`);
}

if (missingRegistryTools.length > 0) {
  throw new Error(`Missing tool registry implementations: ${missingRegistryTools.join(", ")}`);
}

if (extraRegistryTools.length > 0) {
  throw new Error(`Unexpected tool registry implementations: ${extraRegistryTools.join(", ")}`);
}

export function selectToolsForAgent(agent: AgentDefinition): ToolsInput {
  const missing = agent.tools.filter((tool) => !(tool in toolRegistry));
  if (missing.length > 0) {
    throw new Error(`Agent ${agent.id} missing tool implementations: ${missing.join(", ")}`);
  }

  const selected: ToolsInput = {};
  for (const tool of agent.tools) {
    const toolInstance = toolRegistry[tool];
    if (!toolInstance) {
      throw new Error(`Agent ${agent.id} missing tool implementation: ${tool}`);
    }
    selected[tool] = toolInstance;
  }

  return selected;
}
