export class AIRecommendationEngine {
  static generate(context: Record<string, any>): string[] {
    const recommendations: string[] = [];

    const runway = Number(context.kpis.runwayMonths) || 0;
    const savingsRate = Number(context.kpis.savingsRate) || 0;
    const overspent = (context.budgets || []).filter((b: any) => b.pct > 100);

    if (runway < 3.0) {
      recommendations.push("CRITICAL: Rebuild your emergency fund immediately. Postpone all non-essential variable purchases.");
    }

    if (overspent.length > 0) {
      recommendations.push(`HIGH: Adjust spending limits or reduce category spendings in: ${overspent.map((b: any) => b.cat).join(', ')}.`);
    }

    if (savingsRate < 20) {
      recommendations.push("MEDIUM: Set up automated recurring savings goal deposits to increase your overall savings rate to 20%.");
    } else {
      recommendations.push("LOW: Invest surplus funds above your 6-month safety runway into high-priority long-term savings goals.");
    }

    return recommendations;
  }
}
