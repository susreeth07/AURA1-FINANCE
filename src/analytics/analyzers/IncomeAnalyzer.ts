import { AnalyticsSnapshot } from '../AnalyticsSnapshot';
import { ExplainableMetric } from '../DashboardModels';
import { Money } from '../../domain/finance/Money';
import { Currency } from '../../domain/finance/Currency';

export interface IncomeAnalysis {
  readonly totalIncome: string;
  readonly categories: { readonly name: string; readonly amount: number }[];
  readonly recurringAmount: string;
  readonly nonRecurringAmount: string;
  readonly recurringPercentage: number;
}

export class IncomeAnalyzer {
  static analyze(snapshot: AnalyticsSnapshot, currency: Currency = Currency.USD): ExplainableMetric<IncomeAnalysis> {
    const timestamp = new Date();

    let total = Money.zero(currency);
    let recurring = Money.zero(currency);
    const categoryMap = new Map<string, bigint>();

    for (const inc of snapshot.incomes) {
      total = total.add(inc.amount);
      if (inc.isRecurring) {
        recurring = recurring.add(inc.amount);
      }
      const currentCat = categoryMap.get(inc.category) || 0n;
      categoryMap.set(inc.category, currentCat + inc.amount.cents);
    }

    const categories = Array.from(categoryMap.entries()).map(([name, cents]) => ({
      name,
      amount: Money.fromCents(cents, currency).toDecimal()
    })).sort((a, b) => b.amount - a.amount);

    const nonRecurring = total.subtract(recurring);
    const recurringPercent = total.isZero() ? 0 : Number((recurring.cents * 10000n) / total.cents) / 100;

    return {
      value: {
        totalIncome: total.format(),
        categories,
        recurringAmount: recurring.format(),
        nonRecurringAmount: nonRecurring.format(),
        recurringPercentage: recurringPercent
      },
      confidence: snapshot.incomes.length > 0 ? 100 : 50,
      calculationMethod: "Inflow summation grouped by category, splitting by recurring flag",
      dataSources: ["incomes"],
      timestamp
    };
  }
}
