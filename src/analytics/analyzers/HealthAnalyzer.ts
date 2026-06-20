import { AnalyticsSnapshot } from '../AnalyticsSnapshot';
import { ExplainableMetric } from '../DashboardModels';
import { FinancialMath } from '../../domain/engines/FinancialMath';
import { CashFlowEngine } from '../../domain/engines/CashFlowEngine';
import { Money } from '../../domain/finance/Money';
import { Currency } from '../../domain/finance/Currency';

export interface HealthAnalysis {
  readonly overallHealthScore: number;
  readonly runwayMonths: number;
  readonly savingsScore: number;
  readonly budgetScore: number;
  readonly stabilityScore: number;
  readonly investmentReadinessScore: number;
}

export class HealthAnalyzer {
  static analyze(snapshot: AnalyticsSnapshot, currency: Currency = Currency.USD): ExplainableMetric<HealthAnalysis> {
    const timestamp = new Date();
    const profile = snapshot.profile;
    const fixedCosts = profile.rent
      .add(profile.fixedExpenses)
      .add(profile.monthlyBills)
      .add(profile.emiLoans);

    const runwayMonths = FinancialMath.calculateRunway(profile.currentSavings, fixedCosts);

    const totalInflow = profile.monthlySalary.add(profile.additionalIncome);
    const netFlow = totalInflow.subtract(fixedCosts);
    const savingsRate = CashFlowEngine.calculateSavingsRate(totalInflow, netFlow);

    let totalLimit = Money.zero(currency);
    let totalSpent = Money.zero(currency);
    for (const b of snapshot.budgets) {
      totalLimit = totalLimit.add(b.limit);
      totalSpent = totalSpent.add(b.spent);
    }
    const budgetUtilization = totalLimit.isZero()
      ? 0
      : Number((totalSpent.cents * 10000n) / totalLimit.cents) / 100;

    const savingsScore = FinancialMath.calculateSavingsScore(savingsRate);
    const budgetScore = FinancialMath.calculateBudgetAdherenceScore(budgetUtilization);
    const liquidityScore = FinancialMath.calculateLiquidityScore(runwayMonths);
    
    let growthRate = 0;
    if (profile.salaryHistory.length >= 2) {
      const start = profile.salaryHistory[0].amount;
      const end = profile.salaryHistory[profile.salaryHistory.length - 1].amount;
      const years = (profile.salaryHistory.length - 1) / 12;
      growthRate = FinancialMath.calculateCAGR(start, end, years);
    }
    const growthScore = Math.min(100, Math.max(0, Math.round(growthRate * 100)));

    const stabilityScore = FinancialMath.calculateStabilityScore(fixedCosts, totalInflow);
    const investmentReadinessScore = FinancialMath.calculateInvestmentReadinessScore(savingsRate, runwayMonths, netFlow);

    const overallHealthScore = FinancialMath.calculateOverallHealthScore({
      savingsScore,
      budgetScore,
      liquidityScore,
      netWorthGrowthScore: growthScore,
      stabilityScore
    });

    return {
      value: {
        overallHealthScore,
        runwayMonths,
        savingsScore,
        budgetScore,
        stabilityScore,
        investmentReadinessScore
      },
      confidence: 100,
      calculationMethod: "Delegation to FinancialMath score models for savings, budget, liquidity, stability, and unified health index",
      dataSources: ["profiles", "budgets"],
      timestamp
    };
  }
}
