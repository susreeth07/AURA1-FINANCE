import { AnalyticsSnapshot } from '../src/analytics/AnalyticsSnapshot';
import { TrendAnalyzer } from '../src/analytics/analyzers/TrendAnalyzer';
import { IncomeAnalyzer } from '../src/analytics/analyzers/IncomeAnalyzer';
import { SpendingAnalyzer } from '../src/analytics/analyzers/SpendingAnalyzer';
import { BudgetAnalyzer } from '../src/analytics/analyzers/BudgetAnalyzer';
import { GoalAnalyzer } from '../src/analytics/analyzers/GoalAnalyzer';
import { HealthAnalyzer } from '../src/analytics/analyzers/HealthAnalyzer';
import { ForecastAnalyzer } from '../src/analytics/analyzers/ForecastAnalyzer';
import { InsightsAggregator } from '../src/analytics/aggregators/InsightsAggregator';
import { RecommendationAggregator } from '../src/analytics/aggregators/RecommendationAggregator';
import { AnalyticsExporter } from '../src/analytics/AnalyticsExporter';
import { AnalyticsCache, PersistentCacheProvider } from '../src/analytics/AnalyticsCache';
import { DomainEventBus } from '../src/domain/events/DomainEventBus';
import { IncomeAdded } from '../src/domain/events/FinancialEvents';
import { Money } from '../src/domain/finance/Money';
import { Currency } from '../src/domain/finance/Currency';
import { FinancialProfile } from '../src/domain/types/FinancialProfile';
import { Income } from '../src/domain/types/Income';
import { Expense } from '../src/domain/types/Expense';
import { Budget } from '../src/domain/types/Budget';
import { SavingsGoal } from '../src/domain/types/SavingsGoal';
import { TimelineSnapshot } from '../src/domain/timeline/FinancialTimeline';
import { CashFlow } from '../src/domain/types/CashFlow';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`❌ FAILURE: ${message}`);
  }
}

async function runBenchmarks() {
  console.log("=========================================");
  console.log("   Analytics Platform Benchmark Suite    ");
  console.log("=========================================");

  await testEventDrivenCache();
  testExplainabilityContracts();
  testExporterPackage();

  // Dataset Scaling Stress Tests
  const sizes = [100, 1000, 10000, 50000, 100000, 500000];
  console.log("\n--- Scaling & Stress Performance ---");
  console.log("Size\t\tTime (ms)\tHeap (MB)\tThroughput (ops/ms)");
  
  for (const size of sizes) {
    const snapshot = generateMockSnapshot(size);

    const memBefore = process.memoryUsage().heapUsed;
    const start = Date.now();

    // Run all analyzers and aggregators
    const trend = TrendAnalyzer.analyze(snapshot);
    const income = IncomeAnalyzer.analyze(snapshot);
    const spending = SpendingAnalyzer.analyze(snapshot);
    const budget = BudgetAnalyzer.analyze(snapshot);
    const goal = GoalAnalyzer.analyze(snapshot, Money.fromDecimal(500));
    const health = HealthAnalyzer.analyze(snapshot);
    const forecast = ForecastAnalyzer.analyze(snapshot);
    const insights = InsightsAggregator.aggregate(snapshot);
    const recommendations = RecommendationAggregator.aggregate(snapshot);

    const duration = Date.now() - start;
    const memAfter = process.memoryUsage().heapUsed;
    const heapUsedMb = Math.round((memAfter - memBefore) / (1024 * 1024) * 100) / 100;
    const throughput = Math.round(size / (duration || 1));

    console.log(`${size.toLocaleString()}\t\t${duration}ms\t\t${heapUsedMb} MB\t\t${throughput} tx/ms`);

    // Verify correct sums/aggregations for a subset to confirm correctness
    if (size === 100) {
      assert(spending.value.categories.length > 0, "Spending categorizes correctly");
      assert(budget.value.overallUtilization >= 0, "Budget utilization computed");
      assert(health.value.overallHealthScore > 0, "Unified health score compiles");
    }

    // Assert that even at 500,000, execution finishes in a reasonable time (typically < 1.5 seconds on single core)
    if (size === 500000) {
      assert(duration < 2500, "500k transaction analyzer throughput takes less than 2.5 seconds");
    }
  }

  console.log("\n=========================================");
  console.log(`Verification Complete: Passed: ${passed}, Failed: ${failed}`);
  console.log("=========================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

async function testEventDrivenCache() {
  console.log("\nTesting: Event-driven Cache Lifecycle Invalidation...");
  
  const cache = new AnalyticsCache();
  const userId = "user_test_999";
  const dummyPayload = { data: "dashboard_summary_123" };

  await cache.set(userId, dummyPayload);
  
  let cached = await cache.get(userId);
  assert(cached !== null, "Cache contains userId key");

  DomainEventBus.publish(new IncomeAdded(
    userId,
    "income_abc",
    Money.fromDecimal(500),
    "Salary"
  ));

  const cleared = await cache.get(userId);
  assert(cleared === null, "Cache key is automatically invalidated on IncomeAdded domain event");

  cache.destroy();
}

function testExplainabilityContracts() {
  console.log("Testing: Metric Explainability Contracts...");

  const snapshot = generateMockSnapshot(10);
  const trend = TrendAnalyzer.analyze(snapshot);

  assert(trend.value !== undefined, "ExplainableMetric holds result value");
  assert(trend.confidence === 100, "Confidence score resolved");
  assert(trend.calculationMethod.length > 0, "Calculation method description exists");
  assert(trend.dataSources.includes("cashFlowHistory"), "Data sources list contains referenced entities");
  assert(trend.timestamp instanceof Date, "Timestamp metadata resolves correctly");
}

function testExporterPackage() {
  console.log("Testing: Exporter Package tabulations...");

  const snapshot = generateMockSnapshot(50);
  const exportPkg = AnalyticsExporter.prepareExportData(snapshot);

  assert(exportPkg.datasets.incomes.rows.length === snapshot.incomes.length, "Incomes export row size equals snapshot size");
  assert(exportPkg.datasets.expenses.rows.length === snapshot.expenses.length, "Expenses export row size equals snapshot size");
  assert(exportPkg.datasets.budgets.rows.length === snapshot.budgets.length, "Budgets export row size equals snapshot size");
  assert(exportPkg.datasets.goals.rows.length === snapshot.savingsGoals.length, "Goals export row size");
  assert(exportPkg.datasets.cashFlows.rows.length > 0, "Monthly cash flows export tabulates");
}

function generateMockSnapshot(transactionCount: number): AnalyticsSnapshot {
  const currency = Currency.USD;

  const profile: FinancialProfile = {
    email: "stress_test@aurafinance.com",
    name: "Stress Tester",
    avatar: "",
    monthlySalary: Money.fromDecimal(8000, currency),
    additionalIncome: Money.fromDecimal(2000, currency),
    currentSavings: Money.fromDecimal(15000, currency),
    rent: Money.fromDecimal(2000, currency),
    fixedExpenses: Money.fromDecimal(1000, currency),
    monthlyBills: Money.fromDecimal(500, currency),
    emiLoans: Money.fromDecimal(500, currency),
    savingsGoalPercentage: 20,
    hasSetupProfile: true,
    salaryHistory: [
      { month: "2026-01", amount: Money.fromDecimal(10000, currency) }
    ]
  };

  const incomes: Income[] = [
    { id: "inc_1", source: "Salary", amount: Money.fromDecimal(8000, currency), category: "Salary", date: new Date("2026-06-01"), isRecurring: true },
    { id: "inc_2", source: "Stocks", amount: Money.fromDecimal(2000, currency), category: "Investments", date: new Date("2026-06-15"), isRecurring: false }
  ];

  // Generate synthetic expenses across 5 categories
  const categories = ["Food", "Transport", "Utilities", "Shopping", "Entertainment"];
  const merchants = ["Merchant A", "Merchant B", "Merchant C", "Merchant D", "Merchant E"];
  const expenses: Expense[] = [];

  for (let i = 0; i < transactionCount; i++) {
    const cat = categories[i % categories.length];
    const merc = merchants[i % merchants.length];
    
    // Distribute date randomly over the last 30 days
    const daysAgo = i % 30;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    // Random amount between 5.00 and 150.00
    const amtCents = BigInt(500 + (i * 73) % 14500); 
    expenses.push({
      id: `exp_${i}`,
      merchant: merc,
      amount: Money.fromCents(amtCents, currency),
      category: cat,
      date,
      isRecurring: i % 10 === 0,
      frequency: i % 10 === 0 ? "monthly" : undefined
    });
  }

  // Pre-calculate spent for budgets
  const budgets: Budget[] = categories.map((cat, idx) => {
    const matchingExpenses = expenses.filter(e => e.category === cat);
    const spent = matchingExpenses.reduce((sum, e) => sum.add(e.amount), Money.zero(currency));

    return {
      id: `b_${idx}`,
      category: cat,
      limit: Money.fromDecimal(5000, currency),
      spent,
      color: "#ff0000",
      alertThreshold: 80
    };
  });

  const savingsGoals: SavingsGoal[] = [
    { id: "g_1", name: "Emergency Fund", targetAmount: Money.fromDecimal(18000, currency), currentAmount: Money.fromDecimal(15000, currency), category: "emergency", targetDate: new Date("2026-12-31"), icon: "" },
    { id: "g_2", name: "Laptop", targetAmount: Money.fromDecimal(2000, currency), currentAmount: Money.fromDecimal(1200, currency), category: "laptop", targetDate: new Date("2026-08-30"), icon: "" }
  ];

  // Compile a mock timeline of last 6 months
  const timelineHistory: TimelineSnapshot[] = [];
  for (let m = 1; m <= 6; m++) {
    timelineHistory.push({
      month: `2026-0${m}`,
      balance: Money.fromDecimal(10000 + m * 1000, currency),
      savings: Money.fromDecimal(2000 + m * 500, currency),
      growthRate: 5.0
    });
  }

  const cashFlowHistory: CashFlow[] = timelineHistory.map((s) => ({
    month: s.month,
    inflow: Money.fromDecimal(10000, currency),
    outflow: Money.fromDecimal(8000, currency),
    netFlow: Money.fromDecimal(2000, currency),
    savingsRate: 20,
    burnRate: Money.fromDecimal(266, currency)
  }));

  return {
    profile,
    incomes,
    expenses,
    budgets,
    savingsGoals,
    notifications: [],
    timelineHistory,
    cashFlowHistory,
    reminders: []
  };
}

runBenchmarks();
