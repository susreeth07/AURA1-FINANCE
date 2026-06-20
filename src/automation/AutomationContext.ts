import { DomainEvent } from '../domain/events/FinancialEvents';
import { AnalyticsSnapshot } from '../analytics/AnalyticsSnapshot';

export interface AutomationContext {
  readonly userId: string;
  readonly event: DomainEvent;
  readonly snapshot: AnalyticsSnapshot;
  readonly timezone: string;
  readonly correlationId: string;
}
