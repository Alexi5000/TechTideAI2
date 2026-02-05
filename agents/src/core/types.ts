export type AgentTier = "ceo" | "orchestrator" | "worker";

export interface AgentDefinition {
  id: string;
  name: string;
  tier: AgentTier;
  domain: string;
  mission: string;
  responsibilities: string[];
  outputs: string[];
  tools: string[];
  metrics: string[];
}
