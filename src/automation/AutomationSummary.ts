import { NotificationItem } from '../repositories/notificationRepository';
import { HealthStatus, AutomationHealth } from './AutomationHealth';
import { AutomationHistory } from './AutomationHistory';
import { AutomationMetrics } from './AutomationMetrics';

export interface AutomationSummary {
  readonly unreadNotifications: readonly NotificationItem[];
  readonly upcomingReminders: readonly any[];
  readonly recentAutomations: readonly any[];
  readonly criticalAlerts: readonly NotificationItem[];
  readonly platformHealth: HealthStatus;
  readonly statistics: Record<string, any>;
  readonly timestamp: Date;
}

export class AutomationSummaryCompiler {
  static compile(
    userId: string,
    notifications: readonly NotificationItem[],
    reminders: readonly any[],
    queueSize: number,
    dlqSize: number,
    activeWorkers: number,
    workerFailures: number
  ): AutomationSummary {
    const unread = notifications.filter(n => !n.isRead);
    const critical = notifications.filter(n => n.priority === 'CRITICAL' && !n.isRead);
    
    const upcoming = (reminders || [])
      .filter(r => !r.is_paid)
      .slice(0, 5);

    const history = AutomationHistory.getHistory(userId).slice(-5);
    const health = AutomationHealth.checkHealth(queueSize, dlqSize, activeWorkers, workerFailures);
    const metrics = AutomationMetrics.getMetrics();

    return {
      unreadNotifications: unread,
      upcomingReminders: upcoming,
      recentAutomations: history,
      criticalAlerts: critical,
      platformHealth: health,
      statistics: metrics,
      timestamp: new Date()
    };
  }
}
