import { AnalyticsSnapshot } from './AnalyticsSnapshot';

export interface ExportColumn {
  readonly header: string;
  readonly key: string;
}

export interface ExportRow {
  readonly [key: string]: any;
}

export interface ExportDataset {
  readonly sheetName: string;
  readonly columns: readonly ExportColumn[];
  readonly rows: readonly ExportRow[];
}

export interface ExportPackage {
  readonly timestamp: Date;
  readonly datasets: {
    readonly incomes: ExportDataset;
    readonly expenses: ExportDataset;
    readonly budgets: ExportDataset;
    readonly goals: ExportDataset;
    readonly cashFlows: ExportDataset;
  };
}

export class AnalyticsExporter {
  /**
   * Transforms the snapshot data into reusable, tabular structures suitable for CSV, Excel, PDF, and JSON exporters.
   */
  static prepareExportData(snapshot: AnalyticsSnapshot): ExportPackage {
    // 1. Incomes Dataset
    const incomeColumns: ExportColumn[] = [
      { header: 'Date', key: 'date' },
      { header: 'Source/Client', key: 'source' },
      { header: 'Category', key: 'category' },
      { header: 'Amount', key: 'amount' },
      { header: 'Is Recurring', key: 'isRecurring' },
      { header: 'Notes', key: 'description' }
    ];
    const incomeRows: ExportRow[] = snapshot.incomes.map((i) => ({
      date: i.date.toISOString().slice(0, 10),
      source: i.source,
      category: i.category,
      amount: i.amount.toDecimal(),
      isRecurring: i.isRecurring ? 'Yes' : 'No',
      description: i.description || ''
    }));

    // 2. Expenses Dataset
    const expenseColumns: ExportColumn[] = [
      { header: 'Date', key: 'date' },
      { header: 'Merchant', key: 'merchant' },
      { header: 'Category', key: 'category' },
      { header: 'Amount', key: 'amount' },
      { header: 'Is Recurring', key: 'isRecurring' },
      { header: 'Frequency', key: 'frequency' },
      { header: 'Notes', key: 'description' }
    ];
    const expenseRows: ExportRow[] = snapshot.expenses.map((e) => ({
      date: e.date.toISOString().slice(0, 10),
      merchant: e.merchant,
      category: e.category,
      amount: e.amount.toDecimal(),
      isRecurring: e.isRecurring ? 'Yes' : 'No',
      frequency: e.frequency || 'N/A',
      description: e.description || ''
    }));

    // 3. Budgets Dataset
    const budgetColumns: ExportColumn[] = [
      { header: 'Category', key: 'category' },
      { header: 'Limit Amount', key: 'limit' },
      { header: 'Spent Amount', key: 'spent' },
      { header: 'Remaining Balance', key: 'remaining' },
      { header: 'Utilization %', key: 'utilization' },
      { header: 'Overspending Amount', key: 'overspending' }
    ];
    const budgetRows: ExportRow[] = snapshot.budgets.map((b) => {
      const remaining = b.limit.subtract(b.spent);
      const isOverspent = b.spent.greaterThan(b.limit);
      const overspent = isOverspent ? b.spent.subtract(b.limit) : b.spent.subtract(b.spent);
      const utilization = b.limit.isZero() ? 0 : Number((b.spent.cents * 100n) / b.limit.cents);

      return {
        category: b.category,
        limit: b.limit.toDecimal(),
        spent: b.spent.toDecimal(),
        remaining: isOverspent ? 0 : remaining.toDecimal(),
        utilization,
        overspending: overspent.toDecimal()
      };
    });

    // 4. Goals Dataset
    const goalColumns: ExportColumn[] = [
      { header: 'Goal Name', key: 'name' },
      { header: 'Target Amount', key: 'target' },
      { header: 'Current Amount', key: 'current' },
      { header: 'Progress %', key: 'progress' },
      { header: 'Remaining Amount', key: 'remaining' },
      { header: 'Target Date', key: 'targetDate' },
      { header: 'Completed', key: 'isCompleted' }
    ];
    const goalRows: ExportRow[] = snapshot.savingsGoals.map((g) => {
      const isCompleted = g.currentAmount.greaterThanOrEqual(g.targetAmount);
      const remaining = isCompleted ? g.targetAmount.subtract(g.targetAmount) : g.targetAmount.subtract(g.currentAmount);
      const progress = g.targetAmount.isZero() ? 100 : Number((g.currentAmount.cents * 100n) / g.targetAmount.cents);

      return {
        name: g.name,
        target: g.targetAmount.toDecimal(),
        current: g.currentAmount.toDecimal(),
        progress,
        remaining: remaining.toDecimal(),
        targetDate: g.targetDate.toISOString().slice(0, 10),
        isCompleted: isCompleted ? 'Yes' : 'No'
      };
    });

    // 5. Cash Flows Dataset
    const cashFlowColumns: ExportColumn[] = [
      { header: 'Month', key: 'month' },
      { header: 'Total Inflow', key: 'inflow' },
      { header: 'Total Outflow', key: 'outflow' },
      { header: 'Net Cash Flow', key: 'netFlow' },
      { header: 'Savings Rate %', key: 'savingsRate' }
    ];

    // Compute monthly flow totals from snapshots
    const cashFlowRows: ExportRow[] = snapshot.timelineHistory.map((s) => ({
      month: s.month,
      inflow: s.balance.add(s.savings).toDecimal(), // Proxy balance compilation
      outflow: s.savings.toDecimal(),
      netFlow: s.balance.toDecimal(),
      savingsRate: s.growthRate
    }));

    return {
      timestamp: new Date(),
      datasets: {
        incomes: { sheetName: 'Incomes', columns: incomeColumns, rows: incomeRows },
        expenses: { sheetName: 'Expenses', columns: expenseColumns, rows: expenseRows },
        budgets: { sheetName: 'Budgets', columns: budgetColumns, rows: budgetRows },
        goals: { sheetName: 'Savings Goals', columns: goalColumns, rows: goalRows },
        cashFlows: { sheetName: 'Monthly Cash Flows', columns: cashFlowColumns, rows: cashFlowRows }
      }
    };
  }
}
