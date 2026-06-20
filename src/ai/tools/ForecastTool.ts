import { AITool } from './AITool';

export class ForecastTool implements AITool {
  readonly id = 'forecast';
  readonly name = 'Cash Flow Forecast Projection Engine';

  async execute(userId: string, context: Record<string, any>): Promise<Record<string, any>> {
    return {
      forecasts: context.forecasts
    };
  }
}
