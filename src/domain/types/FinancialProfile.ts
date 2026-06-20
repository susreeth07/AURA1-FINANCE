import { Money } from '../finance/Money';

export interface SalaryHistoryEntry {
  readonly month: string; // YYYY-MM
  readonly amount: Money;
}

export interface FinancialProfile {
  readonly email: string;
  readonly name: string;
  readonly avatar: string;
  readonly monthlySalary: Money;
  readonly additionalIncome: Money;
  readonly currentSavings: Money;
  readonly rent: Money;
  readonly fixedExpenses: Money;
  readonly monthlyBills: Money;
  readonly emiLoans: Money;
  readonly savingsGoalPercentage: number;
  readonly hasSetupProfile: boolean;
  readonly onboardingStep?: number;
  readonly completedAt?: Date;
  readonly salaryHistory: readonly SalaryHistoryEntry[];
}
