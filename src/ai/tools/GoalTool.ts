import { AITool } from './AITool';

export class GoalTool implements AITool {
  readonly id = 'goal';
  readonly name = 'Savings Goal Milestone Tracker';

  async execute(userId: string, context: Record<string, any>): Promise<Record<string, any>> {
    return {
      savings: context.savings
    };
  }
}
