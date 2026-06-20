export interface StructuredTemplate {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  readonly icon: string;
  readonly actionLabel?: string;
  readonly actionRoute?: string;
  readonly category: string;
}

export const NotificationTemplates: Record<string, StructuredTemplate> = {
  BUDGET_EXCEEDED: {
    id: 'budget_exceeded',
    title: 'Budget Exceeded! ⚠️',
    body: 'You have exceeded your {category} budget of {limit} (Spent: {spent}).',
    priority: 'CRITICAL',
    icon: 'AlertTriangle',
    actionLabel: 'View Budgets',
    actionRoute: '/budgets',
    category: 'budget'
  },
  BUDGET_ALERT: {
    id: 'budget_alert',
    title: 'Budget Alert Threshold Reached',
    body: 'Warning: You have used {percentage}% of your {category} budget ({spent} of {limit}).',
    priority: 'HIGH',
    icon: 'AlertCircle',
    actionLabel: 'View Budgets',
    actionRoute: '/budgets',
    category: 'budget'
  },
  GOAL_MILESTONE: {
    id: 'goal_milestone',
    title: 'Savings Milestone Reached! 🚀',
    body: 'Excellent progress! Your "{name}" savings goal is now {percentage}% funded ({current} of {target}).',
    priority: 'MEDIUM',
    icon: 'TrendingUp',
    actionLabel: 'View Goals',
    actionRoute: '/goals',
    category: 'goal'
  },
  GOAL_COMPLETED: {
    id: 'goal_completed',
    title: 'Goal Fully Funded! 🎉',
    body: 'Congratulations! You have fully funded your "{name}" savings target of {target}!',
    priority: 'HIGH',
    icon: 'Award',
    actionLabel: 'View Goals',
    actionRoute: '/goals',
    category: 'goal'
  },
  SALARY_RECEIVED: {
    id: 'salary_received',
    title: 'Salary Received! 💰',
    body: 'Inflow of {amount} detected. We suggest allocating {suggestedSavings} ({percentage}%) to your savings targets.',
    priority: 'MEDIUM',
    icon: 'DollarSign',
    actionLabel: 'Allocate Savings',
    actionRoute: '/goals',
    category: 'salary'
  },
  BILL_DUE: {
    id: 'bill_due',
    title: 'Bill Due Today',
    body: 'Your bill "{title}" for {amount} is due today!',
    priority: 'HIGH',
    icon: 'Calendar',
    actionLabel: 'Pay Bill',
    actionRoute: '/reminders',
    category: 'bill'
  },
  BILL_OVERDUE: {
    id: 'bill_overdue',
    title: 'Bill Overdue! ⚠️',
    body: 'Your bill "{title}" for {amount} was due on {dueDate}. Please pay immediately.',
    priority: 'CRITICAL',
    icon: 'Clock',
    actionLabel: 'Pay Bill',
    actionRoute: '/reminders',
    category: 'bill'
  },
  BILL_REMINDER: {
    id: 'bill_reminder',
    title: 'Upcoming Bill Reminder',
    body: 'Friendly reminder: Your bill "{title}" for {amount} is due in {daysRemaining} days ({dueDate}).',
    priority: 'MEDIUM',
    icon: 'Bell',
    actionLabel: 'View Reminders',
    actionRoute: '/reminders',
    category: 'reminder'
  },
  EMERGENCY_FUND_ALERT: {
    id: 'emergency_fund_alert',
    title: 'Emergency Reserve Low! ⚠️',
    body: 'Your emergency reserves of {currentSavings} are below the recommended 3-month runway of {targetRunway}. Deficit: {deficit}.',
    priority: 'CRITICAL',
    icon: 'ShieldAlert',
    actionLabel: 'Adjust Target',
    actionRoute: '/profile',
    category: 'warning'
  },
  WEEKLY_SUMMARY: {
    id: 'weekly_summary',
    title: 'Weekly Financial Digest 📊',
    body: 'Your weekly summary: Inflow {inflow}, Outflow {outflow}. Net Flow: {netFlow}.',
    priority: 'INFO',
    icon: 'FileText',
    actionLabel: 'View Analytics',
    actionRoute: '/analytics',
    category: 'summary'
  },
  MONTHLY_SUMMARY: {
    id: 'monthly_summary',
    title: 'Monthly Performance Summary 📈',
    body: 'Monthly digest: Spent {spent} across budgets, saved {saved}. Emergency Fund buffer is at {runwayMonths} months.',
    priority: 'INFO',
    icon: 'TrendingUp',
    actionLabel: 'View Analytics',
    actionRoute: '/analytics',
    category: 'summary'
  }
};

export function formatTemplate(template: StructuredTemplate, variables: Record<string, any>): {
  readonly title: string;
  readonly body: string;
  readonly priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  readonly icon: string;
  readonly category: string;
  readonly actionLabel?: string;
  readonly actionRoute?: string;
} {
  let body = template.body;
  let title = template.title;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    const stringValue = String(value);
    body = body.replace(new RegExp(placeholder, 'g'), stringValue);
    title = title.replace(new RegExp(placeholder, 'g'), stringValue);
  }
  
  return {
    ...template,
    title,
    body
  };
}
