/**
 * Scorer Policy - Domain Rule
 *
 * Maps a `ScorerKind` to its registered Scorer implementation. New scorers register
 * themselves via `ScorerRegistry.register(kind, factory)`; the rest of the system
 * never branches on `ScorerKind` directly. This is OCP-friendly by design.
 */

import type { ScorerKind } from "../entities/eval-result.js";

export interface ScorerPolicyEntry<TScorer> {
  readonly kind: ScorerKind;
  readonly version: string;
  readonly factory: () => TScorer;
}

export class ScorerRegistry<TScorer> {
  private readonly entries = new Map<ScorerKind, ScorerPolicyEntry<TScorer>>();

  register(entry: ScorerPolicyEntry<TScorer>): this {
    if (this.entries.has(entry.kind)) {
      throw new Error(`Scorer kind already registered: ${entry.kind}`);
    }
    this.entries.set(entry.kind, entry);
    return this;
  }

  has(kind: ScorerKind): boolean {
    return this.entries.has(kind);
  }

  get(kind: ScorerKind): ScorerPolicyEntry<TScorer> {
    const entry = this.entries.get(kind);
    if (!entry) {
      throw new Error(`Scorer kind not registered: ${kind}`);
    }
    return entry;
  }

  kinds(): readonly ScorerKind[] {
    return [...this.entries.keys()];
  }

  versions(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [kind, entry] of this.entries) {
      out[kind] = entry.version;
    }
    return out;
  }

  /** OCP: extends by appending a new entry — never modifies the existing map. */
  extend(entries: readonly ScorerPolicyEntry<TScorer>[]): ScorerRegistry<TScorer> {
    const next = new ScorerRegistry<TScorer>();
    for (const existing of this.entries.values()) {
      next.register(existing);
    }
    for (const addition of entries) {
      next.register(addition);
    }
    return next;
  }
}
