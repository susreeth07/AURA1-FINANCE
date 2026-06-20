import { AutomationRule } from './AutomationRule';
import { AutomationContext } from '../AutomationContext';
import { RuleResult } from './RuleResult';

export class RecurringRules implements AutomationRule {
  readonly id = 'recurring-rules';
  readonly name = 'Recurring Automation Actions';
  readonly priority = 'BACKGROUND';
  readonly cooldownDuration = 24 * 60 * 60 * 1000; // 24 hours
  readonly dependencies = [];

  shouldRun(context: AutomationContext): boolean {
    const eventType = context.event.eventType;
    return eventType === 'SchedulerTick' || eventType === 'SalaryUpdated' || eventType === 'IncomeAdded';
  }

  async evaluate(context: AutomationContext): Promise<RuleResult> {
    const start = performance.now();
    const event = context.event;
    const snapshot = context.snapshot;
    const actions: any[] = [];
    let success = false;
    let reason = 'No recurring routines required processing.';
    let recommendation = 'Automated periodic templates are operating normally.';

    const isSalaryAdded = event.eventType === 'IncomeAdded' && 
      (event.payload.category || '').toLowerCase() === 'salary';

    if (isSalaryAdded || event.eventType === 'SalaryUpdated') {
      success = true;
      const salaryAmount = event.payload.amount || snapshot.profile.monthlySalary;
      const targetPercent = snapshot.profile.savingsGoalPercentage || 20;
      
      const suggestedSavings = salaryAmount.multiply(BigInt(targetPercent)).divide(100n);

      reason = `Salary inflow captured. Recommended savings target allocation is ${suggestedSavings.format()} (${targetPercent}%).`;
      recommendation = 'Transfer this suggested amount to your savings goals.';

      actions.push({
        type: 'send_notification',
        category: 'salary',
        priority: 'MEDIUM',
        title: 'Salary Received! 💰',
        message: `Salary of ${salaryAmount.format()} detected. We suggest allocating ${suggestedSavings.format()} (${targetPercent}%) to your savings targets.`,
        actionLabel: 'Allocate Savings',
        actionRoute: '/goals',
        metadata: {
          salaryAmount: salaryAmount.toDecimal(),
          suggestedSavings: suggestedSavings.toDecimal(),
          targetPercent
        }
      });
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
        eventType: event.eventType
      },
      actions,
      timestamp: new Date()
    };
  }
}
