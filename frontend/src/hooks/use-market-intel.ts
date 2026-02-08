/**
 * Market Intel Hook
 *
 * Manages market intelligence search state and API interaction.
 */

import { useState } from "react";
import { apiClient, type MarketIntelResponse } from "@/lib/api-client.js";

interface UseMarketIntelResult {
  query: string;
  setQuery: (q: string) => void;
  result: MarketIntelResponse | null;
  loading: boolean;
  error: string | null;
  search: () => Promise<void>;
}

export function useMarketIntel(): UseMarketIntelResult {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<MarketIntelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getMarketIntel({
        query: query.trim(),
        collections: ["market-intel"],
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch market intel");
    } finally {
      setLoading(false);
    }
  }

  return { query, setQuery, result, loading, error, search };
}
