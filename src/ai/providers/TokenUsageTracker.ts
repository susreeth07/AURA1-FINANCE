/**
 * TokenUsageTracker – records prompt / completion token consumption and
 * computes estimated USD costs.
 *
 * Cost model (Gemini 2.5 pricing approximation):
 *   prompt tokens     : $0.000075  / 1 000 tokens
 *   completion tokens : $0.000300  / 1 000 tokens
 *
 * Integrates with:
 *   - AIHealth  (surfaced in AIHealthReport)
 *   - CostProtection (daily / monthly guard)
 */
export interface TokenUsageReport {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly estimatedCostUsd: number;
  readonly averageCostPerRequestUsd: number;
  /** Daily token totals keyed by YYYY-MM-DD. */
  readonly dailyTotals: Record<string, number>;
  /** Monthly token totals keyed by YYYY-MM. */
  readonly monthlyTotals: Record<string, number>;
  /** Daily estimated USD costs keyed by YYYY-MM-DD. */
  readonly dailyCostUsd: Record<string, number>;
  /** Monthly estimated USD costs keyed by YYYY-MM. */
  readonly monthlyCostUsd: Record<string, number>;
}

export class TokenUsageTracker {
  private static promptTokens = 0;
  private static completionTokens = 0;
  private static totalRequests = 0;

  private static dailyTokens:    Record<string, number> = {};
  private static monthlyTokens:  Record<string, number> = {};
  private static dailyCostMap:   Record<string, number> = {};
  private static monthlyCostMap: Record<string, number> = {};

  // ------------------------------------------------------------------ record

  static recordUsage(prompt: number, completion: number): void {
    this.promptTokens     += prompt;
    this.completionTokens += completion;
    this.totalRequests++;

    const total = prompt + completion;
    const cost  = (prompt * 0.000075 / 1000) + (completion * 0.000300 / 1000);

    const dayKey   = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const monthKey = new Date().toISOString().slice(0, 7);  // YYYY-MM

    this.dailyTokens[dayKey]     = (this.dailyTokens[dayKey]    || 0) + total;
    this.monthlyTokens[monthKey] = (this.monthlyTokens[monthKey]|| 0) + total;
    this.dailyCostMap[dayKey]    = (this.dailyCostMap[dayKey]   || 0) + cost;
    this.monthlyCostMap[monthKey]= (this.monthlyCostMap[monthKey]|| 0) + cost;
  }

  // ------------------------------------------------------------------ query

  static getStats(): TokenUsageReport {
    const total = this.promptTokens + this.completionTokens;
    const cost  = (this.promptTokens  * 0.000075 / 1000) +
                  (this.completionTokens * 0.000300 / 1000);

    // Round all cost map values for readability
    const roundedDailyCost: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.dailyCostMap)) {
      roundedDailyCost[k] = Number(v.toFixed(6));
    }
    const roundedMonthlyCost: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.monthlyCostMap)) {
      roundedMonthlyCost[k] = Number(v.toFixed(6));
    }

    return {
      promptTokens:             this.promptTokens,
      completionTokens:         this.completionTokens,
      totalTokens:              total,
      estimatedCostUsd:         Number(cost.toFixed(6)),
      averageCostPerRequestUsd: this.totalRequests > 0
        ? Number((cost / this.totalRequests).toFixed(6))
        : 0,
      dailyTotals:   { ...this.dailyTokens   },
      monthlyTotals: { ...this.monthlyTokens },
      dailyCostUsd:   roundedDailyCost,
      monthlyCostUsd: roundedMonthlyCost
    };
  }

  // ------------------------------------------------------------------ reset

  static reset(): void {
    this.promptTokens     = 0;
    this.completionTokens = 0;
    this.totalRequests    = 0;
    this.dailyTokens      = {};
    this.monthlyTokens    = {};
    this.dailyCostMap     = {};
    this.monthlyCostMap   = {};
  }
}
