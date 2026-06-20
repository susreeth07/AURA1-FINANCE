import { DomainEvent } from './FinancialEvents';

export type DomainEventListener = (event: DomainEvent) => void;

export class DomainEventBus {
  private static listeners = new Set<DomainEventListener>();

  /**
   * Subscribe to domain events. Returns an unsubscribe function.
   */
  static subscribe(listener: DomainEventListener): () => void {
    DomainEventBus.listeners.add(listener);
    return () => {
      DomainEventBus.listeners.delete(listener);
    };
  }

  /**
   * Publish a domain event to all subscribers.
   */
  static publish(event: DomainEvent): void {
    DomainEventBus.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[DomainEventBus] Error in event listener:', err);
      }
    });
  }

  /**
   * Clear all active listeners (useful for testing).
   */
  static clear(): void {
    DomainEventBus.listeners.clear();
  }
}
