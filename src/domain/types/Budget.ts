import { Money } from '../finance/Money';

export interface Budget {
  readonly id: string;
  readonly category: string;
  readonly limit: Money;
  readonly spent: Money;
  readonly color: string;
  readonly alertThreshold: number; // percentage, e.g. 80
}
