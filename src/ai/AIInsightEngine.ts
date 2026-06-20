export class AIInsightEngine {
  static generate(context: Record<string, any>): string[] {
    const insights: string[] = [];

    // Parse values
    const runway = Number(context.kpis.runwayMonths) || 0;
    const savingsRate = Number(context.kpis.savingsRate) || 0;

    // 1. Emergency runway insights
    insights.push(`Your emergency fund covers ${runway.toFixed(1)} months of fixed expenses.`);

    // 2. Savings rate insights
    if (savingsRate > 20) {
      insights.push(`You have a healthy savings rate of ${savingsRate.toFixed(1)}%.`);
    } else {
      insights.push(`Your savings rate is ${savingsRate.toFixed(1)}%, which is below the recommended 20% limit.`);
    }

    // 3. Budgets check
    const overspent = (context.budgets || []).filter((b: any) => b.pct > 100);
    if (overspent.length > 0) {
      insights.push(`You have exceeded budgets in ${overspent.length} categories.`);
    } else {
      insights.push(`All category spendings are within allocated budget limits.`);
    }

    return insights;
  }
}
