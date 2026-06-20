import { Scheduler, ScheduledJob } from './Scheduler';

export class InMemoryScheduler implements Scheduler {
  private jobs = new Map<string, ScheduledJob>();
  private activeTimers = new Map<string, any>();

  async scheduleOnce(id: string, executeAt: Date, callback: () => Promise<void> | void): Promise<void> {
    await this.cancel(id);

    const delay = executeAt.getTime() - Date.now();
    if (delay <= 0) {
      try {
        await callback();
      } catch (err) {
        console.error(`[InMemoryScheduler] Direct execution error for job: ${id}`, err);
      }
      return;
    }

    const job: ScheduledJob = {
      id,
      type: 'once',
      executeAt,
      callback
    };

    this.jobs.set(id, job);

    const timer = setTimeout(async () => {
      try {
        await callback();
      } catch (err) {
        console.error(`[InMemoryScheduler] Delayed job execution error: ${id}`, err);
      } finally {
        this.jobs.delete(id);
        this.activeTimers.delete(id);
      }
    }, delay);

    this.activeTimers.set(id, timer);
  }

  async scheduleRecurring(id: string, intervalMs: number, callback: () => Promise<void> | void): Promise<void> {
    await this.cancel(id);

    const job: ScheduledJob = {
      id,
      type: 'recurring',
      executeAt: new Date(Date.now() + intervalMs),
      intervalMs,
      callback
    };

    this.jobs.set(id, job);

    const timer = setInterval(async () => {
      try {
        await callback();
      } catch (err) {
        console.error(`[InMemoryScheduler] Recurring job execution error: ${id}`, err);
      }
    }, intervalMs);

    this.activeTimers.set(id, timer);
  }

  async cancel(id: string): Promise<void> {
    const timer = this.activeTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      clearInterval(timer);
      this.activeTimers.delete(id);
    }
    this.jobs.delete(id);
  }

  async clear(): Promise<void> {
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.activeTimers.clear();
    this.jobs.clear();
  }

  async getJobs(): Promise<ScheduledJob[]> {
    return Array.from(this.jobs.values());
  }
}
