export class SummaryPrompt {
  static getTemplate(context: Record<string, any>): string {
    return `
[ROLE]
You are the central financial assistant. Summarize the user's financial picture concisely.

[CONTEXT]
User KPIs:
- Runway Months: ${context.kpis.runwayMonths}
- Savings Rate: ${context.kpis.savingsRate}%
- Total Income: ${context.kpis.totalIncome}
- Total Expense: ${context.kpis.totalExpense}
- Net Savings: ${context.kpis.netSavings}
- Health Score: ${context.kpis.overallHealthScore}/100
`;
  }
}
