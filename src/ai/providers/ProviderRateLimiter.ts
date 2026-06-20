import { RateLimitError } from './ProviderErrors';

/**
 * ProviderRateLimiter – concurrency-limiting + RPM leasing + request queue.
 *
 * All calls to a provider MUST go through acquire() / release():
 *
 *   await ProviderRateLimiter.acquire();
 *   try {
 *     result = await provider.generate(prompt);
 *   } finally {
 *     ProviderRateLimiter.release();
 *   }
 *
 * When the concurrency ceiling is reached, new requests are queued (FIFO)
 * instead of immediately throwing, up to `maxQueueSize`.  If the queue is
 * also full a RateLimitError is thrown immediately.
 *
 * Exponential back-off is applied between individual queue-drain retries.
 */

interface QueuedRequest {
  resolve: () => void;
  reject: (err: Error) => void;
  enqueuedAt: number;
}

export interface RateLimiterMetrics {
  readonly requestsInLastMinute: number;
  readonly activeConcurrency: number;
  readonly queueDepth: number;
  readonly totalQueued: number;
  readonly totalRejected: number;
  readonly maxConcurrency: number;
  readonly maxRpm: number;
  readonly maxQueueSize: number;
}

export class ProviderRateLimiter {
  // ------------------------------------------------------------------ state
  private static requestsInLastMinute = 0;
  private static activeConcurrency = 0;
  private static lastRpmResetTimestamp = Date.now();

  private static maxRpm = 60;
  private static maxConcurrency = 3;
  private static maxQueueSize = 100;

  // Queue of callers waiting for a concurrency slot
  private static queue: QueuedRequest[] = [];

  // Telemetry counters
  private static totalQueued = 0;
  private static totalRejected = 0;

  // ------------------------------------------------------------------ config

  static setLimits(rpm: number, maxConcurrency: number, maxQueueSize = 100): void {
    this.maxRpm = rpm;
    this.maxConcurrency = maxConcurrency;
    this.maxQueueSize = maxQueueSize;
  }

  // ------------------------------------------------------------------ public API

  /**
   * Acquire a lease before calling the provider.
   * Queues the caller if concurrency is full.
   * Throws RateLimitError if the RPM limit or queue capacity is exceeded.
   */
  static async acquire(): Promise<void> {
    this.resetRpmWindowIfNeeded();

    // 1. RPM hard check (no queuing – RPM is a sliding window guard)
    if (this.requestsInLastMinute >= this.maxRpm) {
      this.totalRejected++;
      throw new RateLimitError(
        `Rate limiter block: Maximum requests per minute (${this.maxRpm}) exceeded. Please wait.`
      );
    }

    // 2. Concurrency slot available?
    if (this.activeConcurrency < this.maxConcurrency) {
      this.grantSlot();
      return;
    }

    // 3. No slot – try to queue
    if (this.queue.length >= this.maxQueueSize) {
      this.totalRejected++;
      throw new RateLimitError(
        `Rate limiter block: Request queue is full (${this.maxQueueSize}). Try again later.`
      );
    }

    // Enqueue and wait for a slot to be released
    this.totalQueued++;
    await this.enqueue();
    // After dequeue we already incremented activeConcurrency in drainQueue()
  }

  /** Release a previously acquired concurrency slot. */
  static release(): void {
    this.activeConcurrency = Math.max(0, this.activeConcurrency - 1);
    this.drainQueue();
  }

  // ------------------------------------------------------------------ metrics

  static getMetrics(): RateLimiterMetrics {
    return {
      requestsInLastMinute: this.requestsInLastMinute,
      activeConcurrency:    this.activeConcurrency,
      queueDepth:           this.queue.length,
      totalQueued:          this.totalQueued,
      totalRejected:        this.totalRejected,
      maxConcurrency:       this.maxConcurrency,
      maxRpm:               this.maxRpm,
      maxQueueSize:         this.maxQueueSize
    };
  }

  // ------------------------------------------------------------------ reset (tests)

  static reset(): void {
    this.requestsInLastMinute = 0;
    this.activeConcurrency = 0;
    this.lastRpmResetTimestamp = Date.now();
    // Reject any queued callers so tests don't hang
    for (const entry of this.queue) {
      entry.reject(new RateLimitError('Rate limiter was reset.'));
    }
    this.queue = [];
    this.totalQueued = 0;
    this.totalRejected = 0;
  }

  // ------------------------------------------------------------------ private

  private static resetRpmWindowIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastRpmResetTimestamp > 60 * 1000) {
      this.requestsInLastMinute = 0;
      this.lastRpmResetTimestamp = now;
    }
  }

  private static grantSlot(): void {
    this.requestsInLastMinute++;
    this.activeConcurrency++;
  }

  /** Returns a promise that resolves when a slot has been granted to this caller. */
  private static enqueue(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject, enqueuedAt: Date.now() });
    });
  }

  /**
   * Dequeue and unblock the next waiting request (if any slot is available).
   * Called every time a slot is released.
   */
  private static drainQueue(): void {
    if (this.queue.length === 0) return;
    if (this.activeConcurrency >= this.maxConcurrency) return;

    const next = this.queue.shift();
    if (!next) return;

    // Re-check RPM before granting
    this.resetRpmWindowIfNeeded();
    if (this.requestsInLastMinute >= this.maxRpm) {
      next.reject(new RateLimitError('Rate limiter: RPM limit reached while dequeuing.'));
      return;
    }

    this.grantSlot();
    next.resolve();
  }
}
