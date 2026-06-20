import { AnalyticsSnapshot } from '../AnalyticsSnapshot';
import { InsightsEngine, FinancialInsight } from '../../domain/engines/InsightsEngine';
import { Currency } from '../../domain/finance/Currency';

export class InsightsAggregator {
  static aggregate(snapshot: AnalyticsSnapshot, currency: Currency = Currency.USD): FinancialInsight[] {
    const budgets = snapshot.budgets.map((b) => ({
      id: b.id,
      category: b.category,
      limit: b.limit,
      spent: b.spent,
      color: b.color,
      alertThreshold: b.alertThreshold
    }));

    const cashFlowHistory = [...snapshot.cashFlowHistory];

    return InsightsEngine.generateInsights(snapshot.profile, cashFlowHistory, budgets);
  }
}
