export interface CurrencyConversionRateProvider {
  getRate(from: string, to: string): number;
}

export class Currency {
  readonly code: string;
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;

  private static registry: Map<string, Currency> = new Map();
  private static conversionProvider?: CurrencyConversionRateProvider;

  constructor(code: string, symbol: string, name: string, decimals: number = 2) {
    this.code = code.toUpperCase();
    this.symbol = symbol;
    this.name = name;
    this.decimals = decimals;
  }

  static register(currency: Currency): void {
    Currency.registry.set(currency.code, currency);
  }

  static fromCode(code: string): Currency {
    const c = Currency.registry.get(code.toUpperCase());
    if (!c) {
      throw new Error(`Unsupported currency code: ${code}`);
    }
    return c;
  }

  static setConversionProvider(provider: CurrencyConversionRateProvider): void {
    Currency.conversionProvider = provider;
  }

  static convert(amount: bigint, from: Currency, to: Currency): bigint {
    if (from.code === to.code) return amount;
    if (!Currency.conversionProvider) {
      throw new Error("Currency conversion provider is not set");
    }
    const rate = Currency.conversionProvider.getRate(from.code, to.code);
    const rateScaled = BigInt(Math.round(rate * 1000000));
    const numerator = amount * rateScaled;
    const denominator = 1000000n;
    const isNegative = (numerator < 0n);
    const absNum = isNegative ? -numerator : numerator;
    const halfDen = denominator / 2n;
    const roundedNum = absNum + halfDen;
    const result = roundedNum / denominator;
    return isNegative ? -result : result;
  }

  // Predefined currencies
  static readonly USD = new Currency('USD', '$', 'US Dollar', 2);
  static readonly EUR = new Currency('EUR', '€', 'Euro', 2);
  static readonly GBP = new Currency('GBP', '£', 'British Pound', 2);
  static readonly INR = new Currency('INR', '₹', 'Indian Rupee', 2);
  static readonly JPY = new Currency('JPY', '¥', 'Japanese Yen', 0);
}

// Register default currencies
Currency.register(Currency.USD);
Currency.register(Currency.EUR);
Currency.register(Currency.GBP);
Currency.register(Currency.INR);
Currency.register(Currency.JPY);
