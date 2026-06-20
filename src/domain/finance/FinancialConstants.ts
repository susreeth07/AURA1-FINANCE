export const FinancialConstants = {
  // Emergency Fund Constants
  EMERGENCY_FUND_RECOMMENDED_MONTHS: 6, // 6 months of expenses
  EMERGENCY_FUND_MINIMUM_MONTHS: 3,     // 3 months of expenses

  // 50/30/20 Budget Guidelines
  BUDGET_GUIDELINE_NEEDS_PERCENT: 50.0,
  BUDGET_GUIDELINE_WANTS_PERCENT: 30.0,
  BUDGET_GUIDELINE_SAVINGS_PERCENT: 20.0,

  // Financial Health Score Weights (must sum to 100)
  HEALTH_WEIGHT_SAVINGS_RATE: 25,
  HEALTH_WEIGHT_BUDGET_ADHERENCE: 25,
  HEALTH_WEIGHT_LIQUIDITY_RUNWAY: 20,
  HEALTH_WEIGHT_NET_WORTH_GROWTH: 15,
  HEALTH_WEIGHT_RISK_RATING: 15,

  // Inflation Assumption (annual rate, e.g. 3%)
  ANNUAL_INFLATION_RATE: 0.03,

  // Risk volatility thresholds
  RISK_THRESHOLD_VOLATILITY_HIGH: 0.40,
  RISK_THRESHOLD_LIQUIDITY_MIN: 1.5,

  // Default budget alert threshold percentage
  DEFAULT_BUDGET_ALERT_THRESHOLD: 80.0,
};
