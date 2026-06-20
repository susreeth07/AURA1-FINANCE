import { DomainEventBus } from '../domain/events/DomainEventBus';
import { DomainEvent } from '../domain/events/FinancialEvents';
import { AutomationFacade } from './AutomationFacade';

export class AutomationEventBus {
  private static unsubscribe: (() => void) | null = null;

  static start(): void {
    if (AutomationEventBus.unsubscribe) {
      return;
    }
    
    AutomationEventBus.unsubscribe = DomainEventBus.subscribe((event) => {
      const priority = AutomationEventBus.determinePriority(event);
      AutomationFacade.enqueueEvent(event, priority);
    });
  }

  private static determinePriority(event: DomainEvent): number {
    switch (event.eventType) {
      case 'BudgetExceeded':
        return 5; // CRITICAL
      case 'IncomeAdded':
        const category = (event.payload.category || '').toLowerCase();
        return category === 'salary' ? 4 : 2; // HIGH for Salary receipt, else LOW
      case 'GoalCompleted':
        return 4; // HIGH
      case 'SalaryUpdated':
      case 'ProfileUpdated':
        return 3; // MEDIUM
      case 'GoalFunded':
        return 3; // MEDIUM
      case 'NotificationAcknowledged':
        return 2; // LOW
      default:
        return 1; // BACKGROUND
    }
  }

  static stop(): void {
    if (AutomationEventBus.unsubscribe) {
      AutomationEventBus.unsubscribe();
      AutomationEventBus.unsubscribe = null;
    }
  }
}
