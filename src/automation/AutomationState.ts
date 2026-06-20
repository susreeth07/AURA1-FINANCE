export interface RuleState {
  lastExecuted: Date;
  cooldownExpires: Date;
  retryCount: number;
  lastNotificationId?: string;
  executionStatus: 'success' | 'failed' | 'idle';
}

export class AutomationState {
  private static states = new Map<string, RuleState>();

  private static getKey(userId: string, ruleId: string): string {
    return `${userId}:${ruleId}`;
  }

  static getState(userId: string, ruleId: string): RuleState | null {
    const key = AutomationState.getKey(userId, ruleId);
    return AutomationState.states.get(key) || null;
  }

  static updateState(userId: string, ruleId: string, updates: Partial<RuleState>): void {
    const key = AutomationState.getKey(userId, ruleId);
    const existing = AutomationState.states.get(key) || {
      lastExecuted: new Date(0),
      cooldownExpires: new Date(0),
      retryCount: 0,
      executionStatus: 'idle'
    };

    AutomationState.states.set(key, {
      ...existing,
      ...updates
    });
  }

  static isCooldownActive(userId: string, ruleId: string): boolean {
    const state = AutomationState.getState(userId, ruleId);
    if (!state) return false;
    return state.cooldownExpires.getTime() > Date.now();
  }

  static clear(): void {
    AutomationState.states.clear();
  }
}
