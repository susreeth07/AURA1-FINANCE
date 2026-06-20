import { Money } from '../finance/Money';

export interface SavingsGoal {
  readonly id: string;
  readonly name: string;
  readonly targetAmount: Money;
  readonly currentAmount: Money;
  readonly category: string;
  readonly targetDate: Date;
  readonly icon: string;
}
