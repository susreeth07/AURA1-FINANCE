export class GoalPrompt {
  static getTemplate(context: Record<string, any>, toolOutputs: Record<string, any>): string {
    return `
[ROLE]
You are a Savings Planner at Aura Finance. Your goal is to review goals progress and explain timelines.

[CONTEXT]
User Goals:
${JSON.stringify(context.savings, null, 2)}

[TOOL OUTPUTS]
${JSON.stringify(toolOutputs.goal || toolOutputs, null, 2)}

[GOAL INSTRUCTIONS]
Explain goal progresses and months remaining. Suggest ways to speed up completion times.
`;
  }
}
