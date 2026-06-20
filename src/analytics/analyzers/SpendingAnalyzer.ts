import { AnalyticsSnapshot } from '../AnalyticsSnapshot';
import { ExplainableMetric } from '../DashboardModels';
import { Money } from '../../domain/finance/Money';
import { Currency } from '../../domain/finance/Currency';

export interface SpendingAnalysis {
  readonly totalSpending: string;
  readonly categories: { readonly name: string; readonly amount: number }[];
  readonly fastestGrowingCategories: { readonly name: string; readonly growthPercent: number }[];
  readonly recurringAmount: string;
  readonly dailyAverage: string;
  readonly weeklyAverage: string;
  readonly merchantAnalysis: { readonly name: string; readonly amount: number }[];
}

export class SpendingAnalyzer {
  static analyze(snapshot: AnalyticsSnapshot, currency: Currency = Currency.USD): ExplainableMetric<SpendingAnalysis> {
    const timestamp = new Date();

    let total = Money.zero(currency);
    let recurring = Money.zero(currency);
    const categoryMap = new Map<string, bigint>();
    const merchantMap = new Map<string, bigint>();
    const currentMonthMap = new Map<string, bigint>();
    const prevMonthMap = new Map<string, bigint>();

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }

    for (const exp of snapshot.expenses) {
      total = total.add(exp.amount);
      if (exp.isRecurring) {
        recurring = recurring.add(exp.amount);
      }

      const currentCat = categoryMap.get(exp.category) || 0n;
      categoryMap.set(exp.category, currentCat + exp.amount.cents);

      const merchant = exp.merchant || "Unknown";
      const currentMerc = merchantMap.get(merchant) || 0n;
      merchantMap.set(merchant, currentMerc + exp.amount.cents);

      const expYear = exp.date.getFullYear();
      const expMonth = exp.date.getMonth();
      if (expYear === currentYear && expMonth === currentMonth) {
        const catVal = currentMonthMap.get(exp.category) || 0n;
        currentMonthMap.set(exp.category, catVal + exp.amount.cents);
      } else if (expYear === prevYear && expMonth === prevMonth) {
        const catVal = prevMonthMap.get(exp.category) || 0n;
        prevMonthMap.set(exp.category, catVal + exp.amount.cents);
      }
    }

    const categories = Array.from(categoryMap.entries()).map(([name, cents]) => ({
      name,
      amount: Money.fromCents(cents, currency).toDecimal()
    })).sort((a, b) => b.amount - a.amount);

    const merchantAnalysis = Array.from(merchantMap.entries()).map(([name, cents]) => ({
      name,
      amount: Money.fromCents(cents, currency).toDecimal()
    })).sort((a, b) => b.amount - a.amount).slice(0, 5);

    const fastestGrowingCategories: { name: string; growthPercent: number }[] = [];
    currentMonthMap.forEach((currentCents, catName) => {
      const prevCents = prevMonthMap.get(catName) || 0n;
      if (prevCents > 0n) {
        const diff = currentCents - prevCents;
        const growth = Number((diff * 100n) / prevCents);
        if (growth > 0) {
          fastestGrowingCategories.push({ name: catName, growthPercent: growth });
        }
      }
    });
    fastestGrowingCategories.sort((a, b) => b.growthPercent - a.growthPercent);

    let days = 30;
    if (snapshot.expenses.length > 1) {
      let minDate = Infinity;
      let maxDate = -Infinity;
      for (const e of snapshot.expenses) {
        const time = e.date.getTime();
        if (time < minDate) minDate = time;
        if (time > maxDate) maxDate = time;
      }
      const span = (maxDate - minDate) / (1000 * 3600 * 24);
      if (span > 0) {
        days = Math.ceil(span);
      }
    }

    const dailyAvg = total.divide(BigInt(days));
    const weeklyAvg = dailyAvg.multiply(7n);

    return {
      value: {
        totalSpending: total.format(),
        categories,
        fastestGrowingCategories,
        recurringAmount: recurring.format(),
        dailyAverage: dailyAvg.format(),
        weeklyAverage: weeklyAvg.format(),
        merchantAnalysis
      },
      confidence: snapshot.expenses.length > 0 ? 100 : 50,
      calculationMethod: "Outflow summation grouped by category, merchant, and MoM category growth comparison",
      dataSources: ["expenses"],
      timestamp
    };
  }
}
