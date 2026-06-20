import { Money } from '../finance/Money';
import { Currency } from '../finance/Currency';

export interface TimelineSnapshot {
  readonly month: string; // "YYYY-MM"
  readonly balance: Money;
  readonly savings: Money;
  readonly growthRate: number;
}

export class FinancialTimeline {
  private readonly snapshots: TimelineSnapshot[];
  private readonly currency: Currency;

  constructor(snapshots: TimelineSnapshot[] = [], currency: Currency = Currency.USD) {
    this.snapshots = [...snapshots].sort((a, b) => a.month.localeCompare(b.month));
    this.currency = currency;
  }

  getSnapshots(): readonly TimelineSnapshot[] {
    return this.snapshots;
  }

  getHistoricalBalances(): Money[] {
    return this.snapshots.map(s => s.balance);
  }

  getHistoricalSavings(): Money[] {
    return this.snapshots.map(s => s.savings);
  }

  getGrowthHistory(): number[] {
    return this.snapshots.map(s => s.growthRate);
  }

  addSnapshot(snapshot: TimelineSnapshot): FinancialTimeline {
    const updated = [...this.snapshots, snapshot];
    return new FinancialTimeline(updated, this.currency);
  }

  calculateAverageGrowthRate(): number {
    if (this.snapshots.length < 2) return 0;
    // Calculate sum of growth rates starting from the second element
    const rates = this.snapshots.slice(1).map(s => s.growthRate);
    if (rates.length === 0) return 0;
    const totalGrowth = rates.reduce((sum, rate) => sum + rate, 0);
    return totalGrowth / rates.length;
  }
}
