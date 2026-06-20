import { QueueJob } from './queue/Queue';

export type WorkerState = 'idle' | 'executing' | 'stopped';

export class Worker {
  readonly id: string;
  private state: WorkerState = 'idle';
  private currentJob: QueueJob | null = null;
  private totalJobsProcessed = 0;
  private totalFailures = 0;
  private totalProcessingDurationMs = 0;

  constructor(id: string) {
    this.id = id;
  }

  getState(): WorkerState {
    return this.state;
  }

  getCurrentJob(): QueueJob | null {
    return this.currentJob;
  }

  getMetrics() {
    return {
      id: this.id,
      state: this.state,
      totalProcessed: this.totalJobsProcessed,
      totalFailures: this.totalFailures,
      totalDurationMs: this.totalProcessingDurationMs
    };
  }

  async processJob(job: QueueJob, executor: (job: QueueJob) => Promise<void>): Promise<void> {
    this.state = 'executing';
    this.currentJob = job;
    const start = performance.now();
    try {
      await executor(job);
      this.totalJobsProcessed++;
    } catch (err) {
      this.totalFailures++;
      throw err;
    } finally {
      this.totalProcessingDurationMs += (performance.now() - start);
      this.state = 'idle';
      this.currentJob = null;
    }
  }

  stop(): void {
    this.state = 'stopped';
  }
}
