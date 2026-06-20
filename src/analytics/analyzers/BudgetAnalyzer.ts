import { AnalyticsSnapshot } from '../AnalyticsSnapshot';
import { ExplainableMetric } from '../DashboardModels';
import { BudgetEngine } from '../../domain/engines/BudgetEngine';
import { Money } from '../../domain/finance/Money';
import { Currency } from '../../domain/finance/Currency';

export interface BudgetAnalysisEntry {
  readonly category: string;
  readonly limit: string;
  readonly spent: string;
  readonly remaining: string;
  readonly utilizationPercent: number;
  readonly overspending: string;
  readonly efficiencyRatio: number;
  readonly isOverspent: boolean;
}

export interface BudgetAnalysis {
  readonly entries: readonly BudgetAnalysisEntry[];
  readonly totalLimit: string;
  readonly totalSpent: string;
  readonly overallUtilization: number;
  readonly totalOverspending: string;
}

export class BudgetAnalyzer {
  static analyze(snapshot: AnalyticsSnapshot, currency: Currency = Currency.USD): ExplainableMetric<BudgetAnalysis> {
    const timestamp = new Date();

    let totalLimit = Money.zero(currency);
    let totalSpent = Money.zero(currency);
    let totalOverspending = Money.zero(currency);

    const entries: BudgetAnalysisEntry[] = snapshot.budgets.map((b) => {
      totalLimit = totalLimit.add(b.limit);
      totalSpent = totalSpent.add(b.spent);

      const remaining = BudgetEngine.getRemainingBudget(b);
      const utilizationPercent = BudgetEngine.getBudgetUtilization(b);
      const overspending = BudgetEngine.getOverspending(b);
      
      if (overspending.isPositive()) {
        totalOverspending = totalOverspending.add(overspending);
      }

      const spentNum = b.spent.toDecimal();
      const limitNum = b.limit.toDecimal();
      const efficiencyRatio = limitNum > 0 ? Math.min(100, (spentNum / limitNum) * 100) : 0;

      return {
        category: b.category,
        limit: b.limit.format(),
        spent: b.spent.format(),
        remaining: remaining.format(),
        utilizationPercent,
        overspending: overspending.format(),
        efficiencyRatio,
        isOverspent: b.spent.greaterThan(b.limit)
      };
    });

    const overallUtilization = totalLimit.isZero()
      ? 0
      : Number((totalSpent.cents * 10000n) / totalLimit.cents) / 100;

    return {
      value: {
        entries,
        totalLimit: totalLimit.format(),
        totalSpent: totalSpent.format(),
        overallUtilization,
        totalOverspending: totalOverspending.format()
      },
      confidence: snapshot.budgets.length > 0 ? 100 : 50,
      calculationMethod: "Delegation to BudgetEngine for remaining, utilization, and overspent amounts per budget category",
      dataSources: ["budgets"],
      timestamp
    };
  }
}
