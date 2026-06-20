export interface HealthStatus {
  readonly queueHealth: 'healthy' | 'warning' | 'degraded';
  readonly workerHealth: 'healthy' | 'busy' | 'stopped';
  readonly platformScore: number; // 0 - 100
  readonly details: Record<string, any>;
}

export class AutomationHealth {
  static checkHealth(queueSize: number, dlqSize: number, activeWorkers: number, workerFailures: number): HealthStatus {
    let score = 100;
    
    score -= dlqSize * 5;
    score -= workerFailures * 2;

    if (queueSize > 1000) {
      score -= 15;
    } else if (queueSize > 100) {
      score -= 5;
    }

    score = Math.max(0, Math.min(100, score));

    const queueHealth = queueSize > 1000 ? 'degraded' : (queueSize > 100 ? 'warning' : 'healthy');
    const workerHealth = activeWorkers > 0 ? 'busy' : 'healthy';

    return {
      queueHealth,
      workerHealth,
      platformScore: score,
      details: {
        queueDepth: queueSize,
        deadLetterCount: dlqSize,
        activeWorkerCount: activeWorkers,
        failuresCount: workerFailures,
        timestamp: new Date()
      }
    };
  }
}
