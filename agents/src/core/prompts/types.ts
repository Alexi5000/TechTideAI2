/**
 * Prompt Template Types
 *
 * Defines the contract for prompt templates used by agents.
 * Templates support variable interpolation with {{variable}} syntax.
 */

export interface PromptTemplate {
  id: string;
  version: string;
  /** Template string with {{variable}} placeholders */
  template: string;
  /** Required variable names that must be provided during rendering */
  variables: string[];
  metadata?: Record<string, string> | undefined;
}

export interface PromptVariables {
  name: string;
  domain: string;
  mission: string;
  responsibilities: string;
  outputs: string;
  metrics: string;
  preferredTools: string;
  sharedTools: string;
  plannedTools?: string | undefined;
  reportsTo?: string | undefined;
  toolPolicyLine: string;
}
