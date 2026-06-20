export interface RuleResult {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly version: string;
  readonly success: boolean;
  readonly priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'BACKGROUND';
  readonly duration: number;
  readonly confidence: number;
  readonly reason: string;
  readonly recommendation: string;
  readonly metrics: Record<string, any>;
  readonly actions: readonly any[];
  readonly timestamp: Date;
}
