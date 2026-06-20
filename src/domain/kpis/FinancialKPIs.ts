import { Money } from '../finance/Money';
import { FinancialProfile } from '../types/FinancialProfile';
import { CashFlow } from '../types/CashFlow';
import { Budget } from '../types/Budget';
import { FinancialMath } from '../engines/FinancialMath';
import { CashFlowEngine } from '../engines/CashFlowEngine';

export interface KPIReport {
  readonly savingsRate: number;
  readonly expenseRatio: number;
  readonly monthlyBurnRate: Money;
  readonly netCashFlow: Money;
  readonly averageBudgetUtilization: number;
  readonly liquidity: Money;
  readonly runwayMonths: number;
  readonly netWorthGrowthRate: number;
  readonly healthScore: number;
}

export class FinancialKPIs {
  static calculateKPIs(
    profile: FinancialProfile,
    cashFlowHistory: CashFlow[],
    budgets: Budget[]
  ): KPIReport {
    const currency = profile.monthlySalary.getCurrency();

    let netFlow = Money.zero(currency);
    let savingsRate = 0;
    let expenseRatio = 0;
    let burnRateVal = Money.zero(currency);

    if (cashFlowHistory.length > 0) {
      const latest = cashFlowHistory[cashFlowHistory.length - 1];
      netFlow = latest.netFlow;
      savingsRate = latest.savingsRate;
      burnRateVal = latest.burnRate;
      if (!latest.inflow.isZero()) {
        const ratio = (latest.outflow.cents * 10000n) / latest.inflow.cents;
        expenseRatio = Number(ratio) / 100;
      }
    } else {
      const inflow = profile.monthlySalary.add(profile.additionalIncome);
      const outflow = profile.rent
        .add(profile.fixedExpenses)
        .add(profile.monthlyBills)
        .add(profile.emiLoans);
      netFlow = inflow.subtract(outflow);
      savingsRate = CashFlowEngine.calculateSavingsRate(inflow, netFlow);
      burnRateVal = CashFlowEngine.calculateBurnRate(outflow, 30);
      if (!inflow.isZero()) {
        const ratio = (outflow.cents * 10000n) / inflow.cents;
        expenseRatio = Number(ratio) / 100;
      }
    }

    let totalLimit = Money.zero(currency);
    let totalSpent = Money.zero(currency);
    for (const budget of budgets) {
      totalLimit = totalLimit.add(budget.limit);
      totalSpent = totalSpent.add(budget.spent);
    }
    const averageBudgetUtilization = totalLimit.isZero()
      ? 0
      : Number((totalSpent.cents * 10000n) / totalLimit.cents) / 100;

    const liquidity = profile.currentSavings;
    const monthlyOutgoings = profile.rent
      .add(profile.fixedExpenses)
      .add(profile.monthlyBills)
      .add(profile.emiLoans);
    const runwayMonths = FinancialMath.calculateRunway(liquidity, monthlyOutgoings);

    let growthRate = 0;
    if (profile.salaryHistory.length >= 2) {
      const start = profile.salaryHistory[0].amount;
      const end = profile.salaryHistory[profile.salaryHistory.length - 1].amount;
      const years = (profile.salaryHistory.length - 1) / 12;
      growthRate = FinancialMath.calculateCAGR(start, end, years);
    }

    const savingsScore = FinancialMath.calculateSavingsScore(savingsRate);
    const budgetScore = FinancialMath.calculateBudgetAdherenceScore(averageBudgetUtilization);
    const liquidityScore = FinancialMath.calculateLiquidityScore(runwayMonths);
    const growthScore = Math.min(100, Math.max(0, Math.round(growthRate * 100)));
    const stabilityScore = FinancialMath.calculateStabilityScore(
      monthlyOutgoings,
      profile.monthlySalary.add(profile.additionalIncome)
    );

    const healthScore = FinancialMath.calculateOverallHealthScore({
      savingsScore,
      budgetScore,
      liquidityScore,
      netWorthGrowthScore: growthScore,
      stabilityScore,
    });

    return {
      savingsRate,
      expenseRatio,
      monthlyBurnRate: burnRateVal.multiply(30n),
      netCashFlow: netFlow,
      averageBudgetUtilization,
      liquidity,
      runwayMonths,
      netWorthGrowthRate: growthRate,
      healthScore,
    };
  }
}
