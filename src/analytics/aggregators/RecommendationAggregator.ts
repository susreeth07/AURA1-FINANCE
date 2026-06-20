import { AnalyticsSnapshot } from '../AnalyticsSnapshot';
import { RecommendationEngine, FinancialRecommendation } from '../../domain/engines/RecommendationEngine';
import { Currency } from '../../domain/finance/Currency';

export class RecommendationAggregator {
  static aggregate(snapshot: AnalyticsSnapshot, currency: Currency = Currency.USD): FinancialRecommendation[] {
    const budgets = snapshot.budgets.map((b) => ({
      id: b.id,
      category: b.category,
      limit: b.limit,
      spent: b.spent,
      color: b.color,
      alertThreshold: b.alertThreshold
    }));

    const cashFlowHistory = [...snapshot.cashFlowHistory];

    return RecommendationEngine.generateRecommendations(snapshot.profile, cashFlowHistory, budgets);
  }
}
