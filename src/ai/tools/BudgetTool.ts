import { AITool } from './AITool';

export class BudgetTool implements AITool {
  readonly id = 'budget';
  readonly name = 'Budget Adherence Monitor';

  async execute(userId: string, context: Record<string, any>): Promise<Record<string, any>> {
    return {
      budgets: context.budgets,
      alerts: context.alerts
    };
  }
}
