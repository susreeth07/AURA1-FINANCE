import { FinancialProfile } from '../types/FinancialProfile';
import { CashFlow } from '../types/CashFlow';
import { Budget } from '../types/Budget';
import { Money } from '../finance/Money';
import { BudgetEngine } from './BudgetEngine';

export interface FinancialRecommendation {
  readonly id: string;
  readonly type: 'savings' | 'budgeting' | 'discretionary' | 'general';
  readonly actionItem: string;
  readonly rationale: string;
  readonly potentialMonthlySavings?: string;
}

export class RecommendationEngine {
  static generateRecommendations(
    profile: FinancialProfile,
    cashFlowHistory: CashFlow[],
    budgets: Budget[]
  ): FinancialRecommendation[] {
    const recommendations: FinancialRecommendation[] = [];

    const fixedCosts = profile.rent
      .add(profile.fixedExpenses)
      .add(profile.monthlyBills)
      .add(profile.emiLoans);
    if (!fixedCosts.isZero()) {
      const runwayMonths = Number((profile.currentSavings.cents * 100n) / fixedCosts.cents) / 100;
      if (runwayMonths < 3.0) {
        const potential = profile.monthlySalary.percentage(10);
        recommendations.push({
          id: 'REC_BUILD_EMERGENCY_FUND',
          type: 'savings',
          actionItem: 'Improve emergency fund',
          rationale: `Your emergency fund currently covers only ${runwayMonths.toFixed(1)} months of fixed obligations. Target at least 3-6 months.`,
          potentialMonthlySavings: potential.format(),
        });
      }
    }

    for (const budget of budgets) {
      const utilization = BudgetEngine.getBudgetUtilization(budget);
      if (utilization > 100) {
        const overspent = BudgetEngine.getOverspending(budget);
        recommendations.push({
          id: `REC_REDUCE_${budget.category.toUpperCase()}_SPENDING`,
          type: 'budgeting',
          actionItem: `Reduce ${budget.category} spending`,
          rationale: `You overspent your ${budget.category} budget by ${overspent.format()} this month.`,
          potentialMonthlySavings: overspent.format(),
        });
      }
    }

    if (cashFlowHistory.length >= 1) {
      const latestFlow = cashFlowHistory[cashFlowHistory.length - 1];
      if (latestFlow.netFlow.isNegative()) {
        const potential = latestFlow.outflow.percentage(15);
        recommendations.push({
          id: 'REC_DELAY_DISCRETIONARY',
          type: 'discretionary',
          actionItem: 'Delay discretionary purchases',
          rationale: 'Your expenses exceeded your income this month. Postpone non-essential buying to stabilize cash flow.',
          potentialMonthlySavings: potential.format(),
        });
      }
    }

    if (cashFlowHistory.length >= 1) {
      const latestFlow = cashFlowHistory[cashFlowHistory.length - 1];
      if (latestFlow.savingsRate < 10) {
        const increaseGoal = latestFlow.inflow.percentage(10).subtract(
          latestFlow.netFlow.isPositive() ? latestFlow.netFlow : Money.zero(latestFlow.inflow.getCurrency())
        );
        recommendations.push({
          id: 'REC_INCREASE_SAVINGS_RATE',
          type: 'savings',
          actionItem: 'Increase monthly savings contribution',
          rationale: `Your current savings rate is ${latestFlow.savingsRate.toFixed(1)}%, which is below the recommended 10-20% standard.`,
          potentialMonthlySavings: increaseGoal.isPositive() ? increaseGoal.format() : undefined,
        });
      }
    }

    const totalIncome = profile.monthlySalary.add(profile.additionalIncome);
    if (!totalIncome.isZero()) {
      const emiRatio = Number((profile.emiLoans.cents * 100n) / totalIncome.cents);
      if (emiRatio > 35) {
        recommendations.push({
          id: 'REC_DEBT_REDUCTION',
          type: 'general',
          actionItem: 'Consolidate or pay down high-interest debt',
          rationale: `Debt EMIs consume ${emiRatio}% of your total income. A ratio higher than 35% puts strain on your monthly liquidity.`,
        });
      }
    }

    return recommendations;
  }
}
