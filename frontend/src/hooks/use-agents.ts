/**
 * Agent Hooks
 *
 * React hooks for fetching and managing agent data.
 */

import { useState, useEffect } from "react";
import { apiClient, type Agent, type AgentRegistry, ApiError } from "../lib/api-client";

interface UseAgentsResult {
  registry: AgentRegistry | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetches the full agent registry (CEO, orchestrators, workers)
 */
export function useAgents(): UseAgentsResult {
  const [registry, setRegistry] = useState<AgentRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchAgents() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getAgents();
        if (!cancelled) {
          setRegistry(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch agents"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAgents();

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const refetch = () => setRefreshToken((n) => n + 1);

  return { registry, loading, error, refetch };
}

interface UseAgentResult {
  agent: Agent | null;
  loading: boolean;
  error: Error | null;
  notFound: boolean;
}

/**
 * Fetches a specific agent by ID
 */
export function useAgent(id: string | undefined): UseAgentResult {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const agentId = id; // Capture for closure
    let cancelled = false;

    async function fetchAgent() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await apiClient.getAgent(agentId);
        if (!cancelled) {
          setAgent(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setNotFound(true);
          } else {
            setError(err instanceof Error ? err : new Error("Failed to fetch agent"));
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAgent();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { agent, loading, error, notFound };
}
