import { Queue, QueueJob, QueueListener } from './Queue';
import { DomainEvent } from '../../domain/events/FinancialEvents';
import { AutomationConfig } from '../AutomationConfig';

export class MemoryQueue implements Queue {
  private jobs: QueueJob[] = [];
  private dlq: QueueJob[] = [];
  private listeners = new Set<QueueListener>();

  // Diagnostic Metrics
  private totalEnqueued = 0;
  private totalDequeued = 0;
  private totalDropped = 0;

  async enqueue(event: DomainEvent, priority: number, retryCount?: number): Promise<void> {
    const config = AutomationConfig.active;

    // Check Capacity Limit
    if (this.jobs.length >= config.queueSize) {
      this.totalDropped++;
      console.warn(`[MemoryQueue] Max capacity of ${config.queueSize} reached. Dropping event: ${event.eventId}`);
      return;
    }

    // Deduplication check
    const isDuplicate = this.jobs.some(job => job.event.eventId === event.eventId);
    if (isDuplicate) {
      return; // Silently avoid duplicating enqueued jobs
    }

    const job: QueueJob = {
      event,
      priority,
      enqueuedAt: new Date(),
      retryCount: retryCount || 0
    };

    this.jobs.push(job);
    this.totalEnqueued++;

    // Sort by priority (higher value first), then by enqueuedAt (oldest first - FIFO)
    this.jobs.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.enqueuedAt.getTime() - b.enqueuedAt.getTime();
    });

    // Notify event-driven subscribers
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (err) {
        console.error('[MemoryQueue] Listener notification error:', err);
      }
    });
  }

  async dequeue(): Promise<QueueJob | null> {
    if (this.jobs.length === 0) {
      return null;
    }
    const job = this.jobs.shift() || null;
    if (job) {
      this.totalDequeued++;
    }
    return job;
  }

  async peek(): Promise<QueueJob | null> {
    return this.jobs[0] || null;
  }

  async isEmpty(): Promise<boolean> {
    return this.jobs.length === 0;
  }

  async size(): Promise<number> {
    return this.jobs.length;
  }

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async getDeadLetterQueue(): Promise<QueueJob[]> {
    return [...this.dlq];
  }

  async moveToDeadLetterQueue(job: QueueJob): Promise<void> {
    this.dlq.push(job);
  }

  async clear(): Promise<void> {
    this.jobs = [];
    this.dlq = [];
    this.totalEnqueued = 0;
    this.totalDequeued = 0;
    this.totalDropped = 0;
  }

  getMetrics() {
    return {
      depth: this.jobs.length,
      totalEnqueued: this.totalEnqueued,
      totalDequeued: this.totalDequeued,
      totalDropped: this.totalDropped,
      deadLetterCount: this.dlq.length
    };
  }
}
