export interface AuraResponse {
  readonly answer: string;
  readonly confidence: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
  readonly reasoning: readonly string[];
  readonly insights: readonly string[];
  readonly recommendations: readonly string[];
  readonly warnings: readonly string[];
  readonly followUpQuestions: readonly string[];
  readonly toolsUsed: readonly string[];
  readonly citations: readonly string[];
  readonly metadata: Record<string, any>;
  readonly executionTimeMs: number;
}
