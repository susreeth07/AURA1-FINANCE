/**
 * CircuitBreaker – provider-level failure guard.
 *
 * States:
 *   Closed   → normal operation; failures are counted.
 *   Open     → provider failed `failureThreshold` times; all traffic is
 *               routed to the fallback. Transitions to HalfOpen after
 *               `cooldownDurationMs`.
 *   HalfOpen → one test request is allowed through; success closes the
 *               circuit, failure re-opens it and resets the cooldown.
 *
 * Tracked metrics (§3 – Provider Metrics):
 *   failures · recoveryAttempts · openDurationMs · openCount
 */
export type CircuitState = 'Closed' | 'Open' | 'HalfOpen';

export interface CircuitBreakerStats {
  readonly state: CircuitState;
  readonly failures: number;
  readonly recoveryAttempts: number;
  readonly lastFailureTime: number;
  readonly openDurationMs: number;
  readonly openCount: number;
}

export class CircuitBreaker {
  // ------------------------------------------------------------------ state
  private static state: CircuitState = 'Closed';
  private static failures = 0;
  private static recoveryAttempts = 0;
  private static lastFailureTime = 0;
  private static openCount = 0;

  private static readonly failureThreshold = 3;
  private static readonly cooldownDurationMs = 10_000; // 10 s

  // ------------------------------------------------------------------ API

  static getState(): CircuitState {
    if (
      this.state === 'Open' &&
      Date.now() - this.lastFailureTime > this.cooldownDurationMs
    ) {
      this.state = 'HalfOpen';
      this.recoveryAttempts++;
    }
    return this.state;
  }

  static recordSuccess(): void {
    if (this.state === 'HalfOpen') {
      // Successful probe → close circuit
      console.info('[CircuitBreaker] HalfOpen probe succeeded. Closing circuit.');
    }
    this.failures = 0;
    this.state    = 'Closed';
  }

  static recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HalfOpen') {
      // Re-open: probe request failed
      this.state = 'Open';
      this.openCount++;
      console.warn('[CircuitBreaker] HalfOpen probe FAILED. Re-opening circuit.');
      return;
    }

    if (this.failures >= this.failureThreshold && this.state === 'Closed') {
      this.state = 'Open';
      this.openCount++;
      console.warn(`[CircuitBreaker] Failure threshold (${this.failureThreshold}) reached. Circuit OPEN.`);
    }
  }

  // ------------------------------------------------------------------ diagnostics

  static getStats(): CircuitBreakerStats {
    const openDuration =
      this.state === 'Open'
        ? Date.now() - this.lastFailureTime
        : 0;
    return {
      state:             this.state,
      failures:          this.failures,
      recoveryAttempts:  this.recoveryAttempts,
      lastFailureTime:   this.lastFailureTime,
      openDurationMs:    openDuration,
      openCount:         this.openCount
    };
  }

  // ------------------------------------------------------------------ reset

  static reset(): void {
    this.state             = 'Closed';
    this.failures          = 0;
    this.recoveryAttempts  = 0;
    this.lastFailureTime   = 0;
    this.openCount         = 0;
  }
}
