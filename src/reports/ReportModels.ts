// ===================================================
// Phase 11 – Report Models
// Strongly typed financial report data structures
// ===================================================

import { AnalyticsSnapshot } from '../analytics/AnalyticsSnapshot';
import { AutomationSummary } from '../automation/AutomationSummary';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
export type ReportTemplate = 'executive' | 'professional' | 'minimal' | 'dark' | 'presentation' | 'printable';
export type ReportStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ReportLifecycle = 'draft' | 'queued' | 'generating' | 'completed' | 'archived' | 'deleted';
export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'markdown';

export interface AuditRecord {
  readonly reportId: string;
  readonly generatedAt: string;
  readonly generatedBy: string;
  readonly reportVersion: string;
  readonly analyticsVersion: string;
  readonly aiVersion: string;
  readonly templateVersion: string;
  readonly integrityHash: string;
  readonly checksumAlgorithm: string;
}

export interface ReportMetadata {
  readonly id: string;
  readonly title: string;
  readonly period: ReportPeriod;
  readonly startDate: string;
  readonly endDate: string;
  readonly generatedAt: string;
  readonly generatedBy: string;
  readonly reportVersion: string;
  readonly analyticsVersion: string;
  readonly aiVersion: string;
  readonly templateVersion: string;
  readonly schemaVersion: string;
  readonly generatedByVersion: string;
  readonly integrityHash: string;
  readonly status: ReportStatus;
  readonly lifecycle: ReportLifecycle;
  readonly progress: number; // 0 - 100
  readonly executionTimeMs: number;
  readonly aiEnabled: boolean;
}

export interface ReportChart {
  readonly id: string;
  readonly title: string;
  readonly type: 'bar' | 'line' | 'area' | 'pie' | 'radial' | 'scatter';
  readonly data: Record<string, any>[];
  readonly xKey?: string;
  readonly yKeys?: string[];
  readonly colors?: string[];
}

export interface ReportSection {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly data: Record<string, any>;
  readonly charts: ReportChart[];
  readonly insights: string[];
  readonly warnings: string[];
  readonly aiGenerated?: boolean;
}

export interface ExecutiveSummary {
  readonly headline: string;
  readonly overview: string;
  readonly achievements: string[];
  readonly risks: string[];
  readonly opportunities: string[];
  readonly recommendations: string[];
  readonly warnings: string[];
  readonly confidenceLevel: 'High' | 'Medium' | 'Low';
}

export interface FinancialKPIs {
  readonly totalIncome: number;
  readonly totalExpenses: number;
  readonly netBalance: number;
  readonly savingsRate: number;
  readonly healthScore: number;
  readonly burnRate: number;
  readonly runway: number; // months of savings at current burn
  readonly incomeGrowthPct: number;
  readonly expenseGrowthPct: number;
}

export interface ReportComparison {
  readonly baseReportId: string;
  readonly baseReportTitle: string;
  readonly kpiDeltas: Record<string, {
    readonly baseValue: number;
    readonly currentValue: number;
    readonly changeAmount: number;
    readonly changePct: number;
    readonly direction: 'up' | 'down' | 'flat';
  }>;
  readonly recommendationsAdded: string[];
  readonly recommendationsRemoved: string[];
  readonly healthScoreDelta: number;
  readonly budgetUtilizationDelta: Record<string, {
    readonly basePct: number;
    readonly currentPct: number;
    readonly changePct: number;
  }>;
}

// Canonical Report Document model consumed by exporters and components
export interface ReportDocument {
  readonly id: string;
  readonly title: string;
  readonly type: 'monthly' | 'weekly' | 'quarterly' | 'annual' | 'budget' | 'goal' | 'cashflow' | 'forecast' | 'health';
  readonly metadata: ReportMetadata;
  readonly audit: AuditRecord;
  readonly executive: ExecutiveSummary;
  readonly kpis: FinancialKPIs;
  readonly sections: ReportSection[];
  readonly analyticsSnapshot: AnalyticsSnapshot; // Frozen immutable data
  readonly automationSummary: AutomationSummary; // Frozen immutable alerts/rules
  readonly comparison?: ReportComparison;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly viewCount: number;
  readonly softDeleted?: boolean;
  readonly shareToken?: string;
}

// Report history entry (for quick list / metadata views)
export interface ReportHistoryEntry {
  readonly id: string;
  readonly title: string;
  readonly period: ReportPeriod;
  readonly generatedAt: string;
  readonly status: ReportStatus;
  readonly lifecycle: ReportLifecycle;
  readonly template: ReportTemplate;
  readonly type: ReportDocument['type'];
  readonly integrityHash: string;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
}
