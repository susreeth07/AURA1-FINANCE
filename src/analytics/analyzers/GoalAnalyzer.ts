import { AnalyticsSnapshot } from '../AnalyticsSnapshot';
import { ExplainableMetric } from '../DashboardModels';
import { SavingsEngine } from '../../domain/engines/SavingsEngine';
import { Money } from '../../domain/finance/Money';
import { Currency } from '../../domain/finance/Currency';

export interface GoalAnalysisEntry {
  readonly name: string;
  readonly targetAmount: string;
  readonly currentAmount: string;
  readonly progressPercent: number;
  readonly remainingAmount: string;
  readonly requiredMonthlySavings: string;
  readonly projectedCompletionDate: string;
  readonly isCompleted: boolean;
  readonly isDelayed: boolean;
}

export interface GoalAnalysis {
  readonly entries: readonly GoalAnalysisEntry[];
  readonly completedCount: number;
  readonly delayedCount: number;
  readonly totalRemainingToSave: string;
}

export class GoalAnalyzer {
  static analyze(
    snapshot: AnalyticsSnapshot,
    monthlyContribution: Money = Money.fromDecimal(500.00),
    currency: Currency = Currency.USD
  ): ExplainableMetric<GoalAnalysis> {
    const timestamp = new Date();
    const currentDate = new Date();

    let completedCount = 0;
    let delayedCount = 0;
    let totalRemaining = Money.zero(currency);

    const entries: GoalAnalysisEntry[] = snapshot.savingsGoals.map((g) => {
      const progressPercent = SavingsEngine.getGoalProgressPercentage(g);
      const remaining = SavingsEngine.getRemainingAmount(g);
      const requiredMonthly = SavingsEngine.calculateRequiredMonthlySavings(g, currentDate);
      const projectedCompletion = SavingsEngine.calculateProjectedCompletionDate(g, monthlyContribution, currentDate);

      totalRemaining = totalRemaining.add(remaining);

      const isCompleted = g.currentAmount.greaterThanOrEqual(g.targetAmount);
      const isDelayed = !isCompleted && g.targetDate.getTime() < currentDate.getTime();

      if (isCompleted) completedCount++;
      if (isDelayed) delayedCount++;

      return {
        name: g.name,
        targetAmount: g.targetAmount.format(),
        currentAmount: g.currentAmount.format(),
        progressPercent,
        remainingAmount: remaining.format(),
        requiredMonthlySavings: requiredMonthly.format(),
        projectedCompletionDate: projectedCompletion.toISOString().slice(0, 10),
        isCompleted,
        isDelayed
      };
    });

    return {
      value: {
        entries,
        completedCount,
        delayedCount,
        totalRemainingToSave: totalRemaining.format()
      },
      confidence: snapshot.savingsGoals.length > 0 ? 100 : 50,
      calculationMethod: "Delegation to SavingsEngine for progress, required savings, and projected completion dates",
      dataSources: ["savingsGoals"],
      timestamp
    };
  }
}
