import { AnalyticsSnapshot } from '../AnalyticsSnapshot';
import { ExplainableMetric } from '../DashboardModels';
import { CashFlowEngine } from '../../domain/engines/CashFlowEngine';
import { Money } from '../../domain/finance/Money';
import { Currency } from '../../domain/finance/Currency';

export interface TrendData {
  readonly labels: readonly string[];
  readonly inflows: readonly number[];
  readonly outflows: readonly number[];
  readonly growthRates: readonly number[];
}

export class TrendAnalyzer {
  static analyze(snapshot: AnalyticsSnapshot, currency: Currency = Currency.USD): ExplainableMetric<TrendData> {
    const timestamp = new Date();
    
    const sortedMonths: string[] = [];
    const inflows: number[] = [];
    const outflows: number[] = [];
    const growthRates: number[] = [];

    let previousNet = Money.zero(currency);

    for (const cf of snapshot.cashFlowHistory) {
      sortedMonths.push(cf.month);
      inflows.push(cf.inflow.toDecimal());
      outflows.push(cf.outflow.toDecimal());

      const growth = CashFlowEngine.calculateMoMTrendPercentage(previousNet, cf.netFlow);
      growthRates.push(growth);

      previousNet = cf.netFlow;
    }

    const confidence = sortedMonths.length > 0 ? 100 : 50;

    return {
      value: {
        labels: sortedMonths,
        inflows,
        outflows,
        growthRates
      },
      confidence,
      calculationMethod: "Direct retrieval of pre-compiled cash flow history from snapshot to prevent redundant loops",
      dataSources: ["cashFlowHistory"],
      timestamp
    };
  }
}
