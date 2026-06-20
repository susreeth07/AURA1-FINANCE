import { Money } from '../finance/Money';
import { FinancialConstants } from '../finance/FinancialConstants';

export class FinancialMath {
  static calculateCAGR(startValue: Money, endValue: Money, years: number): number {
    if (years <= 0) return 0;
    const start = startValue.toDecimal();
    const end = endValue.toDecimal();
    if (start <= 0 || end <= 0) return 0;
    return Math.pow(end / start, 1 / years) - 1;
  }

  static calculateCompoundInterest(
    principal: Money,
    annualRate: number,
    compoundingsPerYear: number,
    years: number
  ): Money {
    const p = principal.toDecimal();
    const r = annualRate;
    const n = compoundingsPerYear;
    const t = years;
    const amount = p * Math.pow(1 + r / n, n * t);
    return Money.fromDecimal(amount, principal.getCurrency());
  }

  static calculateRunway(savings: Money, monthlyOutflow: Money): number {
    if (monthlyOutflow.isZero() || monthlyOutflow.isNegative()) {
      return savings.isPositive() ? 999 : 0;
    }
    const ratio = (savings.cents * 100n) / monthlyOutflow.cents;
    return Number(ratio) / 100;
  }

  static calculateSavingsScore(savingsRate: number): number {
    if (savingsRate >= 20) return 100;
    if (savingsRate <= 0) return 0;
    return Math.round((savingsRate / 20) * 100);
  }

  static calculateBudgetAdherenceScore(utilization: number): number {
    if (utilization <= 80) return 100;
    if (utilization >= 100) return 0;
    const factor = (utilization - 80) / 20;
    return Math.round(100 - factor * 50);
  }

  static calculateLiquidityScore(runwayMonths: number): number {
    if (runwayMonths >= 6) return 100;
    if (runwayMonths <= 0) return 0;
    return Math.round((runwayMonths / 6) * 100);
  }

  static calculateStabilityScore(fixedCosts: Money, monthlySalary: Money): number {
    if (monthlySalary.isZero() || monthlySalary.isNegative()) return 0;
    const ratio = Number((fixedCosts.cents * 10000n) / monthlySalary.cents) / 100;
    if (ratio <= 30) return 100;
    if (ratio >= 70) return 0;
    const factor = (ratio - 30) / 40;
    return Math.round(100 - factor * 100);
  }

  static calculateInvestmentReadinessScore(
    savingsRate: number,
    runwayMonths: number,
    surplusInflow: Money
  ): number {
    let score = 0;
    if (savingsRate >= 10) {
      score += 40;
    } else if (savingsRate > 0) {
      score += Math.round((savingsRate / 10) * 40);
    }

    if (runwayMonths >= 3) {
      score += 40;
    } else if (runwayMonths > 0) {
      score += Math.round((runwayMonths / 3) * 40);
    }

    if (surplusInflow.isPositive()) {
      score += 20;
    }
    return score;
  }

  static calculateOverallHealthScore({
    savingsScore,
    budgetScore,
    liquidityScore,
    netWorthGrowthScore,
    stabilityScore,
  }: {
    savingsScore: number;
    budgetScore: number;
    liquidityScore: number;
    netWorthGrowthScore: number;
    stabilityScore: number;
  }): number {
    const wSavings = FinancialConstants.HEALTH_WEIGHT_SAVINGS_RATE;
    const wBudget = FinancialConstants.HEALTH_WEIGHT_BUDGET_ADHERENCE;
    const wLiquidity = FinancialConstants.HEALTH_WEIGHT_LIQUIDITY_RUNWAY;
    const wGrowth = FinancialConstants.HEALTH_WEIGHT_NET_WORTH_GROWTH;
    const wStability = FinancialConstants.HEALTH_WEIGHT_RISK_RATING;

    const totalWeight = wSavings + wBudget + wLiquidity + wGrowth + wStability;
    
    const weightedSum =
      savingsScore * wSavings +
      budgetScore * wBudget +
      liquidityScore * wLiquidity +
      netWorthGrowthScore * wGrowth +
      stabilityScore * wStability;

    return Math.round(weightedSum / totalWeight);
  }
}
