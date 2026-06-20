export interface EnvironmentProfile {
  readonly queueSize: number;
  readonly workerCount: number;
  readonly retryLimits: number;
  readonly cooldownDurationDefaultMs: number;
  readonly schedulerIntervalMs: number;
  readonly loggingVerbosity: 'debug' | 'info' | 'warn' | 'error';
  readonly executionTimeoutMs: number;
  readonly batchingLimits: number;
  readonly deadLetterThreshold: number;
  readonly notificationRetentionDays: number;
}

export class AutomationConfig {
  private static activeProfileName: 'development' | 'testing' | 'production' = 'production';

  private static readonly PROFILES: Record<'development' | 'testing' | 'production', EnvironmentProfile> = {
    development: {
      queueSize: 100,
      workerCount: 1,
      retryLimits: 2,
      cooldownDurationDefaultMs: 5000, // 5 seconds for developer validation
      schedulerIntervalMs: 10000, // 10 seconds
      loggingVerbosity: 'debug',
      executionTimeoutMs: 2000,
      batchingLimits: 10,
      deadLetterThreshold: 3,
      notificationRetentionDays: 7
    },
    testing: {
      queueSize: 5000,
      workerCount: 2,
      retryLimits: 3,
      cooldownDurationDefaultMs: 50, // 50ms for swift test loops
      schedulerIntervalMs: 100, // 100ms
      loggingVerbosity: 'debug',
      executionTimeoutMs: 500,
      batchingLimits: 5,
      deadLetterThreshold: 2,
      notificationRetentionDays: 1
    },
    production: {
      queueSize: 5000,
      workerCount: 1, // WorkerPool size defaults to 1
      retryLimits: 5,
      cooldownDurationDefaultMs: 24 * 60 * 60 * 1000, // 24 hours
      schedulerIntervalMs: 60000, // 1 minute
      loggingVerbosity: 'info',
      executionTimeoutMs: 10000, // 10 seconds
      batchingLimits: 50,
      deadLetterThreshold: 5,
      notificationRetentionDays: 30
    }
  };

  static setProfile(profile: 'development' | 'testing' | 'production'): void {
    AutomationConfig.activeProfileName = profile;
  }

  static get active(): EnvironmentProfile {
    return AutomationConfig.PROFILES[AutomationConfig.activeProfileName];
  }

  static get profileName(): string {
    return AutomationConfig.activeProfileName;
  }
}
