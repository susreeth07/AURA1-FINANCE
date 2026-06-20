import { AnalyticsRepository } from './AnalyticsRepository';
import { AnalyticsSnapshot } from './AnalyticsSnapshot';
import { analyticsCache } from './AnalyticsCache';
import { DashboardPayload } from './DashboardModels';
import { AIContextPayload } from './AnalyticsContext';
import { TrendAnalyzer } from './analyzers/TrendAnalyzer';
import { IncomeAnalyzer } from './analyzers/IncomeAnalyzer';
import { SpendingAnalyzer } from './analyzers/SpendingAnalyzer';
import { BudgetAnalyzer } from './analyzers/BudgetAnalyzer';
import { GoalAnalyzer } from './analyzers/GoalAnalyzer';
import { HealthAnalyzer } from './analyzers/HealthAnalyzer';
import { ForecastAnalyzer } from './analyzers/ForecastAnalyzer';
import { InsightsAggregator } from './aggregators/InsightsAggregator';
import { RecommendationAggregator } from './aggregators/RecommendationAggregator';
import { Money } from '../domain/finance/Money';
import { Currency } from '../domain/finance/Currency';
import { logger } from '../utils/logger';

export class AnalyticsPipeline {
  static async run(userId: string, forceRefresh = false): Promise<{ dashboard: DashboardPayload; aiContext: AIContextPayload }> {
    const currency = Currency.USD;

    if (!forceRefresh) {
      const cached = await analyticsCache.get(userId);
      if (cached) {
        logger.info(`[AnalyticsPipeline] Returning cached models for user: ${userId}`);
        return cached;
      }
    }

    logger.info(`[AnalyticsPipeline] Starting pipeline execution for user: ${userId}`);

    const snapshot = await AnalyticsRepository.loadSnapshot(userId);
    this.validateSnapshot(snapshot);

    const [
      trendMetric,
      incomeMetric,
      spendingMetric,
      budgetMetric,
      goalMetric,
      healthMetric,
      forecastMetric
    ] = await Promise.all([
      Promise.resolve(TrendAnalyzer.analyze(snapshot, currency)),
      Promise.resolve(IncomeAnalyzer.analyze(snapshot, currency)),
      Promise.resolve(SpendingAnalyzer.analyze(snapshot, currency)),
      Promise.resolve(BudgetAnalyzer.analyze(snapshot, currency)),
      Promise.resolve(GoalAnalyzer.analyze(snapshot, Money.fromDecimal(500.0), currency)),
      Promise.resolve(HealthAnalyzer.analyze(snapshot, currency)),
      Promise.resolve(ForecastAnalyzer.analyze(snapshot, currency))
    ]);

    const insights = InsightsAggregator.aggregate(snapshot, currency);
    const recommendations = RecommendationAggregator.aggregate(snapshot, currency);

    const overallSpent = spendingMetric.value.totalSpending;
    const monthlySalaryFormatted = snapshot.profile.monthlySalary.add(snapshot.profile.additionalIncome).format();
    const netSavingsFormatted = snapshot.profile.monthlySalary.add(snapshot.profile.additionalIncome).subtract(
      snapshot.profile.rent.add(snapshot.profile.fixedExpenses).add(snapshot.profile.monthlyBills).add(snapshot.profile.emiLoans)
    ).format();

    const overspentCategories = budgetMetric.value.entries
      .filter((entry) => entry.isOverspent)
      .map((entry) => entry.category);

    const emergencyFundLow = healthMetric.value.runwayMonths < 3.0;
    const goalsDelayedCount = goalMetric.value.delayedCount;

    const recentActivity = [
      ...snapshot.incomes.map((i) => ({
        id: i.id,
        type: 'income' as const,
        title: `Income: ${i.source}`,
        amount: i.amount.format(),
        date: i.date.toISOString().slice(0, 10)
      })),
      ...snapshot.expenses.map((e) => ({
        id: e.id,
        type: 'expense' as const,
        title: `Expense: ${e.merchant}`,
        amount: e.amount.format(),
        date: e.date.toISOString().slice(0, 10)
      }))
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

    const dashboard: DashboardPayload = {
      summary: {
        currentBalance: {
          value: snapshot.profile.currentSavings.format(),
          confidence: 100,
          calculationMethod: "Direct database retrieval of current profile savings balance",
          dataSources: ["profiles"],
          timestamp: new Date()
        },
        monthlyInflow: {
          value: monthlySalaryFormatted,
          confidence: 100,
          calculationMethod: "Profile base salary plus additional income",
          dataSources: ["profiles"],
          timestamp: new Date()
        },
        monthlyOutflow: {
          value: overallSpent,
          confidence: spendingMetric.confidence,
          calculationMethod: spendingMetric.calculationMethod,
          dataSources: spendingMetric.dataSources,
          timestamp: spendingMetric.timestamp
        },
        netSavings: {
          value: netSavingsFormatted,
          confidence: 100,
          calculationMethod: "Profile total income minus total fixed expenses",
          dataSources: ["profiles"],
          timestamp: new Date()
        }
      },
      cards: {
        runwayMonths: {
          value: healthMetric.value.runwayMonths,
          confidence: healthMetric.confidence,
          calculationMethod: healthMetric.calculationMethod,
          dataSources: healthMetric.dataSources,
          timestamp: healthMetric.timestamp
        },
        savingsRate: {
          value: healthMetric.value.savingsScore,
          confidence: healthMetric.confidence,
          calculationMethod: healthMetric.calculationMethod,
          dataSources: healthMetric.dataSources,
          timestamp: healthMetric.timestamp
        },
        budgetUtilization: {
          value: budgetMetric.value.overallUtilization,
          confidence: budgetMetric.confidence,
          calculationMethod: budgetMetric.calculationMethod,
          dataSources: budgetMetric.dataSources,
          timestamp: budgetMetric.timestamp
        },
        overallHealthScore: {
          value: healthMetric.value.overallHealthScore,
          confidence: healthMetric.confidence,
          calculationMethod: healthMetric.calculationMethod,
          dataSources: healthMetric.dataSources,
          timestamp: healthMetric.timestamp
        }
      },
      charts: {
        cashFlowTrend: {
          value: {
            labels: trendMetric.value.labels,
            inflows: trendMetric.value.inflows,
            outflows: trendMetric.value.outflows
          },
          confidence: trendMetric.confidence,
          calculationMethod: trendMetric.calculationMethod,
          dataSources: trendMetric.dataSources,
          timestamp: trendMetric.timestamp
        },
        categorySpending: {
          value: {
            labels: spendingMetric.value.categories.map((c) => c.name),
            values: spendingMetric.value.categories.map((c) => c.amount)
          },
          confidence: spendingMetric.confidence,
          calculationMethod: spendingMetric.calculationMethod,
          dataSources: spendingMetric.dataSources,
          timestamp: spendingMetric.timestamp
        },
        budgetAdherence: {
          value: {
            labels: budgetMetric.value.entries.map((b) => b.category),
            limits: budgetMetric.value.entries.map((b) => Number(b.limit.replace(/[^0-9.-]+/g, "")) || 0),
            spent: budgetMetric.value.entries.map((b) => Number(b.spent.replace(/[^0-9.-]+/g, "")) || 0)
          },
          confidence: budgetMetric.confidence,
          calculationMethod: budgetMetric.calculationMethod,
          dataSources: budgetMetric.dataSources,
          timestamp: budgetMetric.timestamp
        },
        savingsGoalMilestones: {
          value: {
            labels: goalMetric.value.entries.map((g) => g.name),
            targets: goalMetric.value.entries.map((g) => Number(g.targetAmount.replace(/[^0-9.-]+/g, "")) || 0),
            currents: goalMetric.value.entries.map((g) => Number(g.currentAmount.replace(/[^0-9.-]+/g, "")) || 0)
          },
          confidence: goalMetric.confidence,
          calculationMethod: goalMetric.calculationMethod,
          dataSources: goalMetric.dataSources,
          timestamp: goalMetric.timestamp
        }
      },
      alerts: {
        overspentCategories,
        emergencyFundLow,
        goalsDelayedCount
      },
      insights,
      recommendations,
      forecast: forecastMetric.value,
      recentActivity
    };

    const aiContext: AIContextPayload = {
      kpis: {
        overallHealthScore: healthMetric.value.overallHealthScore,
        runwayMonths: healthMetric.value.runwayMonths,
        savingsRate: healthMetric.value.savingsScore,
        totalIncome: monthlySalaryFormatted,
        totalExpense: overallSpent,
        netSavings: netSavingsFormatted
      },
      risks: {
        riskScore: healthMetric.value.overallHealthScore > 80 ? 10 : (healthMetric.value.overallHealthScore > 50 ? 40 : 80),
        liquidityRisk: emergencyFundLow ? 'high' : 'low',
        stabilityRisk: healthMetric.value.stabilityScore > 75 ? 'low' : 'medium',
        volatilityRating: trendMetric.value.growthRates.some((r) => Math.abs(r) > 40) ? 'high' : 'low'
      },
      budgets: budgetMetric.value.entries.map((b) => ({
        category: b.category,
        limit: b.limit,
        spent: b.spent,
        utilizationPercent: b.utilizationPercent
      })),
      savings: goalMetric.value.entries.map((g) => ({
        goalName: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        progressPercent: g.progressPercent,
        remainingMonths: Number(g.requiredMonthlySavings.replace(/[^0-9.-]+/g, "")) > 0 
          ? Math.ceil(Number(g.remainingAmount.replace(/[^0-9.-]+/g, "")) / (Number(g.requiredMonthlySavings.replace(/[^0-9.-]+/g, "")) || 1)) 
          : 0,
        targetDate: g.projectedCompletionDate
      })),
      forecasts: {
        projectedCash3Months: forecastMetric.value.cash3Months,
        projectedCash6Months: forecastMetric.value.cash6Months,
        projectedCash12Months: forecastMetric.value.cash12Months
      },
      insights: insights.map((i) => ({
        title: i.title,
        description: i.description,
        type: i.type
      })),
      recommendations: recommendations.map((r) => ({
        actionItem: r.actionItem,
        rationale: r.rationale,
        potentialMonthlySavings: r.potentialMonthlySavings
      })),
      alerts: overspentCategories.map((cat) => `Exceeded budget limit in ${cat}`)
    };

    const pipelineResult = { dashboard, aiContext };
    await analyticsCache.set(userId, pipelineResult);
    return pipelineResult;
  }

  private static validateSnapshot(snapshot: AnalyticsSnapshot) {
    if (!snapshot.profile.email) {
      throw new Error("[AnalyticsPipeline] Snapshot validation failed: user profile email is missing");
    }
  }
}
