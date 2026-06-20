export interface AIHealthReport {
  readonly totalRequests: number;
  readonly totalPromptTokens: number;
  readonly totalCompletionTokens: number;
  readonly estimatedCostUsd: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly averageToolLatencyMs: number;
  readonly averageLlmLatencyMs: number;
  readonly fallbackCount: number;
  readonly compressionCount: number;
  readonly retryCount: number;
  readonly failures: number;
}

export class AIHealth {
  private static totalRequests = 0;
  private static totalPromptTokens = 0;
  private static totalCompletionTokens = 0;
  private static estimatedCostUsd = 0;
  private static cacheHits = 0;
  private static cacheMisses = 0;
  private static totalToolDurationMs = 0;
  private static totalLlmDurationMs = 0;
  private static toolExecutionCount = 0;
  private static llmExecutionCount = 0;
  private static fallbackCount = 0;
  private static compressionCount = 0;
  private static retryCount = 0;
  private static failures = 0;

  static recordRequest(promptTokens: number, completionTokens: number, durationLlmMs: number): void {
    this.totalRequests++;
    this.totalPromptTokens += promptTokens;
    this.totalCompletionTokens += completionTokens;
    this.totalLlmDurationMs += durationLlmMs;
    this.llmExecutionCount++;

    // Cost model calculation
    const promptCost = (promptTokens * 0.000075) / 1000;
    const completionCost = (completionTokens * 0.000300) / 1000;
    this.estimatedCostUsd += promptCost + completionCost;
  }

  static recordToolExecution(durationMs: number): void {
    this.totalToolDurationMs += durationMs;
    this.toolExecutionCount++;
  }

  static recordCacheHit(): void {
    this.cacheHits++;
    this.totalRequests++;
  }

  static recordCacheMiss(): void {
    this.cacheMisses++;
  }

  static recordFailure(): void {
    this.failures++;
  }

  static recordFallback(): void {
    this.fallbackCount++;
  }

  static recordCompression(): void {
    this.compressionCount++;
  }

  static recordRetry(): void {
    this.retryCount++;
  }

  static getReport(): AIHealthReport {
    return {
      totalRequests: this.totalRequests,
      totalPromptTokens: this.totalPromptTokens,
      totalCompletionTokens: this.totalCompletionTokens,
      estimatedCostUsd: Number(this.estimatedCostUsd.toFixed(6)),
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      averageToolLatencyMs: this.toolExecutionCount > 0 
        ? Number((this.totalToolDurationMs / this.toolExecutionCount).toFixed(2))
        : 0,
      averageLlmLatencyMs: this.llmExecutionCount > 0
        ? Number((this.totalLlmDurationMs / this.llmExecutionCount).toFixed(2))
        : 0,
      fallbackCount: this.fallbackCount,
      compressionCount: this.compressionCount,
      retryCount: this.retryCount,
      failures: this.failures
    };
  }

  static clear(): void {
    this.totalRequests = 0;
    this.totalPromptTokens = 0;
    this.totalCompletionTokens = 0;
    this.estimatedCostUsd = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.totalToolDurationMs = 0;
    this.totalLlmDurationMs = 0;
    this.toolExecutionCount = 0;
    this.llmExecutionCount = 0;
    this.fallbackCount = 0;
    this.compressionCount = 0;
    this.retryCount = 0;
    this.failures = 0;
  }
}
