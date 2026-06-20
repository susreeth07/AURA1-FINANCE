import { Income } from '../types/Income';
import { Expense } from '../types/Expense';
import { Money } from '../finance/Money';
import { Currency } from '../finance/Currency';

export class CashFlowEngine {
  static calculateTotalInflow(incomes: Income[], currency: Currency = Currency.USD): Money {
    return incomes.reduce((sum, income) => {
      const converted = income.amount.convertTo(currency);
      return sum.add(converted);
    }, Money.zero(currency));
  }

  static calculateTotalOutflow(expenses: Expense[], currency: Currency = Currency.USD): Money {
    return expenses.reduce((sum, expense) => {
      const converted = expense.amount.convertTo(currency);
      return sum.add(converted);
    }, Money.zero(currency));
  }

  static calculateNetCashFlow(inflow: Money, outflow: Money): Money {
    return inflow.subtract(outflow);
  }

  static calculateSavingsRate(inflow: Money, netFlow: Money): number {
    if (inflow.isZero() || inflow.isNegative()) return 0;
    if (netFlow.isNegative()) return 0;
    const ratio = (netFlow.cents * 10000n) / inflow.cents;
    return Number(ratio) / 100;
  }

  static calculateBurnRate(outflow: Money, daysInPeriod: number): Money {
    if (daysInPeriod <= 0) return outflow;
    return outflow.divide(BigInt(daysInPeriod));
  }

  static calculateMoMTrendPercentage(previousNetFlow: Money, currentNetFlow: Money): number {
    if (previousNetFlow.isZero()) {
      return currentNetFlow.isZero() ? 0 : (currentNetFlow.isPositive() ? 100 : -100);
    }
    const prevCents = previousNetFlow.cents;
    const diff = currentNetFlow.cents - prevCents;
    const absPrevCents = prevCents < 0n ? -prevCents : prevCents;
    const ratio = (diff * 10000n) / absPrevCents;
    return Number(ratio) / 100;
  }
}
