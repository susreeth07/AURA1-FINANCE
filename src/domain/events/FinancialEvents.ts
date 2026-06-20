import { Money } from '../finance/Money';

export interface DomainEvent {
  readonly id: string;
  readonly occurredAt: Date;
  readonly eventName: string;
  readonly payload: any;
}

export class IncomeAdded implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'IncomeAdded';
  readonly payload: {
    readonly incomeId: string;
    readonly amount: Money;
    readonly category: string;
  };

  constructor(incomeId: string, amount: Money, category: string) {
    this.payload = { incomeId, amount, category };
  }
}

export class ExpenseAdded implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'ExpenseAdded';
  readonly payload: {
    readonly expenseId: string;
    readonly amount: Money;
    readonly category: string;
  };

  constructor(expenseId: string, amount: Money, category: string) {
    this.payload = { expenseId, amount, category };
  }
}

export class BudgetExceeded implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'BudgetExceeded';
  readonly payload: {
    readonly budgetId: string;
    readonly category: string;
    readonly limit: Money;
    readonly spent: Money;
  };

  constructor(budgetId: string, category: string, limit: Money, spent: Money) {
    this.payload = { budgetId, category, limit, spent };
  }
}

export class GoalCompleted implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'GoalCompleted';
  readonly payload: {
    readonly goalId: string;
    readonly name: string;
    readonly targetAmount: Money;
  };

  constructor(goalId: string, name: string, targetAmount: Money) {
    this.payload = { goalId, name, targetAmount };
  }
}

export class SalaryUpdated implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'SalaryUpdated';
  readonly payload: {
    readonly oldSalary: Money;
    readonly newSalary: Money;
  };

  constructor(oldSalary: Money, newSalary: Money) {
    this.payload = { oldSalary, newSalary };
  }
}
