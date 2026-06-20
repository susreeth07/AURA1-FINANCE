import { Budget } from '../types/Budget';
import { SavingsGoal } from '../types/SavingsGoal';
import { FinancialProfile } from '../types/FinancialProfile';

export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

export class AndSpecification<T> implements Specification<T> {
  constructor(private readonly left: Specification<T>, private readonly right: Specification<T>) {}
  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

export class OrSpecification<T> implements Specification<T> {
  constructor(private readonly left: Specification<T>, private readonly right: Specification<T>) {}
  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

export class NotSpecification<T> implements Specification<T> {
  constructor(private readonly spec: Specification<T>) {}
  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate);
  }
}

// Concrete Specifications
export class BudgetOverspentSpecification implements Specification<Budget> {
  isSatisfiedBy(budget: Budget): boolean {
    return budget.spent.greaterThan(budget.limit);
  }
}

export class SavingsGoalCompletedSpecification implements Specification<SavingsGoal> {
  isSatisfiedBy(goal: SavingsGoal): boolean {
    return goal.currentAmount.greaterThanOrEqual(goal.targetAmount);
  }
}

export class HighDebtRatioSpecification implements Specification<FinancialProfile> {
  isSatisfiedBy(profile: FinancialProfile): boolean {
    const totalIncome = profile.monthlySalary.add(profile.additionalIncome);
    if (totalIncome.isZero()) return true;
    const emiRatio = Number((profile.emiLoans.cents * 100n) / totalIncome.cents);
    return emiRatio > 35; // True if debt service is greater than 35% of total income
  }
}
