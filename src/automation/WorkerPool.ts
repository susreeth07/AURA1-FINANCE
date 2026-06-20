import { Queue, QueueJob } from './queue/Queue';
import { Worker } from './Worker';
import { AutomationConfig } from './AutomationConfig';

export class WorkerPool {
  private workers: Worker[] = [];
  private queue: Queue;
  private unsubscribe: (() => void) | null = null;
  private active = false;
  private executor: (job: QueueJob) => Promise<void>;

  constructor(queue: Queue, executor: (job: QueueJob) => Promise<void>) {
    this.queue = queue;
    this.executor = executor;
  }

  start(): void {
    if (this.active) return;
    this.active = true;

    const count = AutomationConfig.active.workerCount;
    this.workers = [];
    for (let i = 0; i < count; i++) {
      this.workers.push(new Worker(`worker_${i}`));
    }

    // Subscribe to event-driven notifications from the queue
    this.unsubscribe = this.queue.subscribe(() => {
      this.scheduleProcessing();
    });

    // Run initial cycle to process any pending items
    this.scheduleProcessing();
  }

  private scheduleProcessing(): void {
    if (!this.active) return;

    for (const worker of this.workers) {
      if (worker.getState() === 'idle') {
        this.processNext(worker);
      }
    }
  }

  private async processNext(worker: Worker): Promise<void> {
    if (!this.active || worker.getState() !== 'idle') return;

    const job = await this.queue.dequeue();
    if (!job) {
      return; // No job, worker remains idle
    }

    try {
      await worker.processJob(job, this.executor);
    } catch (err) {
      console.error(`[WorkerPool] Execution error in ${worker.id}:`, err);
      
      const retryLimit = AutomationConfig.active.retryLimits;
      if (job.retryCount < retryLimit) {
        job.retryCount++;
        // Re-enqueue task back to queue
        await this.queue.enqueue(job.event, job.priority, job.retryCount);
      } else {
        console.error(`[WorkerPool] Job ${job.event.eventId} exceeded retry threshold (${retryLimit}). Routing to Dead-Letter Queue.`);
        await this.queue.moveToDeadLetterQueue(job);
      }
    }

    // Loop back to see if there is immediate subsequent work
    this.scheduleProcessing();
  }

  stop(): void {
    this.active = false;
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.workers.forEach(worker => worker.stop());
  }

  getWorkers(): Worker[] {
    return this.workers;
  }

  getMetrics() {
    const stats = this.workers.map(w => w.getMetrics());
    const totalProcessed = stats.reduce((sum, s) => sum + s.totalProcessed, 0);
    const totalFailures = stats.reduce((sum, s) => sum + s.totalFailures, 0);
    const idleCount = this.workers.filter(w => w.getState() === 'idle').length;

    return {
      activeWorkers: this.workers.length - idleCount,
      idleWorkers: idleCount,
      totalProcessed,
      totalFailures,
      workerStats: stats
    };
  }
}
