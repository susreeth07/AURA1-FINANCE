import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { ReportBuilder } from '../src/reports/ReportBuilder';
import { reportService } from '../src/reports/ReportService';
import { CSVExporter } from '../src/reports/CSVExporter';
import { MarkdownExporter } from '../src/reports/MarkdownExporter';
import { ExcelExporter } from '../src/reports/ExcelExporter';
import { PDFExporter } from '../src/reports/PDFExporter';
import { reportCache } from '../src/reports/ReportCache';

// Mock localStorage globally for Node.js command-line testing
if (typeof global.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const key in store) delete store[key]; }
  };
}

// Mock window object for printing context testing
if (typeof global.window === 'undefined') {
  (global as any).window = {
    open: () => ({ focus: () => {} })
  };
}

import { AnalyticsRepository } from '../src/analytics/AnalyticsRepository';
import { Money } from '../src/domain/finance/Money';
import { Currency } from '../src/domain/finance/Currency';

AnalyticsRepository.loadSnapshot = async (userId: string) => {
  const currency = Currency.USD;
  return {
    profile: {
      email: 'test@example.com',
      name: 'Test User',
      avatar: '',
      monthlySalary: Money.fromDecimal(5000, currency),
      additionalIncome: Money.fromDecimal(1000, currency),
      currentSavings: Money.fromDecimal(15000, currency),
      rent: Money.fromDecimal(1000, currency),
      fixedExpenses: Money.fromDecimal(500, currency),
      monthlyBills: Money.fromDecimal(200, currency),
      emiLoans: Money.fromDecimal(300, currency),
      savingsGoalPercentage: 20,
      hasSetupProfile: true,
      salaryHistory: []
    },
    incomes: [],
    expenses: [],
    budgets: [],
    savingsGoals: [],
    notifications: [],
    timelineHistory: [],
    cashFlowHistory: [],
    reminders: []
  };
};

async function runTests() {
  console.log('==================================================');
  console.log('AURA FINANCE REPORTING PLATFORM VERIFICATION TEST');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  const userId = 'usr_test_123';

  try {
    // ---------------------------------------------------- TEST 1: Report Generation
    console.log('Running Test 1: Report Generation...');
    
    // We run reportService.generateReport which runs async background builder
    const pendingReport = await reportService.generateReport(userId, 'monthly', 'executive', { aiEnabled: false });
    assert(pendingReport.metadata.status === 'queued', 'Initial report status is queued');
    assert(pendingReport.metadata.progress === 0, 'Initial report progress is 0');

    // Poll for the async background generation task to execute and complete
    let completedReport = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      completedReport = await reportService.getReport(pendingReport.id);
      if (completedReport && completedReport.metadata.status !== 'queued' && completedReport.metadata.status !== 'running') {
        break;
      }
    }

    assert(completedReport !== null, 'Completed report retrieved from storage');
    assert(completedReport!.metadata.status === 'completed', 'Completed report status is completed');
    assert(completedReport!.metadata.progress === 100, 'Completed report progress is 100%');
    assert(completedReport!.metadata.integrityHash !== 'pending', 'Completed report has valid integrity signature hash');
    assert(completedReport!.metadata.integrityHash.length === 32, 'Integrity signature hash is 32-character hexadecimal format');

    // ---------------------------------------------------- TEST 2: Caching & Invalidation
    console.log('\nRunning Test 2: Report Caching & Invalidation...');
    
    // Get report again - should hits memory cache (executionTimeMs is 0 or unchanged)
    const t0 = performance.now();
    const cachedReport = await reportService.getReport(pendingReport.id);
    const duration = performance.now() - t0;
    assert(cachedReport !== null && duration < 5, `Cache hits retrieved document under 5ms (actual: ${duration.toFixed(2)}ms)`);

    // Invalidate
    reportCache.invalidateReport(pendingReport.id);
    const cachedMiss = reportCache.getReport(pendingReport.id);
    assert(cachedMiss === null, 'Cache invalidation clears cache records successfully');

    // ---------------------------------------------------- TEST 3: Scheduled Reports configs
    console.log('\nRunning Test 3: Report Scheduler Registration...');
    
    const schedConfig = await reportService.createSchedule(userId, 'weekly', 'executive', 'weekly', false);
    assert(schedConfig.frequency === 'weekly', 'Schedule registered with weekly trigger frequency');
    assert(schedConfig.active === true, 'Schedule active status flag set');

    const activeConfigs = reportService.loadSchedules();
    assert(activeConfigs.some(s => s.id === schedConfig.id), 'Schedule configuration saved in storage vault');

    await reportService.cancelSchedule(schedConfig.id);
    const updatedConfigs = reportService.loadSchedules();
    const config = updatedConfigs.find(s => s.id === schedConfig.id);
    assert(config !== undefined && !config.active, 'Schedule canceled successfully in storage config');

    // ---------------------------------------------------- TEST 4: Comparison delta engine
    console.log('\nRunning Test 4: Report Comparison Delta calculation...');
    
    // Create base report representing last month's statement
    const baseReport = completedReport!;
    
    // Create a new comparison report
    const comparedReport = await reportService.generateReport(userId, 'monthly', 'executive', {
      aiEnabled: false,
      baseReportForComparison: baseReport
    });
    
    let loadedCompared = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      loadedCompared = await reportService.getReport(comparedReport.id);
      if (loadedCompared && loadedCompared.metadata.status !== 'queued' && loadedCompared.metadata.status !== 'running') {
        break;
      }
    }
    
    assert(loadedCompared !== null, 'Loaded comparison report successfully');
    assert(loadedCompared!.comparison !== undefined, 'Report has comparison delta node computed');
    assert(loadedCompared!.comparison!.baseReportId === baseReport.id, 'Comparison target base report matched successfully');

    // ---------------------------------------------------- TEST 5: Exporters suite
    console.log('\nRunning Test 5: Exporters Output Verification...');
    
    const csvExporter = new CSVExporter();
    const csvBlob = csvExporter.export(completedReport!);
    assert(csvBlob.size > 0 && csvBlob.type === 'text/csv;charset=utf-8;', 'CSV Exporter generates non-empty CSV Blob');

    const mdExporter = new MarkdownExporter();
    const mdBlob = mdExporter.export(completedReport!);
    assert(mdBlob.size > 0 && mdBlob.type === 'text/markdown;charset=utf-8;', 'Markdown Exporter generates non-empty Markdown Blob');

    const excelExporter = new ExcelExporter();
    const excelBlob = excelExporter.export(completedReport!);
    assert(excelBlob.size > 0 && excelBlob.type === 'application/vnd.ms-excel;charset=utf-8;', 'Excel Exporter generates non-empty XML Workbook Blob');

    const pdfExporter = new PDFExporter();
    const pdfBlob = pdfExporter.export(completedReport!);
    assert(pdfBlob.size > 0 && pdfBlob.type === 'text/html;charset=utf-8;', 'PDF Exporter compiles print-optimized HTML layout Blob');

  } catch (err) {
    console.error('Fatal error during verification test run:', err);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`VERIFICATION SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
