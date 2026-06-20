import { FinancialProfile } from '../types/FinancialProfile';
import { Money } from '../finance/Money';
import { CashFlow } from '../types/CashFlow';

export interface RiskEvaluation {
  readonly riskScore: number;
  readonly liquidityRisk: 'low' | 'medium' | 'high';
  readonly incomeStabilityRisk: 'low' | 'medium' | 'high';
  readonly volatilityRating: 'low' | 'medium' | 'high';
  readonly details: Record<string, any>;
}

export class RiskEngine {
  static evaluateRisk(
    profile: FinancialProfile,
    cashFlowHistory: CashFlow[]
  ): RiskEvaluation {
    const fixedCosts = profile.rent
      .add(profile.fixedExpenses)
      .add(profile.monthlyBills)
      .add(profile.emiLoans);

    const income = profile.monthlySalary.add(profile.additionalIncome);

    let stabilityRisk: 'low' | 'medium' | 'high' = 'low';
    let stabilityScoreVal = 0;
    if (!income.isZero()) {
      const fixedRatio = Number((fixedCosts.cents * 100n) / income.cents);
      stabilityScoreVal = fixedRatio;
      if (fixedRatio > 60) {
        stabilityRisk = 'high';
      } else if (fixedRatio > 40) {
        stabilityRisk = 'medium';
      }
    } else {
      stabilityRisk = 'high';
      stabilityScoreVal = 100;
    }

    let liquidityRisk: 'low' | 'medium' | 'high' = 'low';
    let liquidityScoreVal = 0;
    if (fixedCosts.isZero()) {
      liquidityRisk = 'low';
    } else {
      const runwayMonths = Number((profile.currentSavings.cents * 100n) / fixedCosts.cents) / 100;
      liquidityScoreVal = Math.max(0, 100 - Math.round(runwayMonths * 16.6));
      if (runwayMonths < 1.5) {
        liquidityRisk = 'high';
      } else if (runwayMonths < 3.0) {
        liquidityRisk = 'medium';
      }
    }

    let volatilityRating: 'low' | 'medium' | 'high' = 'low';
    let volatilityScoreVal = 0;
    if (cashFlowHistory.length >= 2) {
      const outflows = cashFlowHistory.map(cf => cf.outflow.toDecimal());
      const mean = outflows.reduce((a, b) => a + b, 0) / outflows.length;
      const variance = outflows.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / outflows.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean > 0 ? stdDev / mean : 0;

      volatilityScoreVal = Math.min(100, Math.round(cv * 100));
      if (cv > 0.4) {
        volatilityRating = 'high';
      } else if (cv > 0.2) {
        volatilityRating = 'medium';
      }
    }

    const riskScore = Math.round(
      stabilityScoreVal * 0.4 +
      liquidityScoreVal * 0.4 +
      volatilityScoreVal * 0.2
    );

    return {
      riskScore,
      liquidityRisk,
      incomeStabilityRisk: stabilityRisk,
      volatilityRating,
      details: {
        fixedCosts: fixedCosts.serialize(),
        income: income.serialize(),
        stabilityScore: stabilityScoreVal,
        liquidityScore: liquidityScoreVal,
        volatilityScore: volatilityScoreVal,
      }
    };
  }
}
