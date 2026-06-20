import { Money } from '../finance/Money';

export interface Income {
  readonly id: string;
  readonly source: string;
  readonly amount: Money;
  readonly category: string;
  readonly date: Date;
  readonly description?: string;
  readonly isRecurring: boolean;
}
