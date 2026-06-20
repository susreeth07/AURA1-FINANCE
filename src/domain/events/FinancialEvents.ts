import { Money } from '../finance/Money';

export interface DomainEvent {
  readonly id: string;
  readonly occurredAt: Date;
  readonly eventName: string;
  readonly payload: {
    readonly userId: string;
    [key: string]: any;
  };
}

export class IncomeAdded implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'IncomeAdded';
  readonly payload: {
    readonly userId: string;
    readonly incomeId: string;
    readonly amount: Money;
    readonly category: string;
  };

  constructor(userId: string, incomeId: string, amount: Money, category: string) {
    this.payload = { userId, incomeId, amount, category };
  }
}

export class IncomeUpdated implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'IncomeUpdated';
  readonly payload: {
    readonly userId: string;
    readonly incomeId: string;
    readonly amount?: Money;
    readonly category?: string;
  };

  constructor(userId: string, incomeId: string, amount?: Money, category?: string) {
    this.payload = { userId, incomeId, amount, category };
  }
}

export class ExpenseAdded implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'ExpenseAdded';
  readonly payload: {
    readonly userId: string;
    readonly expenseId: string;
    readonly amount: Money;
    readonly category: string;
  };

  constructor(userId: string, expenseId: string, amount: Money, category: string) {
    this.payload = { userId, expenseId, amount, category };
  }
}

export class ExpenseUpdated implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'ExpenseUpdated';
  readonly payload: {
    readonly userId: string;
    readonly expenseId: string;
    readonly amount?: Money;
    readonly category?: string;
  };

  constructor(userId: string, expenseId: string, amount?: Money, category?: string) {
    this.payload = { userId, expenseId, amount, category };
  }
}

export class BudgetUpdated implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'BudgetUpdated';
  readonly payload: {
    readonly userId: string;
    readonly budgetId: string;
    readonly limit: Money;
    readonly category: string;
  };

  constructor(userId: string, budgetId: string, limit: Money, category: string) {
    this.payload = { userId, budgetId, limit, category };
  }
}

export class BudgetExceeded implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'BudgetExceeded';
  readonly payload: {
    readonly userId: string;
    readonly budgetId: string;
    readonly category: string;
    readonly limit: Money;
    readonly spent: Money;
  };

  constructor(userId: string, budgetId: string, category: string, limit: Money, spent: Money) {
    this.payload = { userId, budgetId, category, limit, spent };
  }
}

export class GoalFunded implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'GoalFunded';
  readonly payload: {
    readonly userId: string;
    readonly goalId: string;
    readonly fundedAmount: Money;
    readonly newCurrentAmount: Money;
  };

  constructor(userId: string, goalId: string, fundedAmount: Money, newCurrentAmount: Money) {
    this.payload = { userId, goalId, fundedAmount, newCurrentAmount };
  }
}

export class GoalCompleted implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'GoalCompleted';
  readonly payload: {
    readonly userId: string;
    readonly goalId: string;
    readonly name: string;
    readonly targetAmount: Money;
  };

  constructor(userId: string, goalId: string, name: string, targetAmount: Money) {
    this.payload = { userId, goalId, name, targetAmount };
  }
}

export class SalaryUpdated implements DomainEvent {
  readonly id: string = Math.random().toString(36).substring(2, 11);
  readonly occurredAt: Date = new Date();
  readonly eventName = 'SalaryUpdated';
  readonly payload: {
    readonly userId: string;
    readonly oldSalary: Money;
    readonly newSalary: Money;
  };

  constructor(userId: string, oldSalary: Money, newSalary: Money) {
    this.payload = { userId, oldSalary, newSalary };
  }
}
