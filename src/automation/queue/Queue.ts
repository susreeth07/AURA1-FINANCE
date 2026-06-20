import { DomainEvent } from '../../domain/events/FinancialEvents';

export interface QueueJob {
  readonly event: DomainEvent;
  readonly priority: number;
  readonly enqueuedAt: Date;
  retryCount: number;
}

export type QueueListener = () => void;

export interface Queue {
  enqueue(event: DomainEvent, priority: number, retryCount?: number): Promise<void>;
  dequeue(): Promise<QueueJob | null>;
  peek(): Promise<QueueJob | null>;
  isEmpty(): Promise<boolean>;
  size(): Promise<number>;
  subscribe(listener: QueueListener): () => void;
  getDeadLetterQueue(): Promise<QueueJob[]>;
  moveToDeadLetterQueue(job: QueueJob): Promise<void>;
  clear(): Promise<void>;
  getMetrics(): {
    readonly depth: number;
    readonly totalEnqueued: number;
    readonly totalDequeued: number;
    readonly totalDropped: number;
    readonly deadLetterCount: number;
  };
}
