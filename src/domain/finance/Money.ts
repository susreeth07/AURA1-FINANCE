import { Currency } from './Currency';

export class Money {
  private readonly amountInCents: bigint;
  private readonly currency: Currency;

  constructor(amountInCents: bigint, currency: Currency = Currency.USD) {
    this.amountInCents = amountInCents;
    this.currency = currency;
  }

  static fromCents(cents: number | bigint, currency: Currency = Currency.USD): Money {
    return new Money(BigInt(cents), currency);
  }

  static fromDecimal(amount: number | string, currency: Currency = Currency.USD): Money {
    const decimals = currency.decimals;
    const amountStr = typeof amount === 'number' ? amount.toFixed(decimals) : amount;
    const parts = amountStr.split('.');
    const whole = parts[0] || '0';
    let fraction = parts[1] || '';
    
    if (fraction.length < decimals) {
      fraction = fraction.padEnd(decimals, '0');
    } else if (fraction.length > decimals) {
      fraction = fraction.slice(0, decimals);
    }
    
    const combined = whole + fraction;
    return new Money(BigInt(combined), currency);
  }

  static zero(currency: Currency = Currency.USD): Money {
    return new Money(0n, currency);
  }

  get cents(): bigint {
    return this.amountInCents;
  }

  get currencyCode(): string {
    return this.currency.code;
  }

  getCurrency(): Currency {
    return this.currency;
  }

  private checkCurrency(other: Money): void {
    if (this.currency.code !== other.currency.code) {
      throw new Error(`Currency mismatch: cannot perform operation between ${this.currency.code} and ${other.currency.code}`);
    }
  }

  add(other: Money): Money {
    this.checkCurrency(other);
    return new Money(this.amountInCents + other.amountInCents, this.currency);
  }

  subtract(other: Money): Money {
    this.checkCurrency(other);
    return new Money(this.amountInCents - other.amountInCents, this.currency);
  }

  private static divideWithRounding(numerator: bigint, denominator: bigint): bigint {
    if (denominator === 0n) {
      throw new Error("Division by zero");
    }
    const isNegative = (numerator < 0n) !== (denominator < 0n);
    const absNum = numerator < 0n ? -numerator : numerator;
    const absDen = denominator < 0n ? -denominator : denominator;
    const halfDen = absDen / 2n;
    const roundedNum = absNum + halfDen;
    const result = roundedNum / absDen;
    return isNegative ? -result : result;
  }

  multiply(factor: number | bigint): Money {
    if (typeof factor === 'bigint') {
      return new Money(this.amountInCents * factor, this.currency);
    } else {
      const scale = 1000000n;
      const factorBig = BigInt(Math.round(factor * 1000000));
      const cents = Money.divideWithRounding(this.amountInCents * factorBig, scale);
      return new Money(cents, this.currency);
    }
  }

  divide(divisor: number | bigint): Money {
    if (divisor === 0 || divisor === 0n) {
      throw new Error("Division by zero");
    }
    if (typeof divisor === 'bigint') {
      const cents = Money.divideWithRounding(this.amountInCents, divisor);
      return new Money(cents, this.currency);
    } else {
      const scale = 1000000n;
      const divisorBig = BigInt(Math.round(divisor * 1000000));
      const cents = Money.divideWithRounding(this.amountInCents * scale, divisorBig);
      return new Money(cents, this.currency);
    }
  }

  percentage(percent: number): Money {
    const scale = 10000n;
    const percentBig = BigInt(Math.round(percent * 100));
    const cents = Money.divideWithRounding(this.amountInCents * percentBig, scale);
    return new Money(cents, this.currency);
  }

  allocate(ratios: number[]): Money[] {
    const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
    if (totalRatio <= 0) {
      throw new Error("Total ratio must be greater than zero");
    }

    const totalRatioBig = BigInt(Math.round(totalRatio * 100));
    let remainder = this.amountInCents;
    const allocations: Money[] = [];

    for (const ratio of ratios) {
      const ratioBig = BigInt(Math.round(ratio * 100));
      const amount = (this.amountInCents * ratioBig) / totalRatioBig;
      allocations.push(new Money(amount, this.currency));
      remainder -= amount;
    }

    for (let i = 0; i < remainder; i++) {
      allocations[i] = new Money(allocations[i].cents + 1n, this.currency);
    }

    return allocations;
  }

  compare(other: Money): number {
    this.checkCurrency(other);
    if (this.amountInCents < other.amountInCents) return -1;
    if (this.amountInCents > other.amountInCents) return 1;
    return 0;
  }

  equals(other: Money): boolean {
    return this.compare(other) === 0;
  }

  greaterThan(other: Money): boolean {
    return this.compare(other) > 0;
  }

  lessThan(other: Money): boolean {
    return this.compare(other) < 0;
  }

  greaterThanOrEqual(other: Money): boolean {
    return this.compare(other) >= 0;
  }

  lessThanOrEqual(other: Money): boolean {
    return this.compare(other) <= 0;
  }

  isZero(): boolean {
    return this.amountInCents === 0n;
  }

  isPositive(): boolean {
    return this.amountInCents > 0n;
  }

  isNegative(): boolean {
    return this.amountInCents < 0n;
  }

  toDecimal(): number {
    const divisor = 10 ** this.currency.decimals;
    return Number(this.amountInCents) / divisor;
  }

  toString(): string {
    const dec = this.toDecimal();
    return dec.toFixed(this.currency.decimals);
  }

  format(locale: string = 'en-US'): string {
    const dec = this.toDecimal();
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency.code,
    }).format(dec);
  }

  serialize(): string {
    return JSON.stringify({
      amountInCents: this.amountInCents.toString(),
      currencyCode: this.currency.code,
    });
  }

  static deserialize(serialized: string): Money {
    const data = JSON.parse(serialized);
    const currency = Currency.fromCode(data.currencyCode);
    return new Money(BigInt(data.amountInCents), currency);
  }

  convertTo(targetCurrency: Currency): Money {
    const convertedCents = Currency.convert(this.amountInCents, this.currency, targetCurrency);
    return new Money(convertedCents, targetCurrency);
  }
}
