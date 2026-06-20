import { ReportDocument } from './ReportModels';

export interface ReportStorage {
  saveReport(report: ReportDocument): Promise<void>;
  getReport(reportId: string): Promise<ReportDocument | null>;
  getHistory(userId: string): Promise<ReportDocument[]>;
  deleteReport(reportId: string): Promise<void>;
}

export class LocalStorageReportStorage implements ReportStorage {
  private readonly storageKey = 'aura_reports_vault';

  private loadVault(): Record<string, ReportDocument> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('[LocalStorageReportStorage] Failed to load reports vault:', e);
      return {};
    }
  }

  private saveVault(vault: Record<string, ReportDocument>): void {
    try {
      const serialized = JSON.stringify(vault, (key, value) => {
        return typeof value === 'bigint' ? value.toString() : value;
      });
      localStorage.setItem(this.storageKey, serialized);
    } catch (e) {
      console.error('[LocalStorageReportStorage] Failed to save reports vault:', e);
    }
  }

  async saveReport(report: ReportDocument): Promise<void> {
    const vault = this.loadVault();
    vault[report.id] = report;
    this.saveVault(vault);
  }

  async getReport(reportId: string): Promise<ReportDocument | null> {
    const vault = this.loadVault();
    return vault[reportId] || null;
  }

  async getHistory(userId: string): Promise<ReportDocument[]> {
    const vault = this.loadVault();
    return Object.values(vault)
      .filter((report) => report.metadata.generatedBy === userId)
      .sort((a, b) => b.metadata.generatedAt.localeCompare(a.metadata.generatedAt));
  }

  async deleteReport(reportId: string): Promise<void> {
    const vault = this.loadVault();
    if (vault[reportId]) {
      delete vault[reportId];
      this.saveVault(vault);
    }
  }
}
