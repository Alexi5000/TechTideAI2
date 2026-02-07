export const CORE_TOOL_IDS = [
  "system-status",
  "llm-router",
  "knowledge-base",
  "workflow-runner",
  "org-kpi-dashboard",
  "execution-map",
  "market-intel",
] as const;

export const PLANNED_TOOL_IDS = [
  "talent-hub",
  "finance-ledger",
  "crm-insights",
  "content-lab",
  "support-hub",
  "user-insights",
  "data-lake",
  "runbook",
] as const;

export const TOOL_IDS = [...CORE_TOOL_IDS, ...PLANNED_TOOL_IDS] as const;

export type ToolId = (typeof TOOL_IDS)[number];
export type CoreToolId = (typeof CORE_TOOL_IDS)[number];

export const TOOL_ID_SET = new Set<ToolId>(TOOL_IDS);
export const CORE_TOOL_ID_SET = new Set<CoreToolId>(CORE_TOOL_IDS);

export function isToolId(tool: string): tool is ToolId {
  return TOOL_ID_SET.has(tool as ToolId);
}

export function isCoreToolId(tool: string): tool is CoreToolId {
  return CORE_TOOL_ID_SET.has(tool as CoreToolId);
}
