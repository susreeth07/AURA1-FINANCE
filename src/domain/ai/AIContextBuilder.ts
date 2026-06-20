import { KPIReport } from '../kpis/FinancialKPIs';
import { RiskEvaluation } from '../engines/RiskEngine';
import { FinancialInsight } from '../engines/InsightsEngine';
import { FinancialRecommendation } from '../engines/RecommendationEngine';
import { Forecast } from '../types/Forecast';
import { SavingsGoal } from '../types/SavingsGoal';
import { SavingsEngine } from '../engines/SavingsEngine';
import { Income } from '../types/Income';
import { Expense } from '../types/Expense';

export class AIContextBuilder {
  static buildContext({
    kpis,
    risks,
    insights,
    recommendations,
    forecast,
    goals,
    recentIncomes,
    recentExpenses,
  }: {
    kpis: KPIReport;
    risks: RiskEvaluation;
    insights: FinancialInsight[];
    recommendations: FinancialRecommendation[];
    forecast?: Forecast;
    goals: SavingsGoal[];
    recentIncomes: Income[];
    recentExpenses: Expense[];
  }): string {
    const context = {
      kpis: {
        savingsRate: `${kpis.savingsRate.toFixed(1)}%`,
        expenseRatio: `${kpis.expenseRatio.toFixed(1)}%`,
        monthlyBurnRate: kpis.monthlyBurnRate.format(),
        netCashFlow: kpis.netCashFlow.format(),
        averageBudgetUtilization: `${kpis.averageBudgetUtilization.toFixed(1)}%`,
        runwayMonths: kpis.runwayMonths,
        healthScore: kpis.healthScore,
      },
      risks: {
        riskScore: risks.riskScore,
        liquidityRisk: risks.liquidityRisk,
        stabilityRisk: risks.incomeStabilityRisk,
        volatilityRating: risks.volatilityRating,
      },
      insights: insights.map(i => ({
        type: i.type,
        title: i.title,
        description: i.description,
      })),
      recommendations: recommendations.map(r => ({
        type: r.type,
        actionItem: r.actionItem,
        rationale: r.rationale,
        potentialMonthlySavings: r.potentialMonthlySavings,
      })),
      forecast: forecast ? {
        strategy: forecast.strategy,
        projections: forecast.projections.map(p => ({
          date: p.date.toISOString().slice(0, 10),
          amount: p.amount.format(),
        })),
      } : undefined,
      goals: goals.map(g => ({
        name: g.name,
        targetAmount: g.targetAmount.format(),
        currentAmount: g.currentAmount.format(),
        progressPercent: SavingsEngine.getGoalProgressPercentage(g),
        remainingMonths: SavingsEngine.getRemainingMonths(g),
      })),
      recentActivity: [
        ...recentIncomes.map(i => ({
          type: 'income' as const,
          description: i.source,
          amount: i.amount.format(),
          date: i.date.toISOString().slice(0, 10),
        })),
        ...recentExpenses.map(e => ({
          type: 'expense' as const,
          description: e.merchant,
          amount: e.amount.format(),
          date: e.date.toISOString().slice(0, 10),
        })),
      ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    };

    return JSON.stringify(context, null, 2);
  }
}
