import { Money } from '../finance/Money';
import { ForecastUnavailableError } from '../errors/DomainErrors';

export interface ForecastingStrategy {
  readonly name: string;
  forecast(history: Money[], steps: number): Money[];
}

export class LinearForecastingStrategy implements ForecastingStrategy {
  readonly name = "Linear Regression";

  forecast(history: Money[], steps: number): Money[] {
    if (history.length < 2) {
      throw new ForecastUnavailableError("Linear regression requires at least 2 historical data points.");
    }
    const n = history.length;
    const currency = history[0].getCurrency();
    const y = history.map(h => h.toDecimal());
    
    let sumT = 0;
    let sumY = 0;
    let sumTY = 0;
    let sumT2 = 0;

    for (let i = 0; i < n; i++) {
      const t = i + 1;
      sumT += t;
      sumY += y[i];
      sumTY += t * y[i];
      sumT2 += t * t;
    }

    const denom = n * sumT2 - sumT * sumT;
    if (denom === 0) {
      const avg = sumY / n;
      return Array.from({ length: steps }, () => Money.fromDecimal(avg, currency));
    }

    const slope = (n * sumTY - sumT * sumY) / denom;
    const intercept = (sumY - slope * sumT) / n;

    const projections: Money[] = [];
    for (let s = 1; s <= steps; s++) {
      const val = slope * (n + s) + intercept;
      projections.push(Money.fromDecimal(val, currency));
    }
    return projections;
  }
}

export class MovingAverageForecastingStrategy implements ForecastingStrategy {
  readonly name = "Moving Average";
  private readonly windowSize: number;

  constructor(windowSize: number = 3) {
    this.windowSize = windowSize;
  }

  forecast(history: Money[], steps: number): Money[] {
    if (history.length === 0) {
      throw new ForecastUnavailableError("History is empty.");
    }
    const currency = history[0].getCurrency();
    const tempHistory = history.map(h => h.toDecimal());
    const projections: Money[] = [];

    for (let s = 0; s < steps; s++) {
      const start = Math.max(0, tempHistory.length - this.windowSize);
      const window = tempHistory.slice(start);
      const sum = window.reduce((a, b) => a + b, 0);
      const avg = sum / window.length;
      projections.push(Money.fromDecimal(avg, currency));
      tempHistory.push(avg);
    }

    return projections;
  }
}

export class ExponentialSmoothingForecastingStrategy implements ForecastingStrategy {
  readonly name = "Exponential Smoothing";
  private readonly alpha: number;

  constructor(alpha: number = 0.3) {
    if (alpha <= 0 || alpha > 1) {
      throw new Error("Alpha must be between 0 and 1.");
    }
    this.alpha = alpha;
  }

  forecast(history: Money[], steps: number): Money[] {
    if (history.length === 0) {
      throw new ForecastUnavailableError("History is empty.");
    }
    const currency = history[0].getCurrency();
    const y = history.map(h => h.toDecimal());
    
    let s = y[0];
    for (let i = 1; i < y.length; i++) {
      s = this.alpha * y[i] + (1 - this.alpha) * s;
    }

    return Array.from({ length: steps }, () => Money.fromDecimal(s, currency));
  }
}

export class ForecastEngine {
  private strategy: ForecastingStrategy;

  constructor(strategy: ForecastingStrategy = new LinearForecastingStrategy()) {
    this.strategy = strategy;
  }

  setStrategy(strategy: ForecastingStrategy): void {
    this.strategy = strategy;
  }

  getStrategyName(): string {
    return this.strategy.name;
  }

  generateForecast(history: Money[], steps: number): Money[] {
    if (steps <= 0) return [];
    if (history.length === 0) {
      throw new ForecastUnavailableError("No historical data to forecast from.");
    }
    return this.strategy.forecast(history, steps);
  }
}
