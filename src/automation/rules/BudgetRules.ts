import { AutomationRule } from './AutomationRule';
import { AutomationContext } from '../AutomationContext';
import { RuleResult } from './RuleResult';

export class BudgetRules implements AutomationRule {
  readonly id = 'budget-rules';
  readonly name = 'Budget Limit Warnings';
  readonly priority = 'HIGH';
  readonly cooldownDuration = 24 * 60 * 60 * 1000; // 24 hours
  readonly dependencies = [];

  shouldRun(context: AutomationContext): boolean {
    const eventType = context.event.eventType;
    return eventType === 'ExpenseAdded' || eventType === 'ExpenseUpdated' || eventType === 'BudgetUpdated';
  }

  async evaluate(context: AutomationContext): Promise<RuleResult> {
    const start = performance.now();
    const snapshot = context.snapshot;
    const actions: any[] = [];
    let success = false;
    let reason = 'All budgets are within safe limits.';
    let recommendation = 'Keep maintaining your healthy spending habits.';

    const overspentBudgets: string[] = [];
    const warningBudgets: string[] = [];

    for (const budget of snapshot.budgets) {
      if (budget.limit.isZero()) continue;

      const spent = budget.spent;
      const limit = budget.limit;
      const percentage = Number((spent.cents * 100n) / limit.cents);

      if (percentage >= 100) {
        success = true;
        overspentBudgets.push(budget.category);
        actions.push({
          type: 'send_notification',
          category: 'budget',
          priority: 'CRITICAL',
          title: 'Budget Exceeded!',
          message: `You have exceeded your ${budget.category} budget limit of ${limit.format()} (Spent: ${spent.format()}).`,
          actionLabel: 'Manage Budgets',
          actionRoute: '/budgets',
          metadata: {
            categoryId: budget.id,
            category: budget.category,
            percentage,
            spent: spent.toDecimal(),
            limit: limit.toDecimal()
          }
        });
      } else if (percentage >= (budget.alertThreshold || 90)) {
        success = true;
        warningBudgets.push(budget.category);
        actions.push({
          type: 'send_notification',
          category: 'warning',
          priority: 'HIGH',
          title: 'Budget Alert Threshold Reached',
          message: `Warning: You have used ${percentage}% of your ${budget.category} budget (${spent.format()} of ${limit.format()}).`,
          actionLabel: 'Manage Budgets',
          actionRoute: '/budgets',
          metadata: {
            categoryId: budget.id,
            category: budget.category,
            percentage,
            spent: spent.toDecimal(),
            limit: limit.toDecimal()
          }
        });
      }
    }

    if (overspentBudgets.length > 0) {
      reason = `Critical overspending detected in: ${overspentBudgets.join(', ')}.`;
      recommendation = 'Immediately limit non-essential expenses or increase budget limits.';
    } else if (warningBudgets.length > 0) {
      reason = `Approaching budget limit in: ${warningBudgets.join(', ')}.`;
      recommendation = 'Postpone major shopping or dining purchases for the rest of the month.';
    }

    const duration = performance.now() - start;

    return {
      ruleId: this.id,
      ruleName: this.name,
      version: '1.0',
      success,
      priority: this.priority,
      duration,
      confidence: 100,
      reason,
      recommendation,
      metrics: {
        totalBudgetsChecked: snapshot.budgets.length,
        overspentCount: overspentBudgets.length,
        warningCount: warningBudgets.length
      },
      actions,
      timestamp: new Date()
    };
  }
}
