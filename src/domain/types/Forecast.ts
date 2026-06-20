import { Money } from '../finance/Money';

export interface ForecastEntry {
  readonly date: Date;
  readonly amount: Money;
}

export interface Forecast {
  readonly strategy: string;
  readonly baseDate: Date;
  readonly projections: readonly ForecastEntry[];
}
