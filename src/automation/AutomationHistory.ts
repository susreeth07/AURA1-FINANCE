import { RuleResult } from './rules/RuleResult';

export interface HistoryEntry {
  readonly timestamp: Date;
  readonly userId: string;
  readonly ruleId: string;
  readonly success: boolean;
  readonly skipped: boolean;
  readonly durationMs: number;
  readonly actionsTriggered: number;
  readonly errorMsg?: string;
}

export class AutomationHistory {
  private static entries: HistoryEntry[] = [];

  static log(entry: HistoryEntry): void {
    AutomationHistory.entries.push(entry);
    if (AutomationHistory.entries.length > 1000) {
      AutomationHistory.entries.shift();
    }
  }

  static getHistory(userId: string): HistoryEntry[] {
    return AutomationHistory.entries.filter(e => e.userId === userId);
  }

  static clear(): void {
    AutomationHistory.entries = [];
  }
}
