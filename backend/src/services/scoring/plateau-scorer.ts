/**
 * Plateau-detection wrapper scorer (Phase 8.5).
 *
 * Wraps any inner scorer. Examines the rolling history of scores
 * (`context.history`) and decides whether the run has plateaued:
 *   - the latest `windowSize` scores have a spread smaller than `tolerance`
 *   - the latest score is not strictly better than the best so far
 *
 * When the plateau is detected, the scorer still returns the inner scorer's
 * verdict (so the run passes/fails on its own merits) but publishes
 * `{ plateauDetected: true, rollingDelta: <delta>, windowSize: <n> }` on
 * `meta`. The three-agent harness's loop reads `meta.rollingDelta` and decides
 * whether to stop.
 *
 * The scorer never short-circuits the loop on its own. The harness owns the
 * stop decision; the scorer only reports.
 */

import type { Scorer, ScorerContext, ScoringResult } from "./interfaces.js";

export interface PlateauScorerOptions {
  inner: Scorer;
  windowSize?: number;
  tolerance?: number;
}

const DEFAULT_WINDOW = 2;
const DEFAULT_TOLERANCE = 0.02;

export class PlateauScorer implements Scorer {
  readonly kind = "plateau-scorer" as const;
  private readonly inner: Scorer;
  private readonly windowSize: number;
  private readonly tolerance: number;

  constructor(options: PlateauScorerOptions) {
    this.inner = options.inner;
    this.windowSize = options.windowSize ?? DEFAULT_WINDOW;
    this.tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  }

  async score(context: ScorerContext): Promise<ScoringResult> {
    const start = Date.now();
    const innerResult = await this.inner.score(context);
    const history = context.history ?? [];
    const verdict = computePlateau(history, this.windowSize, this.tolerance);
    return {
      ...innerResult,
      durationMs: Date.now() - start,
      meta: {
        ...(innerResult.meta ?? {}),
        ...verdict,
        windowSize: this.windowSize,
        tolerance: this.tolerance,
      },
    };
  }
}

export interface PlateauVerdict {
  plateauDetected: boolean;
  rollingDelta: number;
  bestSoFar: number;
  latestScore: number;
  samplesConsidered: number;
}

export function computePlateau(
  history: readonly { score: number; iteration: number }[],
  windowSize: number,
  tolerance: number,
): PlateauVerdict {
  const scores = history.map((h) => h.score);
  if (scores.length < 2) {
    return {
      plateauDetected: false,
      rollingDelta: 0,
      bestSoFar: scores[0] ?? 0,
      latestScore: scores[0] ?? 0,
      samplesConsidered: scores.length,
    };
  }
  const bestSoFar = Math.max(...scores);
  const latestScore = scores[scores.length - 1]!;
  const window = scores.slice(-Math.min(windowSize + 1, scores.length));
  const lo = Math.min(...window);
  const hi = Math.max(...window);
  const rollingDelta = hi - lo;
  // Plateau: small spread *and* the latest isn't strictly better than best.
  const plateauDetected = rollingDelta <= tolerance && latestScore <= bestSoFar;
  return {
    plateauDetected,
    rollingDelta,
    bestSoFar,
    latestScore,
    samplesConsidered: scores.length,
  };
}
