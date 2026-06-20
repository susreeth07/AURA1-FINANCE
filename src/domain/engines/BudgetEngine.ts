import { Budget } from '../types/Budget';
import { Money } from '../finance/Money';

export class BudgetEngine {
  static getRemainingBudget(budget: Budget): Money {
    if (budget.spent.greaterThan(budget.limit)) {
      return Money.zero(budget.limit.getCurrency());
    }
    return budget.limit.subtract(budget.spent);
  }

  static getBudgetUtilization(budget: Budget): number {
    if (budget.limit.isZero()) return 0;
    const ratio = (budget.spent.cents * 10000n) / budget.limit.cents;
    return Number(ratio) / 100;
  }

  static getOverspending(budget: Budget): Money {
    if (budget.spent.greaterThan(budget.limit)) {
      return budget.spent.subtract(budget.limit);
    }
    return Money.zero(budget.limit.getCurrency());
  }

  static isAlertThresholdReached(budget: Budget): boolean {
    const utilization = this.getBudgetUtilization(budget);
    return utilization >= budget.alertThreshold;
  }

  static getDailySpendingAllowance(budget: Budget, daysRemaining: number): Money {
    if (daysRemaining <= 0) return Money.zero(budget.limit.getCurrency());
    const remaining = this.getRemainingBudget(budget);
    return remaining.divide(BigInt(daysRemaining));
  }

  static calculateMonthlyBurnRate(spentSoFar: Money, daysElapsed: number): Money {
    if (daysElapsed <= 0) return spentSoFar;
    return spentSoFar.multiply(30n).divide(BigInt(daysElapsed));
  }
}
