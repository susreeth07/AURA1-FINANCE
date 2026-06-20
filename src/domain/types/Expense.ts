import { Money } from '../finance/Money';

export interface Expense {
  readonly id: string;
  readonly merchant: string;
  readonly amount: Money;
  readonly category: string;
  readonly date: Date;
  readonly description?: string;
  readonly isRecurring: boolean;
  readonly frequency?: 'weekly' | 'monthly' | 'yearly';
}
