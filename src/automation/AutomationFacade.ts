import { DomainEvent } from '../domain/events/FinancialEvents';
import { Queue } from './queue/Queue';
import { MemoryQueue } from './queue/MemoryQueue';
import { WorkerPool } from './WorkerPool';
import { AutomationEngine } from './AutomationEngine';
import { AutomationRuleRegistry } from './AutomationRuleRegistry';
import { InAppNotificationChannel } from './channels/InAppNotificationChannel';
import { InMemoryScheduler } from './InMemoryScheduler';
import { Scheduler } from './Scheduler';
import { AutomationSummary, AutomationSummaryCompiler } from './AutomationSummary';
import { ActionCenter, ActionCenterPayload } from './ActionCenter';
import { AutomationConfig } from './AutomationConfig';
import { AutomationEventBus } from './AutomationEventBus';
import { AnalyticsRepository } from '../analytics/AnalyticsRepository';
import { logger } from '../utils/logger';

// Rule Implementations
import { BudgetRules } from './rules/BudgetRules';
import { GoalRules } from './rules/GoalRules';
import { ReminderRules } from './rules/ReminderRules';
import { EmergencyRules } from './rules/EmergencyRules';
import { RecurringRules } from './rules/RecurringRules';

export class AutomationFacade {
  private static queue: Queue;
  private static workerPool: WorkerPool;
  private static engine: AutomationEngine;
  private static registry: AutomationRuleRegistry;
  private static scheduler: Scheduler;
  private static initialized = false;

  static initialize(profile: 'development' | 'testing' | 'production' = 'production'): void {
    if (AutomationFacade.initialized) {
      return;
    }

    AutomationConfig.setProfile(profile);

    // Instantiate registries, queues, and schedulers
    AutomationFacade.queue = new MemoryQueue();
    AutomationFacade.registry = new AutomationRuleRegistry();
    AutomationFacade.scheduler = new InMemoryScheduler();

    // Register active rule engines
    AutomationFacade.registry.register(new BudgetRules());
    AutomationFacade.registry.register(new GoalRules());
    AutomationFacade.registry.register(new ReminderRules());
    AutomationFacade.registry.register(new EmergencyRules());
    AutomationFacade.registry.register(new RecurringRules());

    // Coordinate engine and channels
    AutomationFacade.engine = new AutomationEngine(AutomationFacade.registry);
    AutomationFacade.engine.registerChannel(new InAppNotificationChannel());

    // Configure worker runtimes
    AutomationFacade.workerPool = new WorkerPool(AutomationFacade.queue, async (job) => {
      await AutomationFacade.engine.executeJob(job);
    });
    AutomationFacade.workerPool.start();

    // Hook listeners into the DomainEventBus
    AutomationEventBus.start();

    AutomationFacade.initialized = true;
    logger.debug(`[AutomationFacade] Hardened platform initialized under profile: ${profile}`);
  }

  static async enqueueEvent(event: DomainEvent, priority: number): Promise<void> {
    if (!AutomationFacade.initialized) {
      AutomationFacade.initialize();
    }
    await AutomationFacade.queue.enqueue(event, priority);
  }

  static async getSummary(userId: string): Promise<AutomationSummary> {
    if (!AutomationFacade.initialized) {
      AutomationFacade.initialize();
    }
    const snapshot = await AnalyticsRepository.loadSnapshot(userId);
    
    const rawNotifications = snapshot.notifications || [];
    const uiNotifications = rawNotifications.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      status: row.status || (row.is_read ? 'read' : 'delivered'),
      isRead: row.is_read || row.status === 'read',
      createdAt: new Date(row.created_at || Date.now())
    }));

    const queueMetrics = AutomationFacade.queue.getMetrics();
    const poolMetrics = AutomationFacade.workerPool.getMetrics();

    return AutomationSummaryCompiler.compile(
      userId,
      uiNotifications,
      snapshot.reminders,
      queueMetrics.depth,
      queueMetrics.deadLetterCount,
      poolMetrics.activeWorkers,
      poolMetrics.totalFailures
    );
  }

  static getActionCenterPayload(): ActionCenterPayload {
    return ActionCenter.getPayload();
  }

  static getScheduler(): Scheduler {
    if (!AutomationFacade.initialized) {
      AutomationFacade.initialize();
    }
    return AutomationFacade.scheduler;
  }

  static shutdown(): void {
    if (!AutomationFacade.initialized) {
      return;
    }

    AutomationFacade.workerPool.stop();
    AutomationEventBus.stop();
    AutomationFacade.queue.clear();
    AutomationFacade.registry.clear();
    AutomationFacade.scheduler.clear();

    AutomationFacade.initialized = false;
    logger.debug('[AutomationFacade] System shut down.');
  }
}
