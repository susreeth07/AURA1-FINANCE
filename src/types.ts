export interface IncomeItem {
  id: string;
  source: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  isRecurring?: boolean;
}

export interface ExpenseItem {
  id: string;
  merchant: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  isRecurring?: boolean;
  frequency?: 'monthly' | 'yearly' | 'weekly';
}

export interface BudgetItem {
  id: string;
  category: string;
  limit: number;
  spent: number;
  color: string;
  alertThreshold: number; // percentage (e.g. 80 for 80%)
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: 'laptop' | 'bike' | 'car' | 'house' | 'emergency' | 'vacation';
  targetDate: string;
  icon: string;
}

export interface BillReminder {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  category: string;
  isPaid: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  monthlySalary: number;
  additionalIncome: number;
  currentSavings: number;
  rent: number;
  fixedExpenses: number;
  monthlyBills: number;
  emiLoans: number;
  savingsGoalPercentage: number;
  hasSetupProfile: boolean;
  onboardingStep?: number;
  completedAt?: string;
  salaryHistory: { month: string; amount: number }[];
}

export interface SystemNotification {
  id: string;
  type: 'budget' | 'goal' | 'bill' | 'warning' | 'ai';
  title: string;
  message: string;
  date: string;
  isRead: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  insights?: string[];
}

export type AppTheme = 'dark' | 'light';
