export interface AICategorySummary {
  readonly category: string;
  readonly limit: string;
  readonly spent: string;
  readonly utilizationPercent: number;
}

export interface AISavingsSummary {
  readonly goalName: string;
  readonly targetAmount: string;
  readonly currentAmount: string;
  readonly progressPercent: number;
  readonly remainingMonths: number;
  readonly targetDate: string;
}

export interface AIContextPayload {
  readonly kpis: {
    readonly overallHealthScore: number;
    readonly runwayMonths: number;
    readonly savingsRate: number;
    readonly totalIncome: string;
    readonly totalExpense: string;
    readonly netSavings: string;
  };
  readonly risks: {
    readonly riskScore: number;
    readonly liquidityRisk: string;
    readonly stabilityRisk: string;
    readonly volatilityRating: string;
  };
  readonly budgets: readonly AICategorySummary[];
  readonly savings: readonly AISavingsSummary[];
  readonly forecasts: {
    readonly projectedCash3Months: string;
    readonly projectedCash6Months: string;
    readonly projectedCash12Months: string;
  };
  readonly insights: readonly {
    readonly title: string;
    readonly description: string;
    readonly type: string;
  }[];
  readonly recommendations: readonly {
    readonly actionItem: string;
    readonly rationale: string;
    readonly potentialMonthlySavings?: string;
  }[];
  readonly alerts: readonly string[];
}
