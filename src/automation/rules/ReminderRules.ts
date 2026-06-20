import { AutomationRule } from './AutomationRule';
import { AutomationContext } from '../AutomationContext';
import { RuleResult } from './RuleResult';
import { Money } from '../../domain/finance/Money';

export class ReminderRules implements AutomationRule {
  readonly id = 'reminder-rules';
  readonly name = 'Upcoming Bill Reminders';
  readonly priority = 'HIGH';
  readonly cooldownDuration = 12 * 60 * 60 * 1000; // 12 hours
  readonly dependencies = [];

  shouldRun(context: AutomationContext): boolean {
    const eventType = context.event.eventType;
    // Evaluates during scheduler tick or profile changes
    return eventType === 'ProfileUpdated' || eventType === 'SchedulerTick';
  }

  async evaluate(context: AutomationContext): Promise<RuleResult> {
    const start = performance.now();
    const snapshot = context.snapshot;
    const actions: any[] = [];
    let success = false;
    let reason = 'No bill reminders due in the near future.';
    let recommendation = 'Your payment schedules look clear.';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const dueTodayBills: string[] = [];
    const overdueBills: string[] = [];
    const upcomingBills: string[] = [];

    const reminders = snapshot.reminders || [];

    for (const reminder of reminders) {
      if (reminder.is_paid) continue;

      const dueDate = new Date(reminder.due_date);
      const normalizedDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      
      const diffTime = normalizedDueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const amountFormatted = Money.fromDecimal(reminder.amount).format();

      if (diffDays < 0) {
        success = true;
        overdueBills.push(reminder.title);
        actions.push({
          type: 'send_notification',
          category: 'bill',
          priority: 'CRITICAL',
          title: 'Bill Overdue! ⚠️',
          message: `Your bill "${reminder.title}" for ${amountFormatted} was due on ${reminder.due_date}. Please pay immediately.`,
          actionLabel: 'Pay Bill',
          actionRoute: '/reminders',
          metadata: {
            reminderId: reminder.id,
            title: reminder.title,
            amount: reminder.amount,
            dueDate: reminder.due_date,
            status: 'overdue'
          }
        });
      } else if (diffDays === 0) {
        success = true;
        dueTodayBills.push(reminder.title);
        actions.push({
          type: 'send_notification',
          category: 'bill',
          priority: 'HIGH',
          title: 'Bill Due Today',
          message: `Your bill "${reminder.title}" for ${amountFormatted} is due today!`,
          actionLabel: 'Pay Bill',
          actionRoute: '/reminders',
          metadata: {
            reminderId: reminder.id,
            title: reminder.title,
            amount: reminder.amount,
            dueDate: reminder.due_date,
            status: 'due_today'
          }
        });
      } else if (diffDays > 0 && diffDays <= 3) {
        success = true;
        upcomingBills.push(`${reminder.title} (in ${diffDays} days)`);
        actions.push({
          type: 'send_notification',
          category: 'reminder',
          priority: 'MEDIUM',
          title: 'Upcoming Bill Reminder',
          message: `Friendly reminder: Your bill "${reminder.title}" for ${amountFormatted} is due in ${diffDays} days (${reminder.due_date}).`,
          actionLabel: 'View Reminders',
          actionRoute: '/reminders',
          metadata: {
            reminderId: reminder.id,
            title: reminder.title,
            amount: reminder.amount,
            dueDate: reminder.due_date,
            status: 'upcoming',
            daysRemaining: diffDays
          }
        });
      }
    }

    if (overdueBills.length > 0) {
      reason = `Overdue bills detected: ${overdueBills.join(', ')}.`;
      recommendation = 'Please complete your pending payments immediately to avoid credit score impacts.';
    } else if (dueTodayBills.length > 0) {
      reason = `Bills due today: ${dueTodayBills.join(', ')}.`;
      recommendation = 'Ensure to pay these bills before today ends.';
    } else if (upcomingBills.length > 0) {
      reason = `Upcoming bills due within 3 days: ${upcomingBills.join(', ')}.`;
      recommendation = 'Verify checking accounts have enough cash flow to cover upcoming bill payments.';
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
        totalRemindersChecked: reminders.length,
        overdueCount: overdueBills.length,
        dueTodayCount: dueTodayBills.length,
        upcomingCount: upcomingBills.length
      },
      actions,
      timestamp: new Date()
    };
  }
}
