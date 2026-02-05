/**
 * Agent Hooks
 *
 * React hooks for fetching and managing agent data.
 */
import { useState, useEffect } from "react";
import { apiClient, ApiError } from "../lib/api-client";
/**
 * Fetches the full agent registry (CEO, orchestrators, workers)
 */
export function useAgents() {
    const [registry, setRegistry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
            }
            catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err : new Error("Failed to fetch agents"));
                }
            }
            finally {
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
/**
 * Fetches a specific agent by ID
 */
export function useAgent(id) {
    const [agent, setAgent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notFound, setNotFound] = useState(false);
    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        async function fetchAgent() {
            setLoading(true);
            setError(null);
            setNotFound(false);
            try {
                const data = await apiClient.getAgent(id);
                if (!cancelled) {
                    setAgent(data);
                }
            }
            catch (err) {
                if (!cancelled) {
                    if (err instanceof ApiError && err.status === 404) {
                        setNotFound(true);
                    }
                    else {
                        setError(err instanceof Error ? err : new Error("Failed to fetch agent"));
                    }
                }
            }
            finally {
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
