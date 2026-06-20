export interface ScheduledJob {
  readonly id: string;
  readonly type: 'once' | 'recurring';
  readonly executeAt: Date;
  readonly intervalMs?: number;
  readonly callback: () => Promise<void> | void;
}

export interface Scheduler {
  scheduleOnce(id: string, executeAt: Date, callback: () => Promise<void> | void): Promise<void>;
  scheduleRecurring(id: string, intervalMs: number, callback: () => Promise<void> | void): Promise<void>;
  cancel(id: string): Promise<void>;
  clear(): Promise<void>;
  getJobs(): Promise<ScheduledJob[]>;
}
