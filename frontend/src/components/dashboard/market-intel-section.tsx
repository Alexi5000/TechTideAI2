/**
 * Market Intel Section
 *
 * Self-contained market intelligence search card.
 * Owns its own state via useMarketIntel hook.
 */

import { Card } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { IconSearch } from "@/components/icons/index.js";
import { useMarketIntel } from "@/hooks/use-market-intel.js";

export function MarketIntelSection() {
  const { query, setQuery, result, loading, error, search } = useMarketIntel();

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--ink)]">Market Intel</h2>
        <p className="text-sm text-[var(--muted)]">
          Query your market intelligence knowledge base.
        </p>
      </div>
      <div className="flex gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask about competitors, pricing, or trends..."
          aria-label="Market intelligence search query"
        />
        <Button onClick={search} disabled={loading}>
          <IconSearch size={16} className="mr-2" />
          Search
        </Button>
      </div>
      {loading && <p className="text-[var(--muted)]">Searching...</p>}
      {error && <p className="text-[var(--error)] text-sm">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="text-sm text-[var(--muted-strong)] whitespace-pre-wrap">
            {result.summary}
          </div>
          <div>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">
              Sources
            </p>
            <ul className="space-y-2 text-sm">
              {result.sources.map((source) => (
                <li key={source.chunkId} className="text-[var(--muted-strong)]">
                  {source.title} — {source.source}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
