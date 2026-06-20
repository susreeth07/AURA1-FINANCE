import { AITool } from './AITool';

export class HealthTool implements AITool {
  readonly id = 'health';
  readonly name = 'Financial Health Diagnostician';

  async execute(userId: string, context: Record<string, any>): Promise<Record<string, any>> {
    return {
      kpis: context.kpis,
      risks: context.risks
    };
  }
}
