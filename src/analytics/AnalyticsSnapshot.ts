import { FinancialProfile } from '../domain/types/FinancialProfile';
import { Income } from '../domain/types/Income';
import { Expense } from '../domain/types/Expense';
import { Budget } from '../domain/types/Budget';
import { SavingsGoal } from '../domain/types/SavingsGoal';
import { TimelineSnapshot } from '../domain/timeline/FinancialTimeline';
import { CashFlow } from '../domain/types/CashFlow';

export interface AnalyticsSnapshot {
  readonly profile: FinancialProfile;
  readonly incomes: readonly Income[];
  readonly expenses: readonly Expense[];
  readonly budgets: readonly Budget[];
  readonly savingsGoals: readonly SavingsGoal[];
  readonly notifications: readonly any[];
  readonly timelineHistory: readonly TimelineSnapshot[];
  readonly cashFlowHistory: readonly CashFlow[];
}
