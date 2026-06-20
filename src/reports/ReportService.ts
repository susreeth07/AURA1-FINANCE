import { ReportDocument, ReportMetadata, AuditRecord, ReportLifecycle, ReportStatus } from './ReportModels';
import { ReportStorage, LocalStorageReportStorage } from './ReportStorage';
import { reportCache } from './ReportCache';
import { ReportBuilder } from './ReportBuilder';
import { AutomationFacade } from '../automation/AutomationFacade';
import { logger } from '../utils/logger';

export interface ScheduledConfig {
  readonly id: string;
  readonly userId: string;
  readonly type: ReportDocument['type'];
  readonly template: string;
  readonly frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  readonly aiEnabled: boolean;
  readonly active: boolean;
}

export class ReportService {
  private static instance: ReportService | null = null;
  private storage: ReportStorage = new LocalStorageReportStorage();
  private scheduledKey = 'aura_reports_schedule_configs';

  static getInstance(): ReportService {
    if (!ReportService.instance) {
      ReportService.instance = new ReportService();
    }
    return ReportService.instance;
  }

  setStorage(customStorage: ReportStorage): void {
    this.storage = customStorage;
  }

  /**
   * Generates a report asynchronously. Returns a pending report placeholder immediately.
   */
  async generateReport(
    userId: string,
    type: ReportDocument['type'],
    template: string = 'executive',
    options?: {
      readonly aiEnabled?: boolean;
      readonly baseReportForComparison?: ReportDocument;
    }
  ): Promise<ReportDocument> {
    const reportId = `rep_${Math.random().toString(36).substring(2, 11)}`;
    const nowStr = new Date().toISOString();

    // Create intermediate pending ReportDocument
    const pendingMetadata: ReportMetadata = {
      id: reportId,
      title: `${type.toUpperCase()} Financial Report (Generating...)`,
      period: type === 'weekly' ? 'weekly' : type === 'quarterly' ? 'quarterly' : type === 'annual' ? 'annual' : 'monthly',
      startDate: nowStr,
      endDate: nowStr,
      generatedAt: nowStr,
      generatedBy: userId,
      reportVersion: '1.0.0',
      analyticsVersion: '1.0.0',
      aiVersion: '1.0.0',
      templateVersion: '1.0.0',
      schemaVersion: '1.0.0',
      generatedByVersion: '1.0.0',
      integrityHash: 'pending',
      status: 'queued',
      lifecycle: 'queued',
      progress: 0,
      executionTimeMs: 0,
      aiEnabled: options?.aiEnabled !== false
    };

    const pendingAudit: AuditRecord = {
      reportId,
      generatedAt: nowStr,
      generatedBy: userId,
      reportVersion: '1.0.0',
      analyticsVersion: '1.0.0',
      aiVersion: '1.0.0',
      templateVersion: '1.0.0',
      integrityHash: 'pending',
      checksumAlgorithm: 'FNV-1a-32bit-custom'
    };

    const pendingReport: ReportDocument = {
      id: reportId,
      title: pendingMetadata.title,
      type,
      metadata: pendingMetadata,
      audit: pendingAudit,
      executive: {
        headline: 'Report Generation Initiated',
        overview: 'Data compiling in progress...',
        achievements: [],
        risks: [],
        opportunities: [],
        recommendations: [],
        warnings: [],
        confidenceLevel: 'Medium'
      },
      kpis: {
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
        savingsRate: 0,
        healthScore: 0,
        burnRate: 0,
        runway: 0,
        incomeGrowthPct: 0,
        expenseGrowthPct: 0
      },
      sections: [],
      analyticsSnapshot: {
        profile: {} as any,
        incomes: [],
        expenses: [],
        budgets: [],
        savingsGoals: [],
        notifications: [],
        timelineHistory: [],
        cashFlowHistory: [],
        reminders: []
      } as any,
      automationSummary: {
        unreadNotifications: [],
        upcomingReminders: [],
        recentAutomations: [],
        criticalAlerts: [],
        platformHealth: {
          queueHealth: 'healthy',
          workerHealth: 'healthy',
          platformScore: 100,
          details: {}
        },
        statistics: {},
        timestamp: new Date()
      },
      isFavorite: false,
      isPinned: false,
      viewCount: 0
    };

    // Save initial pending report to storage
    await this.storage.saveReport(pendingReport);

    // Fire off async background generation task
    this.executeBackgroundGeneration(userId, reportId, type, template, options);

    return pendingReport;
  }

  private async executeBackgroundGeneration(
    userId: string,
    reportId: string,
    type: ReportDocument['type'],
    template: string,
    options?: {
      readonly aiEnabled?: boolean;
      readonly baseReportForComparison?: ReportDocument;
    }
  ): Promise<void> {
    try {
      // Transition status: running/generating
      const existing = await this.storage.getReport(reportId);
      if (existing) {
        const runningMetadata: ReportMetadata = {
          ...existing.metadata,
          status: 'running',
          lifecycle: 'generating',
          progress: 20
        };
        await this.storage.saveReport({ ...existing, metadata: runningMetadata });
      }

      const report = await ReportBuilder.buildReport(userId, reportId, type, template, {
        aiEnabled: options?.aiEnabled,
        baseReportForComparison: options?.baseReportForComparison,
        onProgress: async (progress) => {
          const rep = await this.storage.getReport(reportId);
          if (rep) {
            await this.storage.saveReport({
              ...rep,
              metadata: {
                ...rep.metadata,
                progress
              }
            });
          }
        }
      });

      // Save finished report to storage & cache
      await this.storage.saveReport(report);
      reportCache.setReport(report);

      // Trigger standard automation event signal
      await AutomationFacade.enqueueEvent({
        id: `evt_rep_${reportId}`,
        occurredAt: new Date(),
        eventName: 'NotificationTriggered',
        eventId: `evt_rep_${reportId}`,
        correlationId: `corr_rep_${reportId}`,
        version: '1.0',
        timestamp: new Date(),
        source: 'reports.service',
        userId,
        eventType: 'NotificationTriggered',
        payload: {
          userId,
          reportId,
          reportTitle: report.title,
          category: 'SYSTEM',
          message: `Report "${report.title}" generated successfully.`
        }
      }, 2);

    } catch (e) {
      logger.error(`[ReportService] Background generation failed for report: ${reportId}`, e);
      const rep = await this.storage.getReport(reportId);
      if (rep) {
        const failedReport: ReportDocument = {
          ...rep,
          metadata: {
            ...rep.metadata,
            status: 'failed',
            progress: 100
          }
        };
        await this.storage.saveReport(failedReport);
      }
    }
  }

  async refreshReport(reportId: string): Promise<ReportDocument> {
    const existing = await this.storage.getReport(reportId);
    if (!existing) {
      throw new Error(`[ReportService] Report not found: ${reportId}`);
    }
    // Return a new report snapshot as required by immutability spec
    return this.generateReport(
      existing.metadata.generatedBy,
      existing.type,
      existing.metadata.templateVersion,
      {
        aiEnabled: existing.metadata.aiEnabled,
        baseReportForComparison: existing.comparison ? await this.getReport(existing.comparison.baseReportId) || undefined : undefined
      }
    );
  }

  async getReport(reportId: string): Promise<ReportDocument | null> {
    // Cache lookup first
    const cached = reportCache.getReport(reportId);
    if (cached) return cached;

    const report = await this.storage.getReport(reportId);
    if (report) {
      // Increment view count
      const updated: ReportDocument = {
        ...report,
        viewCount: (report.viewCount || 0) + 1
      };
      await this.storage.saveReport(updated);
      reportCache.setReport(updated);
      return updated;
    }
    return null;
  }

  async getHistory(userId: string, includeDeleted = false): Promise<ReportDocument[]> {
    const history = await this.storage.getHistory(userId);
    if (includeDeleted) return history;
    return history.filter(r => !r.softDeleted);
  }

  async deleteReport(reportId: string, permanent = false): Promise<void> {
    reportCache.invalidateReport(reportId);
    if (permanent) {
      await this.storage.deleteReport(reportId);
    } else {
      const existing = await this.storage.getReport(reportId);
      if (existing) {
        await this.storage.saveReport({
          ...existing,
          softDeleted: true,
          metadata: {
            ...existing.metadata,
            lifecycle: 'deleted'
          }
        });
      }
    }
  }

  async restoreReport(reportId: string): Promise<void> {
    const existing = await this.storage.getReport(reportId);
    if (existing && existing.softDeleted) {
      await this.storage.saveReport({
        ...existing,
        softDeleted: false,
        metadata: {
          ...existing.metadata,
          lifecycle: 'completed'
        }
      });
    }
  }

  async archiveReport(reportId: string): Promise<void> {
    const existing = await this.storage.getReport(reportId);
    if (existing) {
      const updated: ReportDocument = {
        ...existing,
        metadata: {
          ...existing.metadata,
          lifecycle: 'archived'
        }
      };
      await this.storage.saveReport(updated);
      reportCache.setReport(updated);
    }
  }

  async toggleFavorite(reportId: string): Promise<void> {
    const existing = await this.storage.getReport(reportId);
    if (existing) {
      const updated: ReportDocument = {
        ...existing,
        isFavorite: !existing.isFavorite
      };
      await this.storage.saveReport(updated);
      reportCache.setReport(updated);
    }
  }

  async togglePin(reportId: string): Promise<void> {
    const existing = await this.storage.getReport(reportId);
    if (existing) {
      const updated: ReportDocument = {
        ...existing,
        isPinned: !existing.isPinned
      };
      await this.storage.saveReport(updated);
      reportCache.setReport(updated);
    }
  }

  // --- Scheduled Reports Scheduler integration ---

  private getIntervalMs(frequency: string): number {
    switch (frequency) {
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      case 'quarterly': return 90 * 24 * 60 * 60 * 1000;
      case 'yearly': return 365 * 24 * 60 * 60 * 1000;
      case 'monthly':
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }

  loadSchedules(): ScheduledConfig[] {
    try {
      const data = localStorage.getItem(this.scheduledKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      logger.error('[ReportService] Failed to load schedules:', e);
      return [];
    }
  }

  saveSchedules(schedules: ScheduledConfig[]): void {
    try {
      localStorage.setItem(this.scheduledKey, JSON.stringify(schedules));
    } catch (e) {
      logger.error('[ReportService] Failed to save schedules:', e);
    }
  }

  async createSchedule(
    userId: string,
    type: ReportDocument['type'],
    template: string,
    frequency: ScheduledConfig['frequency'],
    aiEnabled: boolean
  ): Promise<ScheduledConfig> {
    const scheduleId = `sched_rep_${Math.random().toString(36).substring(2, 11)}`;
    const config: ScheduledConfig = {
      id: scheduleId,
      userId,
      type,
      template,
      frequency,
      aiEnabled,
      active: true
    };

    const schedules = this.loadSchedules();
    schedules.push(config);
    this.saveSchedules(schedules);

    // Schedule within the existing Automation Platform Scheduler
    const scheduler = AutomationFacade.getScheduler();
    const intervalMs = this.getIntervalMs(frequency);
    
    await scheduler.scheduleRecurring(scheduleId, intervalMs, async () => {
      logger.debug(`[ReportService] Running scheduled report execution for config: ${scheduleId}`);
      await this.generateReport(userId, type, template, { aiEnabled });
    });

    return config;
  }

  async cancelSchedule(scheduleId: string): Promise<void> {
    const schedules = this.loadSchedules();
    const index = schedules.findIndex(s => s.id === scheduleId);
    if (index !== -1) {
      schedules[index] = { ...schedules[index], active: false };
      this.saveSchedules(schedules);
    }

    const scheduler = AutomationFacade.getScheduler();
    await scheduler.cancel(scheduleId);
  }

  /**
   * Resumes active schedules upon system boot.
   */
  async resumeSchedulesOnBoot(): Promise<void> {
    const schedules = this.loadSchedules().filter(s => s.active);
    const scheduler = AutomationFacade.getScheduler();
    
    for (const s of schedules) {
      const intervalMs = this.getIntervalMs(s.frequency);
      await scheduler.scheduleRecurring(s.id, intervalMs, async () => {
        await this.generateReport(s.userId, s.type, s.template, { aiEnabled: s.aiEnabled });
      });
    }
    logger.debug(`[ReportService] Resumed ${schedules.length} active scheduled report jobs.`);
  }
}

export const reportService = ReportService.getInstance();
