export interface ExplainableMetric<T> {
  readonly value: T;
  readonly confidence: number;
  readonly calculationMethod: string;
  readonly dataSources: readonly string[];
  readonly timestamp: Date;
}

export interface DashboardSummary {
  readonly currentBalance: ExplainableMetric<string>;
  readonly monthlyInflow: ExplainableMetric<string>;
  readonly monthlyOutflow: ExplainableMetric<string>;
  readonly netSavings: ExplainableMetric<string>;
}

export interface DashboardCards {
  readonly runwayMonths: ExplainableMetric<number>;
  readonly savingsRate: ExplainableMetric<number>;
  readonly budgetUtilization: ExplainableMetric<number>;
  readonly overallHealthScore: ExplainableMetric<number>;
}

export interface DashboardCharts {
  readonly cashFlowTrend: ExplainableMetric<{
    readonly labels: readonly string[];
    readonly inflows: readonly number[];
    readonly outflows: readonly number[];
  }>;
  readonly categorySpending: ExplainableMetric<{
    readonly labels: readonly string[];
    readonly values: readonly number[];
  }>;
  readonly budgetAdherence: ExplainableMetric<{
    readonly labels: readonly string[];
    readonly limits: readonly number[];
    readonly spent: readonly number[];
  }>;
  readonly savingsGoalMilestones: ExplainableMetric<{
    readonly labels: readonly string[];
    readonly targets: readonly number[];
    readonly currents: readonly number[];
  }>;
}

export interface DashboardAlerts {
  readonly overspentCategories: readonly string[];
  readonly emergencyFundLow: boolean;
  readonly goalsDelayedCount: number;
}

export interface DashboardPayload {
  readonly summary: DashboardSummary;
  readonly cards: DashboardCards;
  readonly charts: DashboardCharts;
  readonly alerts: DashboardAlerts;
  readonly insights: readonly {
    readonly id: string;
    readonly type: 'positive' | 'warning' | 'info';
    readonly title: string;
    readonly description: string;
    readonly metricValue?: string;
  }[];
  readonly recommendations: readonly {
    readonly id: string;
    readonly type: 'savings' | 'budgeting' | 'discretionary' | 'general';
    readonly actionItem: string;
    readonly rationale: string;
    readonly potentialMonthlySavings?: string;
  }[];
  readonly forecast: {
    readonly cash3Months: string;
    readonly cash6Months: string;
    readonly cash12Months: string;
  };
  readonly recentActivity: readonly {
    readonly id: string;
    readonly type: 'income' | 'expense';
    readonly title: string;
    readonly amount: string;
    readonly date: string;
  }[];
}
