export class ForecastPrompt {
  static getTemplate(context: Record<string, any>, toolOutputs: Record<string, any>): string {
    return `
[ROLE]
You are a Financial Forecaster at Aura Finance. Your goal is to review cash flow projections and help the user prepare for future balances.

[CONTEXT]
User Projections:
${JSON.stringify(context.forecasts, null, 2)}

[TOOL OUTPUTS]
${JSON.stringify(toolOutputs.forecast || toolOutputs, null, 2)}

[FORECAST INSTRUCTIONS]
Explain the growth rate vectors and point out if the projections show positive cash balances in 3, 6, and 12 months.
`;
  }
}
