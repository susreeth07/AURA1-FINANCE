import { QueueJob } from './queue/Queue';
import { AutomationRuleRegistry } from './AutomationRuleRegistry';
import { AutomationContext } from './AutomationContext';
import { AutomationState } from './AutomationState';
import { AutomationHistory } from './AutomationHistory';
import { AutomationMetrics } from './AutomationMetrics';
import { NotificationChannel } from './NotificationChannel';
import { ActionCenter } from './ActionCenter';
import { AnalyticsRepository } from '../analytics/AnalyticsRepository';

export class AutomationEngine {
  private registry: AutomationRuleRegistry;
  private channels = new Map<string, NotificationChannel>();

  constructor(registry: AutomationRuleRegistry) {
    this.registry = registry;
  }

  registerChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
  }

  async executeJob(job: QueueJob): Promise<void> {
    const userId = job.event.userId;

    // 1. Load active database snapshot for context calculation
    const snapshot = await AnalyticsRepository.loadSnapshot(userId);

    const context: AutomationContext = {
      userId,
      event: job.event,
      snapshot,
      timezone: 'UTC',
      correlationId: job.event.correlationId
    };

    // 2. Fetch sorted active rules (topological order)
    const rules = this.registry.getSortedRules();

    for (const rule of rules) {
      if (!rule.shouldRun(context)) {
        continue;
      }

      // Cooldown Suppression
      if (AutomationState.isCooldownActive(userId, rule.id)) {
        AutomationHistory.log({
          timestamp: new Date(),
          userId,
          ruleId: rule.id,
          success: true,
          skipped: true,
          durationMs: 0,
          actionsTriggered: 0
        });
        continue;
      }

      const ruleStart = performance.now();
      try {
        const result = await rule.evaluate(context);
        const ruleDuration = performance.now() - ruleStart;

        AutomationMetrics.recordRuleDuration(rule.id, ruleDuration);

        // Save execution states & cooldown expirations
        const cooldownExpires = new Date(Date.now() + (rule.cooldownDuration || 0));
        AutomationState.updateState(userId, rule.id, {
          lastExecuted: new Date(),
          cooldownExpires,
          executionStatus: 'success',
          retryCount: 0
        });

        // Dispatch Actions (send notifications)
        if (result.success && result.actions.length > 0) {
          for (const action of result.actions) {
            if (action.type === 'send_notification') {
              await this.dispatchNotification(userId, action);
            }
          }
        }

        AutomationHistory.log({
          timestamp: new Date(),
          userId,
          ruleId: rule.id,
          success: true,
          skipped: false,
          durationMs: ruleDuration,
          actionsTriggered: result.actions.length
        });
      } catch (err: any) {
        const ruleDuration = performance.now() - ruleStart;
        console.error(`[AutomationEngine] Rule evaluation failure in: ${rule.id}`, err);

        AutomationState.updateState(userId, rule.id, {
          executionStatus: 'failed',
          retryCount: (AutomationState.getState(userId, rule.id)?.retryCount || 0) + 1
        });

        AutomationHistory.log({
          timestamp: new Date(),
          userId,
          ruleId: rule.id,
          success: false,
          skipped: false,
          durationMs: ruleDuration,
          actionsTriggered: 0,
          errorMsg: err.message
        });
      }
    }

    // Refresh ActionCenter dashboard feeds
    const updatedSnapshot = await AnalyticsRepository.loadSnapshot(userId);
    
    // Map database notification records to UI NotificationItem contracts
    const rawNotifications = updatedSnapshot.notifications || [];
    const uiNotifications = rawNotifications.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      status: row.status || (row.is_read ? 'read' : 'delivered'),
      isRead: row.is_read || row.status === 'read',
      createdAt: new Date(row.created_at || Date.now()),
      priority: row.priority || (row.title.includes('⚠️') || row.title.includes('Exceeded') || row.title.includes('Overdue') ? 'CRITICAL' : 'INFO')
    }));

    ActionCenter.update({
      unreadNotifications: uiNotifications.filter(n => !n.isRead),
      upcomingReminders: (updatedSnapshot.reminders || []).filter(r => !r.is_paid).slice(0, 5),
      criticalAlerts: uiNotifications.filter(n => n.priority === 'CRITICAL' && !n.isRead)
    });
  }

  private async dispatchNotification(userId: string, action: any): Promise<void> {
    const channel = this.channels.get('in-app');
    if (!channel) {
      console.warn('[AutomationEngine] In-App channel driver not found.');
      return;
    }

    await channel.send({
      userId,
      type: action.category,
      title: action.title,
      message: action.message,
      status: 'created',
      isRead: false
    });
  }
}
