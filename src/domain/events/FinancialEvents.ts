import { Money } from '../finance/Money';

export interface DomainEvent {
  readonly id: string;
  readonly occurredAt: Date;
  readonly eventName: string;
  
  // Hardened Metadata Properties
  readonly eventId: string;
  readonly correlationId: string;
  readonly version: string;
  readonly timestamp: Date;
  readonly source: string;
  readonly userId: string;
  readonly eventType: string;
  
  readonly payload: {
    readonly userId: string;
    [key: string]: any;
  };
}

export abstract class BaseFinancialEvent implements DomainEvent {
  readonly id: string;
  readonly occurredAt: Date;
  readonly eventName: string;

  readonly eventId: string;
  readonly correlationId: string;
  readonly version: string = '1.0';
  readonly timestamp: Date;
  readonly source: string = 'aurafinance.domain';
  readonly userId: string;
  readonly eventType: string;
  
  abstract readonly payload: {
    readonly userId: string;
    [key: string]: any;
  };

  constructor(userId: string, eventName: string, correlationId?: string) {
    const uniqueId = Math.random().toString(36).substring(2, 11);
    this.id = uniqueId;
    this.eventId = uniqueId;
    this.occurredAt = new Date();
    this.timestamp = this.occurredAt;
    this.eventName = eventName;
    this.eventType = eventName;
    this.userId = userId;
    this.correlationId = correlationId || `corr_${Math.random().toString(36).substring(2, 11)}`;
  }
}

export class IncomeAdded extends BaseFinancialEvent {
  readonly payload: {
    readonly userId: string;
    readonly incomeId: string;
    readonly amount: Money;
    readonly category: string;
  };

  constructor(userId: string, incomeId: string, amount: Money, category: string, correlationId?: string) {
    super(userId, 'IncomeAdded', correlationId);
    this.payload = { userId, incomeId, amount, category };
  }
}

export class IncomeUpdated extends BaseFinancialEvent {
  readonly payload: {
    readonly userId: string;
    readonly incomeId: string;
    readonly amount?: Money;
    readonly category?: string;
  };

  constructor(userId: string, incomeId: string, amount?: Money, category?: string, correlationId?: string) {
    super(userId, 'IncomeUpdated', correlationId);
    this.payload = { userId, incomeId, amount, category };
  }
}

export class ExpenseAdded extends BaseFinancialEvent {
  readonly payload: {
    readonly userId: string;
    readonly expenseId: string;
    readonly amount: Money;
    readonly category: string;
  };

  constructor(userId: string, expenseId: string, amount: Money, category: string, correlationId?: string) {
    super(userId, 'ExpenseAdded', correlationId);
    this.payload = { userId, expenseId, amount, category };
  }
}

export class ExpenseUpdated extends BaseFinancialEvent {
  readonly payload: {
    readonly userId: string;
    readonly expenseId: string;
    readonly amount?: Money;
    readonly category?: string;
  };

  constructor(userId: string, expenseId: string, amount?: Money, category?: string, correlationId?: string) {
    super(userId, 'ExpenseUpdated', correlationId);
    this.payload = { userId, expenseId, amount, category };
  }
}

export class BudgetUpdated extends BaseFinancialEvent {
  readonly payload: {
    readonly userId: string;
    readonly budgetId: string;
    readonly limit: Money;
    readonly category: string;
  };

  constructor(userId: string, budgetId: string, limit: Money, category: string, correlationId?: string) {
    super(userId, 'BudgetUpdated', correlationId);
    this.payload = { userId, budgetId, limit, category };
  }
}

export class BudgetExceeded extends BaseFinancialEvent {
  readonly payload: {
    readonly userId: string;
    readonly budgetId: string;
    readonly category: string;
    readonly limit: Money;
    readonly spent: Money;
  };

  constructor(userId: string, budgetId: string, category: string, limit: Money, spent: Money, correlationId?: string) {
    super(userId, 'BudgetExceeded', correlationId);
    this.payload = { userId, budgetId, category, limit, spent };
  }
}

export class GoalFunded extends BaseFinancialEvent {
  readonly payload: {
    readonly userId: string;
    readonly goalId: string;
    readonly fundedAmount: Money;
    readonly newCurrentAmount: Money;
  };

  constructor(userId: string, goalId: string, fundedAmount: Money, newCurrentAmount: Money, correlationId?: string) {
    super(userId, 'GoalFunded', correlationId);
    this.payload = { userId, goalId, fundedAmount, newCurrentAmount };
  }
}

export class GoalCompleted extends BaseFinancialEvent {
  readonly payload: {
    readonly userId: string;
    readonly goalId: string;
    readonly name: string;
    readonly targetAmount: Money;
  };

  constructor(userId: string, goalId: string, name: string, targetAmount: Money, correlationId?: string) {
    super(userId, 'GoalCompleted', correlationId);
    this.payload = { userId, goalId, name, targetAmount };
  }
}

export class SalaryUpdated extends BaseFinancialEvent {
  readonly payload: {
    readonly userId: string;
    readonly oldSalary: Money;
    readonly newSalary: Money;
  };

  constructor(userId: string, oldSalary: Money, newSalary: Money, correlationId?: string) {
    super(userId, 'SalaryUpdated', correlationId);
    this.payload = { userId, oldSalary, newSalary };
  }
}

export class ProfileUpdated extends BaseFinancialEvent {
  readonly payload: {
    readonly userId: string;
    readonly oldProfile: any;
    readonly newProfile: any;
  };

  constructor(userId: string, oldProfile: any, newProfile: any, correlationId?: string) {
    super(userId, 'ProfileUpdated', correlationId);
    this.payload = { userId, oldProfile, newProfile };
  }
}

export class NotificationAcknowledged extends BaseFinancialEvent {
  readonly payload: {
    readonly userId: string;
    readonly notificationId: string;
    readonly actionTaken: string;
  };

  constructor(userId: string, notificationId: string, actionTaken: string, correlationId?: string) {
    super(userId, 'NotificationAcknowledged', correlationId);
    this.payload = { userId, notificationId, actionTaken };
  }
}
