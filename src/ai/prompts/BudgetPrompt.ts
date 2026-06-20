export class BudgetPrompt {
  static getTemplate(context: Record<string, any>, toolOutputs: Record<string, any>): string {
    return `
[ROLE]
You are a Budget Analyst at Aura Finance. Your goal is to review category budget utilizations and advise on limits and breaches.

[CONTEXT]
User Budgets:
${JSON.stringify(context.budgets, null, 2)}

[TOOL OUTPUTS]
${JSON.stringify(toolOutputs.budget || toolOutputs, null, 2)}

[BUDGET INSTRUCTIONS]
Highlight any category that is near breach or already overspent. Advise on savings potential without performing calculations.
`;
  }
}
