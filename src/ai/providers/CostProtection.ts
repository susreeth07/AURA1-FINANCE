import { AIConfiguration } from '../AIConfiguration';

/**
 * CostProtection – enforces daily and monthly AI spend budgets.
 *
 * When a budget threshold is breached:
 *   - A warning is emitted (consumable via getWarnings()).
 *   - The service may be instructed to downgrade to Flash models or
 *     switch to MockProvider (testing profile only).
 *
 * The tracker lives here so it can be consulted before every LLM call
 * without going through AIHealth (which records results, not pre-call guards).
 *
 * Cost rates (matching TokenUsageTracker):
 *   prompt tokens     : $0.000075 / 1 000 tokens
 *   completion tokens : $0.000300 / 1 000 tokens
 */
export interface CostPeriodSummary {
  readonly dailyCostUsd: number;
  readonly monthlyCostUsd: number;
  readonly dailyTokens: number;
  readonly monthlyTokens: number;
  readonly dailyWarningTriggered: boolean;
  readonly monthlyWarningTriggered: boolean;
  readonly downgradedToFlash: boolean;
}

export class CostProtection {
  // Accumulated costs by calendar day   (YYYY-MM-DD → USD)
  private static dailyCosts: Record<string, number> = {};
  // Accumulated costs by calendar month (YYYY-MM → USD)
  private static monthlyCosts: Record<string, number> = {};
  // Token accumulators (parallel structure)
  private static dailyTokens: Record<string, number> = {};
  private static monthlyTokens: Record<string, number> = {};

  private static dailyWarningFired = false;
  private static monthlyWarningFired = false;
  private static downgradedToFlash = false;

  private static warnings: string[] = [];

  // ------------------------------------------------------------------
  // Record a completed request's token usage
  // ------------------------------------------------------------------

  static record(promptTokens: number, completionTokens: number): void {
    const cost =
      (promptTokens  * 0.000075 / 1000) +
      (completionTokens * 0.000300 / 1000);
    const total = promptTokens + completionTokens;

    const dayKey   = new Date().toISOString().slice(0, 10);    // YYYY-MM-DD
    const monthKey = new Date().toISOString().slice(0, 7);     // YYYY-MM

    this.dailyCosts[dayKey]     = (this.dailyCosts[dayKey]   || 0) + cost;
    this.monthlyCosts[monthKey] = (this.monthlyCosts[monthKey] || 0) + cost;
    this.dailyTokens[dayKey]    = (this.dailyTokens[dayKey]  || 0) + total;
    this.monthlyTokens[monthKey]= (this.monthlyTokens[monthKey] || 0) + total;

    this.evaluateThresholds();
  }

  // ------------------------------------------------------------------
  // Pre-call guard: returns true if spending is allowed
  // ------------------------------------------------------------------

  static isAllowed(): boolean {
    const config = AIConfiguration.getConfig();
    const dayKey   = new Date().toISOString().slice(0, 10);
    const monthKey = new Date().toISOString().slice(0, 7);

    const dailyCost   = this.dailyCosts[dayKey]     || 0;
    const monthlyCost = this.monthlyCosts[monthKey] || 0;

    // Hard stop if both hard limits are exceeded (2× soft limit)
    if (
      dailyCost   >= config.dailyCostLimitUsd * 2 ||
      monthlyCost >= config.monthlyCostLimitUsd * 2
    ) {
      return false;
    }
    return true;
  }

  /**
   * Returns true if the caller should downgrade to Flash model tier
   * (soft warning breached but hard stop not yet reached).
   */
  static shouldDowngradeToFlash(): boolean {
    return this.downgradedToFlash;
  }

  // ------------------------------------------------------------------
  // Threshold evaluation (called after every record())
  // ------------------------------------------------------------------

  private static evaluateThresholds(): void {
    const config = AIConfiguration.getConfig();
    const dayKey   = new Date().toISOString().slice(0, 10);
    const monthKey = new Date().toISOString().slice(0, 7);

    const dailyCost   = this.dailyCosts[dayKey]     || 0;
    const monthlyCost = this.monthlyCosts[monthKey] || 0;

    // Daily soft limit
    if (!this.dailyWarningFired && dailyCost >= config.dailyCostLimitUsd) {
      this.dailyWarningFired = true;
      this.downgradedToFlash = true;
      const msg = `[CostProtection] Daily AI spend threshold reached ($${dailyCost.toFixed(4)} / $${config.dailyCostLimitUsd}). Downgrading to Flash models.`;
      this.warnings.push(msg);
      console.warn(msg);
    }

    // Monthly soft limit
    if (!this.monthlyWarningFired && monthlyCost >= config.monthlyCostLimitUsd) {
      this.monthlyWarningFired = true;
      this.downgradedToFlash = true;
      const msg = `[CostProtection] Monthly AI spend threshold reached ($${monthlyCost.toFixed(4)} / $${config.monthlyCostLimitUsd}). Downgrading to Flash models.`;
      this.warnings.push(msg);
      console.warn(msg);
    }
  }

  // ------------------------------------------------------------------
  // Diagnostics
  // ------------------------------------------------------------------

  static getSummary(): CostPeriodSummary {
    const dayKey   = new Date().toISOString().slice(0, 10);
    const monthKey = new Date().toISOString().slice(0, 7);
    return {
      dailyCostUsd:              Number((this.dailyCosts[dayKey]     || 0).toFixed(6)),
      monthlyCostUsd:            Number((this.monthlyCosts[monthKey] || 0).toFixed(6)),
      dailyTokens:               this.dailyTokens[dayKey]    || 0,
      monthlyTokens:             this.monthlyTokens[monthKey]|| 0,
      dailyWarningTriggered:     this.dailyWarningFired,
      monthlyWarningTriggered:   this.monthlyWarningFired,
      downgradedToFlash:         this.downgradedToFlash
    };
  }

  static getWarnings(): readonly string[] {
    return [...this.warnings];
  }

  static reset(): void {
    this.dailyCosts        = {};
    this.monthlyCosts      = {};
    this.dailyTokens       = {};
    this.monthlyTokens     = {};
    this.dailyWarningFired  = false;
    this.monthlyWarningFired= false;
    this.downgradedToFlash  = false;
    this.warnings           = [];
  }
}
