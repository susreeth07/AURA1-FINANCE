import { SavingsGoal } from '../types/SavingsGoal';
import { Money } from '../finance/Money';

export class SavingsEngine {
  static getGoalProgressPercentage(goal: SavingsGoal): number {
    if (goal.targetAmount.isZero()) return 100;
    const ratio = (goal.currentAmount.cents * 10000n) / goal.targetAmount.cents;
    return Math.min(100, Number(ratio) / 100);
  }

  static getRemainingAmount(goal: SavingsGoal): Money {
    if (goal.currentAmount.greaterThanOrEqual(goal.targetAmount)) {
      return Money.zero(goal.targetAmount.getCurrency());
    }
    return goal.targetAmount.subtract(goal.currentAmount);
  }

  static getRemainingMonths(goal: SavingsGoal, currentDate: Date = new Date()): number {
    const target = goal.targetDate;
    const yearDiff = target.getFullYear() - currentDate.getFullYear();
    const monthDiff = target.getMonth() - currentDate.getMonth();
    const totalMonths = yearDiff * 12 + monthDiff;
    return Math.max(0, totalMonths);
  }

  static calculateRequiredMonthlySavings(goal: SavingsGoal, currentDate: Date = new Date()): Money {
    const remaining = this.getRemainingAmount(goal);
    if (remaining.isZero()) {
      return Money.zero(goal.targetAmount.getCurrency());
    }
    const months = this.getRemainingMonths(goal, currentDate);
    if (months <= 0) {
      return remaining;
    }
    return remaining.divide(BigInt(months));
  }

  static calculateProjectedCompletionDate(
    goal: SavingsGoal,
    monthlyContribution: Money,
    currentDate: Date = new Date()
  ): Date {
    const remaining = this.getRemainingAmount(goal);
    if (remaining.isZero()) {
      return new Date(currentDate.getTime());
    }
    if (monthlyContribution.isZero() || monthlyContribution.isNegative()) {
      return new Date(currentDate.getFullYear() + 100, currentDate.getMonth(), currentDate.getDate());
    }

    const remainingCents = remaining.cents;
    const monthlyCents = monthlyContribution.cents;
    const monthsNeeded = (remainingCents + monthlyCents - 1n) / monthlyCents;
    
    const projectedDate = new Date(currentDate.getTime());
    projectedDate.setMonth(projectedDate.getMonth() + Number(monthsNeeded));
    return projectedDate;
  }
}
