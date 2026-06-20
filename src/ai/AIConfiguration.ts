export interface AIProfile {
  readonly tokenLimit: number;
  readonly temperature: number;
  readonly retryLimit: number;
  readonly loggingVerbosity: 'debug' | 'info' | 'silent';
  readonly cacheTtlMs: number;
  readonly modelName: string;
}

export class AIConfiguration {
  private static activeProfile: 'development' | 'testing' | 'production' = 'production';

  private static readonly profiles: Record<'development' | 'testing' | 'production', AIProfile> = {
    development: {
      tokenLimit: 2000,
      temperature: 0.7,
      retryLimit: 1,
      loggingVerbosity: 'debug',
      cacheTtlMs: 60 * 1000, // 1 minute
      modelName: 'gemini-2.0-flash'
    },
    testing: {
      tokenLimit: 5000,
      temperature: 0.0,
      retryLimit: 0,
      loggingVerbosity: 'silent',
      cacheTtlMs: 0, // No cache for tests
      modelName: 'mock-model'
    },
    production: {
      tokenLimit: 8000,
      temperature: 0.3,
      retryLimit: 3,
      loggingVerbosity: 'info',
      cacheTtlMs: 30 * 60 * 1000, // 30 minutes
      modelName: 'gemini-2.0-flash'
    }
  };

  static setProfile(profile: 'development' | 'testing' | 'production'): void {
    this.activeProfile = profile;
  }

  static getProfileName(): 'development' | 'testing' | 'production' {
    return this.activeProfile;
  }

  static getConfig(): AIProfile {
    return this.profiles[this.activeProfile];
  }
}
