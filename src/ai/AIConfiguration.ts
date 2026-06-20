export interface AIProfile {
  readonly tokenLimit: number;
  readonly temperature: number;
  readonly topP: number;
  readonly retryLimit: number;
  readonly loggingVerbosity: 'debug' | 'info' | 'silent';
  readonly cacheTtlMs: number;

  // Model tiers – consumed by ModelSelector
  readonly defaultModel: string;      // Pro – complex financial reasoning
  readonly fallbackModel: string;     // Flash – normal conversations
  readonly experimentalModel: string; // Flash Lite – small/simple prompts

  readonly timeoutMs: number;
  readonly streamingEnabled: boolean;
  readonly safetySettings: readonly any[];

  // Cost protection thresholds (USD)
  readonly dailyCostLimitUsd: number;
  readonly monthlyCostLimitUsd: number;

  // Provider retry chain
  readonly maxRetries: number;

  // Request queue
  readonly requestQueueSize: number;
}

export class AIConfiguration {
  private static activeProfile: 'development' | 'testing' | 'production' = 'production';

  private static readonly profiles: Record<'development' | 'testing' | 'production', AIProfile> = {
    development: {
      tokenLimit: 2000,
      temperature: 0.7,
      topP: 0.9,
      retryLimit: 1,
      loggingVerbosity: 'debug',
      cacheTtlMs: 60 * 1000,
      defaultModel: 'gemini-2.0-flash',
      fallbackModel: 'gemini-2.0-flash-lite',
      experimentalModel: 'gemini-2.0-flash-lite',
      timeoutMs: 5000,
      streamingEnabled: true,
      safetySettings: [],
      dailyCostLimitUsd: 1.00,
      monthlyCostLimitUsd: 15.00,
      maxRetries: 2,
      requestQueueSize: 20
    },
    testing: {
      tokenLimit: 5000,
      temperature: 0.0,
      topP: 1.0,
      retryLimit: 0,
      loggingVerbosity: 'silent',
      cacheTtlMs: 0,
      defaultModel: 'mock-model',
      fallbackModel: 'mock-model',
      experimentalModel: 'mock-model',
      timeoutMs: 1000,
      streamingEnabled: true,
      safetySettings: [],
      dailyCostLimitUsd: 0.10,
      monthlyCostLimitUsd: 1.00,
      maxRetries: 0,
      requestQueueSize: 50
    },
    production: {
      tokenLimit: 8000,
      temperature: 0.3,
      topP: 0.95,
      retryLimit: 3,
      loggingVerbosity: 'info',
      cacheTtlMs: 30 * 60 * 1000,
      defaultModel: 'gemini-2.5-pro',
      fallbackModel: 'gemini-2.5-flash',
      experimentalModel: 'gemini-2.5-flash-lite',
      timeoutMs: 10000,
      streamingEnabled: true,
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' }
      ],
      dailyCostLimitUsd: 5.00,
      monthlyCostLimitUsd: 80.00,
      maxRetries: 3,
      requestQueueSize: 100
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
