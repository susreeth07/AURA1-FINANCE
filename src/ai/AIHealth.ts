import { TokenUsageTracker } from './providers/TokenUsageTracker';
import { ProviderRateLimiter } from './providers/ProviderRateLimiter';
import { CostProtection } from './providers/CostProtection';

export interface AIHealthReport {
  readonly requestsSent: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly cacheHitRatio: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly streamingDurationMs: number;
  readonly retries: number;
  readonly timeoutCount: number;
  // Cost
  readonly estimatedCostUsd: number;
  readonly dailyCostUsd: number;
  readonly monthlyCostUsd: number;
  readonly dailyCostWarning: boolean;
  readonly monthlyCostWarning: boolean;
  // Availability
  readonly providerAvailability: number;
  // Token accounting
  readonly totalPromptTokens: number;
  readonly totalCompletionTokens: number;
  // Tools
  readonly averageToolLatencyMs: number;
  // Fallback / compression
  readonly fallbackCount: number;
  readonly compressionCount: number;
  // Queue depth (§3)
  readonly requestQueueDepth: number;
  readonly requestQueueRejected: number;
  // Cost protection
  readonly downgradedToFlash: boolean;
}

export class AIHealth {
  private static requestsSent = 0;
  private static successfulRequests = 0;
  private static failedRequests = 0;
  private static latencyHistory: number[] = [];
  private static cacheHits = 0;
  private static cacheMisses = 0;
  private static streamingDurationMs = 0;
  private static retries = 0;
  private static timeoutCount = 0;
  private static totalToolDurationMs = 0;
  private static toolExecutionCount = 0;
  private static fallbackCount = 0;
  private static compressionCount = 0;

  static recordRequest(promptTokens: number, completionTokens: number, durationLlmMs: number): void {
    this.requestsSent++;
    this.successfulRequests++;
    this.latencyHistory.push(durationLlmMs);
    if (this.latencyHistory.length > 100) {
      this.latencyHistory.shift();
    }
    TokenUsageTracker.recordUsage(promptTokens, completionTokens);
  }

  static recordFailure(timeout = false): void {
    this.requestsSent++;
    this.failedRequests++;
    if (timeout) {
      this.timeoutCount++;
    }
  }

  static recordCacheHit(): void {
    this.cacheHits++;
    this.requestsSent++;
    this.successfulRequests++;
  }

  static recordCacheMiss(): void {
    this.cacheMisses++;
  }

  static recordStreaming(durationMs: number): void {
    this.streamingDurationMs += durationMs;
  }

  static recordRetry(): void {
    this.retries++;
  }

  static recordToolExecution(durationMs: number): void {
    this.totalToolDurationMs += durationMs;
    this.toolExecutionCount++;
  }

  static recordFallback(): void {
    this.fallbackCount++;
  }

  static recordCompression(): void {
    this.compressionCount++;
  }

  static getReport(): AIHealthReport {
    const totalRequests = this.requestsSent;
    const cacheHitsCount = this.cacheHits;
    const trackerStats = TokenUsageTracker.getStats();
    const queueMetrics = ProviderRateLimiter.getMetrics();
    const costSummary  = CostProtection.getSummary();

    let p95 = 0;
    if (this.latencyHistory.length > 0) {
      const sorted = [...this.latencyHistory].sort((a, b) => a - b);
      const index = Math.ceil(sorted.length * 0.95) - 1;
      p95 = sorted[index];
    }

    const sum = this.latencyHistory.reduce((s, v) => s + v, 0);
    const average = this.latencyHistory.length > 0 ? sum / this.latencyHistory.length : 0;

    const availability = totalRequests > 0
      ? (this.successfulRequests / totalRequests) * 100
      : 100;

    const hitRatio = totalRequests > 0
      ? cacheHitsCount / totalRequests
      : 0;

    const dayKey   = new Date().toISOString().slice(0, 10);
    const monthKey = new Date().toISOString().slice(0, 7);

    return {
      requestsSent:         totalRequests,
      successfulRequests:   this.successfulRequests,
      failedRequests:       this.failedRequests,
      averageLatencyMs:     Number(average.toFixed(2)),
      p95LatencyMs:         Number(p95.toFixed(2)),
      cacheHitRatio:        Number(hitRatio.toFixed(2)),
      cacheHits:            cacheHitsCount,
      cacheMisses:          this.cacheMisses,
      streamingDurationMs:  this.streamingDurationMs,
      retries:              this.retries,
      timeoutCount:         this.timeoutCount,
      // Cost
      estimatedCostUsd:     trackerStats.estimatedCostUsd,
      dailyCostUsd:         trackerStats.dailyCostUsd[dayKey]   || 0,
      monthlyCostUsd:       trackerStats.monthlyCostUsd[monthKey] || 0,
      dailyCostWarning:     costSummary.dailyWarningTriggered,
      monthlyCostWarning:   costSummary.monthlyWarningTriggered,
      // Availability
      providerAvailability: Number(availability.toFixed(2)),
      // Token accounting
      totalPromptTokens:    trackerStats.promptTokens,
      totalCompletionTokens: trackerStats.completionTokens,
      // Tool latency
      averageToolLatencyMs: this.toolExecutionCount > 0
        ? Number((this.totalToolDurationMs / this.toolExecutionCount).toFixed(2))
        : 0,
      fallbackCount:        this.fallbackCount,
      compressionCount:     this.compressionCount,
      // Queue
      requestQueueDepth:    queueMetrics.queueDepth,
      requestQueueRejected: queueMetrics.totalRejected,
      // Cost protection
      downgradedToFlash:    costSummary.downgradedToFlash
    };
  }

  static clear(): void {
    this.requestsSent = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.latencyHistory = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.streamingDurationMs = 0;
    this.retries = 0;
    this.timeoutCount = 0;
    this.totalToolDurationMs = 0;
    this.toolExecutionCount = 0;
    this.fallbackCount = 0;
    this.compressionCount = 0;
    TokenUsageTracker.reset();
  }
}
