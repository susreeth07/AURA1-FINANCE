export class AutomationMetrics {
  private static ruleDurations = new Map<string, number[]>();
  private static ruleExecCount = new Map<string, number>();
  private static totalDropped = 0;
  private static totalDlq = 0;
  private static totalRetries = 0;
  private static successfulRetries = 0;

  static recordRuleDuration(ruleId: string, durationMs: number): void {
    const list = AutomationMetrics.ruleDurations.get(ruleId) || [];
    list.push(durationMs);
    if (list.length > 100) {
      list.shift();
    }
    AutomationMetrics.ruleDurations.set(ruleId, list);

    AutomationMetrics.ruleExecCount.set(ruleId, (AutomationMetrics.ruleExecCount.get(ruleId) || 0) + 1);
  }

  static recordDropped(): void {
    AutomationMetrics.totalDropped++;
  }

  static recordDlq(): void {
    AutomationMetrics.totalDlq++;
  }

  static recordRetry(success: boolean): void {
    AutomationMetrics.totalRetries++;
    if (success) {
      AutomationMetrics.successfulRetries++;
    }
  }

  static getMetrics() {
    const averages: Record<string, number> = {};
    let slowestRule = 'None';
    let slowestTime = -1;
    let fastestRule = 'None';
    let fastestTime = Infinity;

    AutomationMetrics.ruleDurations.forEach((durations, ruleId) => {
      const avg = durations.reduce((sum, d) => sum + d, 0) / (durations.length || 1);
      averages[ruleId] = avg;

      if (avg > slowestTime) {
        slowestTime = avg;
        slowestRule = ruleId;
      }
      if (avg < fastestTime) {
        fastestTime = avg;
        fastestRule = ruleId;
      }
    });

    const frequency: Record<string, number> = {};
    AutomationMetrics.ruleExecCount.forEach((val, key) => {
      frequency[key] = val;
    });

    return {
      averageRuleDurations: averages,
      slowestRule: { name: slowestRule, avgMs: slowestTime },
      fastestRule: { name: fastestRule, avgMs: fastestTime === Infinity ? 0 : fastestTime },
      droppedEvents: AutomationMetrics.totalDropped,
      deadLetterCount: AutomationMetrics.totalDlq,
      retryCount: AutomationMetrics.totalRetries,
      retrySuccessRate: AutomationMetrics.totalRetries > 0 
        ? Math.round((AutomationMetrics.successfulRetries / AutomationMetrics.totalRetries) * 100) 
        : 100,
      ruleExecutionFrequency: frequency
    };
  }

  static clear(): void {
    AutomationMetrics.ruleDurations.clear();
    AutomationMetrics.ruleExecCount.clear();
    AutomationMetrics.totalDropped = 0;
    AutomationMetrics.totalDlq = 0;
    AutomationMetrics.totalRetries = 0;
    AutomationMetrics.successfulRetries = 0;
  }
}
