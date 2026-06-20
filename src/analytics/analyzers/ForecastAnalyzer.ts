import { AnalyticsSnapshot } from '../AnalyticsSnapshot';
import { ExplainableMetric } from '../DashboardModels';
import { ForecastEngine, LinearForecastingStrategy } from '../../domain/engines/ForecastEngine';
import { Money } from '../../domain/finance/Money';
import { Currency } from '../../domain/finance/Currency';

export interface ForecastProjections {
  readonly cash3Months: string;
  readonly cash6Months: string;
  readonly cash12Months: string;
}

export class ForecastAnalyzer {
  static analyze(snapshot: AnalyticsSnapshot, currency: Currency = Currency.USD): ExplainableMetric<ForecastProjections> {
    const timestamp = new Date();
    const history = snapshot.timelineHistory.map((s) => s.balance);

    const activeHistory = history.length >= 2 
      ? history 
      : [
          snapshot.profile.currentSavings.subtract(snapshot.profile.monthlySalary.percentage(10)),
          snapshot.profile.currentSavings
        ];

    const engine = new ForecastEngine(new LinearForecastingStrategy());
    const projections = engine.generateForecast(activeHistory, 12);

    const projected3 = projections[2] || activeHistory[activeHistory.length - 1] || Money.zero(currency);
    const projected6 = projections[5] || activeHistory[activeHistory.length - 1] || Money.zero(currency);
    const projected12 = projections[11] || activeHistory[activeHistory.length - 1] || Money.zero(currency);

    const confidence = history.length >= 3 ? 90 : (history.length >= 2 ? 70 : 40);

    return {
      value: {
        cash3Months: projected3.format(),
        cash6Months: projected6.format(),
        cash12Months: projected12.format()
      },
      confidence,
      calculationMethod: `Linear Regression Strategy using ForecastEngine on ${activeHistory.length} data points`,
      dataSources: ["timelineHistory", "profiles"],
      timestamp
    };
  }
}
