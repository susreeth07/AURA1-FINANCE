import { AITool } from './AITool';

export class TrendTool implements AITool {
  readonly id = 'trend';
  readonly name = 'Historical Cash Flow Trend Analyzer';

  async execute(userId: string, context: Record<string, any>): Promise<Record<string, any>> {
    return {
      trends: context.trends
    };
  }
}
