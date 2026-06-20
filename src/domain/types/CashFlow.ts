import { Money } from '../finance/Money';

export interface CashFlow {
  readonly month: string; // YYYY-MM
  readonly inflow: Money;
  readonly outflow: Money;
  readonly netFlow: Money;
  readonly savingsRate: number; // percentage
  readonly burnRate: Money;
}
