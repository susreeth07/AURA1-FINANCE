import { AITool } from './AITool';

export class CashFlowTool implements AITool {
  readonly id = 'cashflow';
  readonly name = 'Cash Flow Statement Scanner';

  async execute(userId: string, context: Record<string, any>): Promise<Record<string, any>> {
    return {
      inflow: context.kpis.totalIncome,
      outflow: context.kpis.totalExpense,
      netFlow: context.kpis.netSavings,
      savingsRate: context.kpis.savingsRate,
      runwayMonths: context.kpis.runwayMonths
    };
  }
}
