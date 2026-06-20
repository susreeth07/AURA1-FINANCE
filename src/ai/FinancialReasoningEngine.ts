export interface ReasoningSimulationResult {
  readonly isAffordable: boolean;
  readonly remainingSavings: number;
  readonly postRunwayMonths: number;
  readonly explanation: string;
}

export class FinancialReasoningEngine {
  static evaluateAffordability(
    currentSavings: number,
    monthlyExpenses: number,
    itemCost: number,
    label: string
  ): ReasoningSimulationResult {
    const expenses = monthlyExpenses <= 0 ? 1 : monthlyExpenses;
    const postSavings = currentSavings - itemCost;
    const postRunway = postSavings / expenses;
    const isAffordable = postSavings >= 0 && postRunway >= 3.0;

    return {
      isAffordable,
      remainingSavings: postSavings,
      postRunwayMonths: Number(postRunway.toFixed(2)),
      explanation: isAffordable
        ? `Deterministic calculation: The purchase of ${label} (₹${itemCost}) is affordable. Remaining runway of ${postRunway.toFixed(2)} months is above the safety threshold (3.0 months).`
        : `Deterministic calculation: The purchase of ${label} (₹${itemCost}) is not recommended. Remaining runway of ${postRunway.toFixed(2)} months falls below the safety threshold (3.0 months).`
    };
  }

  static analyzeEmergencyFund(currentSavings: number, monthlyExpenses: number): {
    readonly runwayMonths: number;
    readonly safetyStatus: 'critical' | 'warning' | 'safe';
    readonly explanation: string;
  } {
    const expenses = monthlyExpenses <= 0 ? 1 : monthlyExpenses;
    const runway = currentSavings / expenses;
    let safetyStatus: 'critical' | 'warning' | 'safe' = 'safe';
    if (runway < 1.0) {
      safetyStatus = 'critical';
    } else if (runway < 3.0) {
      safetyStatus = 'warning';
    }

    return {
      runwayMonths: Number(runway.toFixed(2)),
      safetyStatus,
      explanation: `Emergency fund of ₹${currentSavings.toLocaleString()} provides ${runway.toFixed(2)} months of coverage. Status: ${safetyStatus.toUpperCase()}.`
    };
  }
}
