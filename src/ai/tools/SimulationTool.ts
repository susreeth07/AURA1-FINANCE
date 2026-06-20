import { AITool } from './AITool';

export class SimulationTool implements AITool {
  readonly id = 'simulation';
  readonly name = 'Savings & Affordability Simulator';

  async execute(userId: string, context: Record<string, any>, inputs?: Record<string, any>): Promise<Record<string, any>> {
    // Determine target simulation amount (default to ₹10,000 for Macbook simulation)
    const amount = Number(inputs?.amount) || 10000;
    const label = inputs?.label || 'Purchase';

    // Parse current stats
    const currentSavingsStr = context.kpis.currentSavings || '₹0';
    const currentSavingsNum = Number(currentSavingsStr.replace(/[^0-9.-]+/g, "")) || 0;
    const monthlyExpenseStr = context.kpis.totalExpense || '₹0';
    const monthlyExpenseNum = Number(monthlyExpenseStr.replace(/[^0-9.-]+/g, "")) || 1; // Avoid divide-by-zero

    const postSavings = currentSavingsNum - amount;
    const postRunway = postSavings / monthlyExpenseNum;
    const isAffordable = postSavings >= 0 && postRunway >= 3.0; // Safe threshold of 3 months runway

    return {
      simulationInput: { amount, label },
      currentSavings: currentSavingsNum,
      postSavings,
      currentRunway: context.kpis.runwayMonths,
      postRunway: Number(postRunway.toFixed(2)),
      safeThresholdMonths: 3.0,
      isAffordable,
      explanation: isAffordable
        ? `Yes, you can afford to buy a ${label} (₹${amount}). Your remaining savings would be ₹${postSavings.toLocaleString()} and your runway would remain safe at ${postRunway.toFixed(2)} months.`
        : `No, buying a ${label} (₹${amount}) is not recommended right now. Your remaining runway would drop to ${postRunway.toFixed(2)} months, which is below the safe limit of 3.0 months.`
    };
  }
}
