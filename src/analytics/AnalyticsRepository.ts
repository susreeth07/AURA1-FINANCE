import { profileService } from '../services/profileService';
import { incomeRepository } from '../repositories/incomeRepository';
import { expenseRepository } from '../repositories/expenseRepository';
import { budgetRepository } from '../repositories/budgetRepository';
import { savingsGoalRepository } from '../repositories/savingsGoalRepository';
import { supabase } from '../lib/supabaseClient';
import { AnalyticsSnapshot } from './AnalyticsSnapshot';
import { Money } from '../domain/finance/Money';
import { Currency } from '../domain/finance/Currency';
import { FinancialProfile } from '../domain/types/FinancialProfile';
import { Income } from '../domain/types/Income';
import { Expense } from '../domain/types/Expense';
import { Budget } from '../domain/types/Budget';
import { SavingsGoal } from '../domain/types/SavingsGoal';
import { TimelineSnapshot } from '../domain/timeline/FinancialTimeline';
import { CashFlow } from '../domain/types/CashFlow';

export class AnalyticsRepository {
  /**
   * Load raw database data and build a fully populated AnalyticsSnapshot mapped to Domain Models.
   */
  static async loadSnapshot(userId: string): Promise<AnalyticsSnapshot> {
    const [
      profileModel,
      rawIncomes,
      rawExpenses,
      rawBudgets,
      rawGoals,
      rawNotifications
    ] = await Promise.all([
      profileService.loadProfile(userId),
      incomeRepository.fetchIncomes(userId, undefined, 1, 5000),
      expenseRepository.fetchExpenses(userId, undefined, 1, 5000),
      budgetRepository.fetchBudgets(userId),
      savingsGoalRepository.fetchSavingsGoals(userId),
      supabase.from('system_notifications').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(20)
    ]);

    if (!profileModel) {
      throw new Error(`Profile not found for user: ${userId}`);
    }

    const currency = Currency.USD;

    const domainProfile: FinancialProfile = {
      email: profileModel.email,
      name: profileModel.name,
      avatar: profileModel.avatar,
      monthlySalary: Money.fromDecimal(profileModel.monthlySalary, currency),
      additionalIncome: Money.fromDecimal(profileModel.additionalIncome, currency),
      currentSavings: Money.fromDecimal(profileModel.currentSavings, currency),
      rent: Money.fromDecimal(profileModel.rent, currency),
      fixedExpenses: Money.fromDecimal(profileModel.fixedExpenses, currency),
      monthlyBills: Money.fromDecimal(profileModel.monthlyBills, currency),
      emiLoans: Money.fromDecimal(profileModel.emiLoans, currency),
      savingsGoalPercentage: profileModel.savingsGoalPercentage,
      hasSetupProfile: profileModel.hasSetupProfile,
      onboardingStep: profileModel.onboardingStep,
      completedAt: profileModel.completedAt ? new Date(profileModel.completedAt) : undefined,
      salaryHistory: (profileModel.salaryHistory || []).map((entry: any) => ({
        month: entry.month,
        amount: Money.fromDecimal(entry.amount, currency)
      }))
    };

    const domainIncomes: Income[] = rawIncomes.data.map((i) => ({
      id: i.id,
      source: i.source,
      amount: Money.fromDecimal(i.amount, currency),
      category: i.category,
      date: new Date(i.date),
      description: i.description,
      isRecurring: i.isRecurring || false
    }));

    const domainExpenses: Expense[] = rawExpenses.data.map((e) => ({
      id: e.id,
      merchant: e.merchant,
      amount: Money.fromDecimal(e.amount, currency),
      category: e.category,
      date: new Date(e.date),
      description: e.description,
      isRecurring: e.isRecurring || false,
      frequency: e.frequency
    }));

    const domainBudgets: Budget[] = rawBudgets.map((b) => {
      const matchingExpenses = domainExpenses.filter(
        (e) => e.category.toLowerCase() === b.category.toLowerCase()
      );
      const spent = matchingExpenses.reduce(
        (sum, e) => sum.add(e.amount),
        Money.zero(currency)
      );

      return {
        id: b.id,
        category: b.category,
        limit: Money.fromDecimal(b.limit, currency),
        spent,
        color: b.color,
        alertThreshold: b.alertThreshold
      };
    });

    const domainGoals: SavingsGoal[] = rawGoals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: Money.fromDecimal(g.targetAmount, currency),
      currentAmount: Money.fromDecimal(g.currentAmount, currency),
      category: g.category,
      targetDate: new Date(g.targetDate),
      icon: g.icon
    }));

    const cashFlowHistory = this.compileCashFlowHistory(domainIncomes, domainExpenses, currency);
    const timelineHistory = this.compileTimelineHistory(domainProfile, cashFlowHistory, currency);

    return {
      profile: domainProfile,
      incomes: domainIncomes,
      expenses: domainExpenses,
      budgets: domainBudgets,
      savingsGoals: domainGoals,
      notifications: rawNotifications.data || [],
      timelineHistory,
      cashFlowHistory
    };
  }

  private static getMonthStr(date: Date): string {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    return `${y}-${m < 10 ? '0' + m : m}`;
  }

  private static compileCashFlowHistory(
    incomes: Income[],
    expenses: Expense[],
    currency: Currency
  ): CashFlow[] {
    const monthlyMap = new Map<string, { inflow: bigint; outflow: bigint }>();

    for (const inc of incomes) {
      const month = this.getMonthStr(inc.date);
      const current = monthlyMap.get(month) || { inflow: 0n, outflow: 0n };
      monthlyMap.set(month, { ...current, inflow: current.inflow + inc.amount.cents });
    }

    for (const exp of expenses) {
      const month = this.getMonthStr(exp.date);
      const current = monthlyMap.get(month) || { inflow: 0n, outflow: 0n };
      monthlyMap.set(month, { ...current, outflow: current.outflow + exp.amount.cents });
    }

    const sortedMonths = Array.from(monthlyMap.keys()).sort();
    return sortedMonths.map((month) => {
      const { inflow, outflow } = monthlyMap.get(month)!;
      const inflowMoney = Money.fromCents(inflow, currency);
      const outflowMoney = Money.fromCents(outflow, currency);
      const netFlow = inflowMoney.subtract(outflowMoney);
      const rate = inflow === 0n ? 0 : Number((netFlow.cents * 10000n) / inflow) / 100;
      const burnRate = outflowMoney.divide(30n);

      return {
        month,
        inflow: inflowMoney,
        outflow: outflowMoney,
        netFlow,
        savingsRate: rate,
        burnRate
      };
    });
  }

  private static compileTimelineHistory(
    profile: FinancialProfile,
    cashFlowHistory: CashFlow[],
    currency: Currency
  ): TimelineSnapshot[] {
    let runningBalance = profile.currentSavings;
    const snapshots: TimelineSnapshot[] = [];
    let previousSavings = Money.zero(currency);

    for (const cf of cashFlowHistory) {
      const net = cf.netFlow;
      const monthSavings = previousSavings.add(net.isPositive() ? net : Money.zero(currency));
      
      let growthRate = 0;
      if (!previousSavings.isZero()) {
        const diff = monthSavings.subtract(previousSavings);
        growthRate = Number((diff.cents * 100n) / previousSavings.cents);
      }

      snapshots.push({
        month: cf.month,
        balance: runningBalance.add(net),
        savings: monthSavings,
        growthRate
      });

      previousSavings = monthSavings;
      runningBalance = runningBalance.add(net);
    }

    return snapshots;
  }
}
