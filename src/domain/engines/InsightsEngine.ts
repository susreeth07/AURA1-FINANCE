import { FinancialProfile } from '../types/FinancialProfile';
import { CashFlow } from '../types/CashFlow';
import { Budget } from '../types/Budget';
import { BudgetEngine } from './BudgetEngine';

export interface FinancialInsight {
  readonly id: string;
  readonly type: 'positive' | 'warning' | 'info';
  readonly title: string;
  readonly description: string;
  readonly metricValue?: string;
}

export class InsightsEngine {
  static generateInsights(
    profile: FinancialProfile,
    cashFlowHistory: CashFlow[],
    budgets: Budget[]
  ): FinancialInsight[] {
    const insights: FinancialInsight[] = [];

    if (cashFlowHistory.length >= 2) {
      const currentMonth = cashFlowHistory[cashFlowHistory.length - 1];
      const previousMonth = cashFlowHistory[cashFlowHistory.length - 2];
      const diff = currentMonth.savingsRate - previousMonth.savingsRate;

      if (diff > 5) {
        insights.push({
          id: 'INSIGHT_SAVINGS_IMPROVED',
          type: 'positive',
          title: 'Savings Rate Improved',
          description: `Your savings rate increased by ${diff.toFixed(1)}% compared to last month.`,
          metricValue: `${currentMonth.savingsRate.toFixed(1)}%`,
        });
      } else if (diff < -5) {
        insights.push({
          id: 'INSIGHT_SAVINGS_DECLINED',
          type: 'warning',
          title: 'Savings Rate Dropped',
          description: `Your savings rate decreased by ${Math.abs(diff).toFixed(1)}% compared to last month.`,
          metricValue: `${currentMonth.savingsRate.toFixed(1)}%`,
        });
      }
    }

    for (const budget of budgets) {
      const utilization = BudgetEngine.getBudgetUtilization(budget);
      if (utilization >= 90 && utilization <= 100) {
        insights.push({
          id: `INSIGHT_BUDGET_NEAR_EXHAUSTED_${budget.category}`,
          type: 'warning',
          title: `Budget Nearly Exhausted: ${budget.category}`,
          description: `You have spent ${utilization.toFixed(1)}% of your ${budget.category} budget limit.`,
          metricValue: `${utilization.toFixed(1)}%`,
        });
      } else if (utilization > 100) {
        insights.push({
          id: `INSIGHT_BUDGET_EXCEEDED_${budget.category}`,
          type: 'warning',
          title: `Budget Exceeded: ${budget.category}`,
          description: `You have exceeded your ${budget.category} budget limit by ${BudgetEngine.getOverspending(budget).format()}.`,
          metricValue: `${utilization.toFixed(1)}%`,
        });
      }
    }

    if (cashFlowHistory.length >= 1) {
      const latestFlow = cashFlowHistory[cashFlowHistory.length - 1];
      if (latestFlow.netFlow.isNegative()) {
        insights.push({
          id: 'INSIGHT_NEGATIVE_CASH_FLOW',
          type: 'warning',
          title: 'Negative Cash Flow',
          description: 'Your outflow exceeded your inflow this month. You are running a deficit.',
          metricValue: latestFlow.netFlow.format(),
        });
      } else if (latestFlow.savingsRate >= 20) {
        insights.push({
          id: 'INSIGHT_STRONG_SAVINGS',
          type: 'positive',
          title: 'Healthy Savings Rate',
          description: 'Great job! You saved more than 20% of your income this month.',
          metricValue: `${latestFlow.savingsRate.toFixed(1)}%`,
        });
      }
    }

    const fixedCosts = profile.rent
      .add(profile.fixedExpenses)
      .add(profile.monthlyBills)
      .add(profile.emiLoans);
    const income = profile.monthlySalary.add(profile.additionalIncome);
    if (!income.isZero()) {
      const fixedRatio = Number((fixedCosts.cents * 100n) / income.cents);
      if (fixedRatio > 50) {
        insights.push({
          id: 'INSIGHT_HIGH_FIXED_COSTS',
          type: 'warning',
          title: 'High Fixed Costs',
          description: `Fixed obligations take up ${fixedRatio}% of your total income. Consider optimizing subscriptions or bills.`,
          metricValue: `${fixedRatio}%`,
        });
      }
    }

    return insights;
  }
}
