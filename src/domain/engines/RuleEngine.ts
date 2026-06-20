import { Budget } from '../types/Budget';
import { FinancialProfile } from '../types/FinancialProfile';
import { SavingsGoal } from '../types/SavingsGoal';
import { CashFlow } from '../types/CashFlow';
import { Money } from '../finance/Money';
import { Expense } from '../types/Expense';
import { FinancialConstants } from '../finance/FinancialConstants';
import { SavingsEngine } from './SavingsEngine';

export interface RuleResult {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly triggered: boolean;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly details: Record<string, any>;
}

export class RuleEngine {
  static evaluateBudgetExceeded(budget: Budget): RuleResult {
    const isExceeded = budget.spent.greaterThan(budget.limit);
    const ratio = budget.limit.isZero() ? 0 : Number((budget.spent.cents * 100n) / budget.limit.cents);
    
    return {
      ruleId: 'RULE_BUDGET_EXCEEDED',
      ruleName: 'Budget Exceeded',
      triggered: isExceeded,
      severity: isExceeded ? 'critical' : 'info',
      details: {
        category: budget.category,
        limit: budget.limit.serialize(),
        spent: budget.spent.serialize(),
        percentage: ratio,
      }
    };
  }

  static evaluateEmergencyFundLow(profile: FinancialProfile): RuleResult {
    const monthlyOutgoings = profile.rent
      .add(profile.fixedExpenses)
      .add(profile.monthlyBills)
      .add(profile.emiLoans);

    const recommendedMin = monthlyOutgoings.multiply(BigInt(FinancialConstants.EMERGENCY_FUND_MINIMUM_MONTHS));
    const isLow = profile.currentSavings.lessThan(recommendedMin);

    const ratio = monthlyOutgoings.isZero() 
      ? 999 
      : Number((profile.currentSavings.cents * 100n) / monthlyOutgoings.cents) / 100;

    return {
      ruleId: 'RULE_EMERGENCY_FUND_LOW',
      ruleName: 'Emergency Fund Low',
      triggered: isLow,
      severity: isLow ? 'critical' : 'info',
      details: {
        currentSavings: profile.currentSavings.serialize(),
        recommendedMinimum: recommendedMin.serialize(),
        monthsCovered: ratio,
      }
    };
  }

  static evaluateSavingsBehind(goal: SavingsGoal, currentDate: Date = new Date()): RuleResult {
    const requiredMonthly = SavingsEngine.calculateRequiredMonthlySavings(goal, currentDate);
    const isPast = goal.targetDate.getTime() < currentDate.getTime();
    const isNotFinished = goal.currentAmount.lessThan(goal.targetAmount);
    
    // Also trigger if required monthly saving exceeds the remaining target amount (meaning it's overdue or requires too much)
    const triggered = (isPast && isNotFinished) || (requiredMonthly.greaterThan(goal.targetAmount.subtract(goal.currentAmount)));

    return {
      ruleId: 'RULE_SAVINGS_BEHIND',
      ruleName: 'Savings Goal Behind Schedule',
      triggered,
      severity: triggered ? 'critical' : 'info',
      details: {
        goalName: goal.name,
        targetAmount: goal.targetAmount.serialize(),
        currentAmount: goal.currentAmount.serialize(),
        targetDate: goal.targetDate.toISOString(),
        requiredMonthly: requiredMonthly.serialize(),
      }
    };
  }

  static evaluateNegativeCashFlow(cashFlow: CashFlow): RuleResult {
    const isNegative = cashFlow.netFlow.isNegative();

    return {
      ruleId: 'RULE_NEGATIVE_CASH_FLOW',
      ruleName: 'Negative Cash Flow',
      triggered: isNegative,
      severity: isNegative ? 'warning' : 'info',
      details: {
        month: cashFlow.month,
        inflow: cashFlow.inflow.serialize(),
        outflow: cashFlow.outflow.serialize(),
        netFlow: cashFlow.netFlow.serialize(),
      }
    };
  }

  static evaluateSpendingAnomalies(currentMonthExpenses: Expense[], historicalAverage: Money): RuleResult {
    const totalCurrent = currentMonthExpenses.reduce((sum, e) => sum.add(e.amount), Money.zero(historicalAverage.getCurrency()));
    const threshold = historicalAverage.multiply(2n);
    const triggered = totalCurrent.greaterThan(threshold) && !historicalAverage.isZero();

    return {
      ruleId: 'RULE_SPENDING_ANOMALY',
      ruleName: 'Financial Spending Anomaly Detected',
      triggered,
      severity: triggered ? 'warning' : 'info',
      details: {
        totalCurrent: totalCurrent.serialize(),
        historicalAverage: historicalAverage.serialize(),
        ratio: historicalAverage.isZero() ? 0 : Number((totalCurrent.cents * 100n) / historicalAverage.cents) / 100,
      }
    };
  }
}
