export class ConfidenceEngine {
  static evaluate(context: Record<string, any>): { level: 'High' | 'Medium' | 'Low'; score: number } {
    let score = 1.0;

    // Check data completeness
    const runway = Number(context?.kpis?.runwayMonths) || 0;
    const savings = Number(context?.kpis?.savingsRate) || 0;

    if (runway === 0) {
      score -= 0.2; // Missing runway context
    }

    if (savings === 0) {
      score -= 0.1; // Missing savings rate
    }

    // Check volatility risk
    if (context?.risks?.volatilityRating === 'high') {
      score -= 0.15; // High volatility lowers forecast confidence
    }

    // Check budgets coverage
    if (!context?.budgets || context.budgets.length === 0) {
      score -= 0.1; // Lack of budgets
    }

    score = Math.max(0.1, Number(score.toFixed(2)));

    let level: 'High' | 'Medium' | 'Low' = 'High';
    if (score < 0.5) {
      level = 'Low';
    } else if (score < 0.8) {
      level = 'Medium';
    }

    return {
      level,
      score
    };
  }
}
