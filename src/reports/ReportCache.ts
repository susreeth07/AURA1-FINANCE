import { ReportDocument } from './ReportModels';

interface CacheEntry<T> {
  readonly data: T;
  readonly cachedAt: number;
}

export class ReportCache {
  private static instance: ReportCache | null = null;
  private reportCache = new Map<string, CacheEntry<ReportDocument>>();
  private chartCache = new Map<string, CacheEntry<any>>();
  private defaultTtlMs = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ReportCache {
    if (!ReportCache.instance) {
      ReportCache.instance = new ReportCache();
    }
    return ReportCache.instance;
  }

  getReport(reportId: string, ttlMs: number = this.defaultTtlMs): ReportDocument | null {
    const entry = this.reportCache.get(reportId);
    if (!entry) return null;

    const age = Date.now() - entry.cachedAt;
    if (age > ttlMs) {
      this.reportCache.delete(reportId);
      return null;
    }
    return entry.data;
  }

  setReport(report: ReportDocument): void {
    this.reportCache.set(report.id, {
      data: report,
      cachedAt: Date.now()
    });
  }

  invalidateReport(reportId: string): void {
    this.reportCache.delete(reportId);
    // Invalidate charts linked to this report
    for (const key of this.chartCache.keys()) {
      if (key.startsWith(`${reportId}_`)) {
        this.chartCache.delete(key);
      }
    }
  }

  invalidateUserReports(userId: string): void {
    for (const [id, entry] of this.reportCache.entries()) {
      if (entry.data.metadata.generatedBy === userId) {
        this.invalidateReport(id);
      }
    }
  }

  getChartData(reportId: string, chartId: string, ttlMs: number = this.defaultTtlMs): any | null {
    const cacheKey = `${reportId}_${chartId}`;
    const entry = this.chartCache.get(cacheKey);
    if (!entry) return null;

    const age = Date.now() - entry.cachedAt;
    if (age > ttlMs) {
      this.chartCache.delete(cacheKey);
      return null;
    }
    return entry.data;
  }

  setChartData(reportId: string, chartId: string, data: any): void {
    const cacheKey = `${reportId}_${chartId}`;
    this.chartCache.set(cacheKey, {
      data,
      cachedAt: Date.now()
    });
  }

  clear(): void {
    this.reportCache.clear();
    this.chartCache.clear();
  }
}

export const reportCache = ReportCache.getInstance();
