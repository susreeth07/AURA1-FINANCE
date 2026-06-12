import { IncomeItem, ExpenseItem, BudgetItem, SavingsGoal, BillReminder, UserProfile, SystemNotification } from './types';

export const INITIAL_USER_PROFILE: UserProfile = {
  name: "Alex Sterling",
  email: "pidaparthibharath@karunya.edu.in",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
  monthlySalary: 7500,
  additionalIncome: 1200,
  currentSavings: 24500,
  rent: 1800,
  fixedExpenses: 700,
  monthlyBills: 350,
  emiLoans: 450,
  savingsGoalPercentage: 20,
  hasSetupProfile: true,
  salaryHistory: [
    { month: "Jan 2026", amount: 7200 },
    { month: "Feb 2026", amount: 7200 },
    { month: "Mar 2026", amount: 7500 },
    { month: "Apr 2026", amount: 7500 },
    { month: "May 2026", amount: 7500 },
    { month: "Jun 2026", amount: 7500 },
  ]
};

export const INITIAL_INCOMES: IncomeItem[] = [
  { id: "inc-1", source: "Aura Tech Salary", amount: 7500, category: "Salary", date: "2026-06-01", description: "Monthly base salary payout", isRecurring: true },
  { id: "inc-2", source: "SaaS consulting contract", amount: 1200, category: "Freelance", date: "2026-06-04", description: "Vite App consulting project", isRecurring: false },
  { id: "inc-3", source: "Index Fund Dividend", amount: 320, category: "Investments", date: "2026-05-28", description: "Q2 Dividend payouts", isRecurring: true }
];

export const INITIAL_EXPENSES: ExpenseItem[] = [
  { id: "exp-1", merchant: "Prime Residence", amount: 1800, category: "Housing", date: "2026-06-01", description: "Monthly premium rent", isRecurring: true, frequency: "monthly" },
  { id: "exp-2", merchant: "Whole Foods Market", amount: 340, category: "Groceries", date: "2026-06-02", description: "Weekly organic provisioning", isRecurring: false },
  { id: "exp-3", merchant: "Le Paradiso Restaurant", amount: 120, category: "Dining Out", date: "2026-06-03", description: "Product celebration dinner", isRecurring: false },
  { id: "exp-4", merchant: "Apex Gym Club", amount: 90, category: "Health", date: "2026-06-01", description: "Premium gym subscription", isRecurring: true, frequency: "monthly" },
  { id: "exp-5", merchant: "Venture Electric", amount: 180, category: "Utilities", date: "2026-06-05", description: "Digital smart utility invoice", isRecurring: true, frequency: "monthly" },
  { id: "exp-6", merchant: "Netflix & Spotify", amount: 35, category: "Entertainment", date: "2026-06-02", description: "Digital streaming package", isRecurring: true, frequency: "monthly" },
  { id: "exp-7", merchant: "Local Fuel Station", amount: 65, category: "Transport", date: "2026-06-06", description: "Fuel filling check", isRecurring: false }
];

export const INITIAL_BUDGETS: BudgetItem[] = [
  { id: "b-1", category: "Housing", limit: 2000, spent: 1800, color: "#6366f1", alertThreshold: 90 },
  { id: "b-2", category: "Groceries", limit: 600, spent: 340, color: "#10b981", alertThreshold: 80 },
  { id: "b-3", category: "Dining Out", limit: 400, spent: 120, color: "#f59e0b", alertThreshold: 75 },
  { id: "b-4", category: "Entertainment", limit: 300, spent: 35, color: "#ec4899", alertThreshold: 80 },
  { id: "b-5", category: "Transport", limit: 250, spent: 65, color: "#3b82f6", alertThreshold: 85 },
  { id: "b-6", category: "Health", limit: 150, spent: 90, color: "#14b8a6", alertThreshold: 90 }
];

export const INITIAL_SAVINGS_GOALS: SavingsGoal[] = [
  { id: "g-1", name: "High-End AI Dev Laptop", targetAmount: 4000, currentAmount: 3200, category: "laptop", targetDate: "2026-08-15", icon: "Laptop" },
  { id: "g-2", name: "Riese & Müller Electric Bike", targetAmount: 6500, currentAmount: 2500, category: "bike", targetDate: "2026-12-01", icon: "Bike" },
  { id: "g-3", name: "Tesla Model S Plaid Fund", targetAmount: 85000, currentAmount: 18000, category: "car", targetDate: "2028-06-01", icon: "Car" },
  { id: "g-4", name: "Neo-Modern Lakeside House", targetAmount: 750000, currentAmount: 120000, category: "house", targetDate: "2035-01-01", icon: "Home" },
  { id: "g-5", name: "6-Month Security Buffer", targetAmount: 25000, currentAmount: 24500, category: "emergency", targetDate: "2026-07-01", icon: "ShieldAlert" },
  { id: "g-6", name: "Kyoto Autumn Sanctuary Trip", targetAmount: 5000, currentAmount: 3500, category: "vacation", targetDate: "2026-10-10", icon: "Palmtree" }
];

export const INITIAL_BILL_REMINDERS: BillReminder[] = [
  { id: "bill-1", title: "Amazon Web Services Hosting", amount: 145, dueDate: "2026-06-12", category: "Utilities", isPaid: false },
  { id: "bill-2", title: "Figma Professional Plan", amount: 45, dueDate: "2026-06-16", category: "Subscriptions", isPaid: false },
  { id: "bill-3", title: "Premium Health Premium", amount: 120, dueDate: "2026-06-20", category: "Health", isPaid: false },
  { id: "bill-4", title: "Smart Grid Power Inc", amount: 180, dueDate: "2026-06-05", category: "Utilities", isPaid: true }
];

export const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  { id: "not-1", type: "warning", title: "Housing Budget Threshold", message: "Your Housing budget is at 90% utilization (₹1800/₹2000 spent).", date: "2026-06-01T10:00:00Z", isRead: false },
  { id: "not-2", type: "goal", title: "Emergency Fund Near Completion", message: "Your '6-Month Security Buffer' is 98% complete! Just ₹500 more to hit target.", date: "2026-06-05T14:30:00Z", isRead: false },
  { id: "not-3", type: "bill", title: "Upcoming Bill Reminder", message: "AWS Web Services (₹145) is due in 3 days. Autopay active from Aura Card.", date: "2026-06-09T08:00:00Z", isRead: false },
  { id: "not-4", type: "ai", title: "AI Smart Insights available", message: "Aura AI detected ₹150 potential savings in dining categories over last month. Click to view tailored strategy.", date: "2026-06-08T18:12:00Z", isRead: true }
];

export const SUGGESTED_AI_QUESTIONS = [
  "What is my forecast balance for the end of the month?",
  "How can I cut expenses to allocate 10% more to my Bike goal?",
  "Analyze my category distribution this week compared to last month.",
  "Give me a daily budget guideline based on remaining liquid balance."
];

export const AI_PRESETS: { [key: string]: { text: string, insights?: string[] } } = {
  "default": {
    text: "Greeting! I am Aura AI, your financial augmentation agent. I've analyzed your current liquidity, recurring bills, and budget metrics.",
    insights: [
      "Total Active liquidity is at ₹24,500 with a monthly net savings yield of ~35.4%.",
      "You are on track to fund your 'Laptop' savings goal 14 days earlier than original targeting.",
      "A small anomaly was detected: Dining Out spending increased by 14% compared to standard weekly averages."
    ]
  },
  "balance": {
    text: "Checking your financial vectors... Based on your current income of ₹8,700/mo and total current expenses of ₹2,830, your net disposable surplus is ₹5,870. Under the current pacing, your end-of-month liquid cash will increment to ₹30,370.",
    insights: [
      "Current Burn Pacing: Excellent (Low friction)",
      "Financial Health Score: 94/100 (Extremely resilient)",
      "Suggested allocation: Auto-inject 40% of the surplus into your plural savings goals."
    ]
  },
  "bike": {
    text: "Excellent initiative. Your 'Riese & Müller Electric Bike' goal requires ₹4,000 more to complete. To reach this target 2.3 months faster, we can deploy two tactical budget modifications:",
    insights: [
      "Cap 'Dining Out' to ₹250/mo (Releases ₹150/mo potential flow).",
      "Defer vacation funding for 1 cycle (Releases ₹300/mo direct allocation).",
      "Combined adjustment raises daily target funding by ₹15/day, bringing your completion timeline from December 2026 to October 2026."
    ]
  },
  "category": {
    text: "Here is your multi-category breakdown. Housing represents the primary pillar at 63.6%, followed by Groceries (12.0%) and Utilities (6.4%). Dining Out represents only 4.2% of your spent limits.",
    insights: [
      "Fixed overhead metrics are high but compliant (total base bills: ₹3,300/mo).",
      "Flexible spending leaves a wide margin of safety (₹1,200 remains in discretionary reserve)."
    ]
  }
};
