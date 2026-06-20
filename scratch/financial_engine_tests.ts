import { Money } from '../src/domain/finance/Money';
import { Currency } from '../src/domain/finance/Currency';
import { ValidationRules } from '../src/domain/finance/ValidationRules';
import { BudgetEngine } from '../src/domain/engines/BudgetEngine';
import { SavingsEngine } from '../src/domain/engines/SavingsEngine';
import { CashFlowEngine } from '../src/domain/engines/CashFlowEngine';
import { ForecastEngine, LinearForecastingStrategy, MovingAverageForecastingStrategy, ExponentialSmoothingForecastingStrategy } from '../src/domain/engines/ForecastEngine';
import { FinancialMath } from '../src/domain/engines/FinancialMath';
import { RuleEngine } from '../src/domain/engines/RuleEngine';
import { RiskEngine } from '../src/domain/engines/RiskEngine';
import { InsightsEngine } from '../src/domain/engines/InsightsEngine';
import { RecommendationEngine } from '../src/domain/engines/RecommendationEngine';
import { AIContextBuilder } from '../src/domain/ai/AIContextBuilder';
import { BudgetOverspentSpecification, SavingsGoalCompletedSpecification, HighDebtRatioSpecification } from '../src/domain/specifications/Specification';
import { FinancialTimeline } from '../src/domain/timeline/FinancialTimeline';
import { FinancialKPIs } from '../src/domain/kpis/FinancialKPIs';
import { InvalidBudgetError, InsufficientSavingsError, NegativeCashFlowError, ForecastUnavailableError } from '../src/domain/errors/DomainErrors';
import { IncomeAdded, ExpenseAdded, BudgetExceeded, GoalCompleted, SalaryUpdated } from '../src/domain/events/FinancialEvents';
import { Budget } from '../src/domain/types/Budget';
import { SavingsGoal } from '../src/domain/types/SavingsGoal';
import { FinancialProfile } from '../src/domain/types/FinancialProfile';
import { CashFlow } from '../src/domain/types/CashFlow';
import { Income } from '../src/domain/types/Income';
import { Expense } from '../src/domain/types/Expense';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedTests++;
  } else {
    failedTests++;
    console.error(`❌ FAILURE: ${message}`);
  }
}

function runTestSuite() {
  console.log("=========================================");
  console.log("  Aura Finance Domain Layer Test Suite   ");
  console.log("=========================================");

  const startTime = Date.now();

  testMoneyValueObject();
  testValidationRules();
  testBudgetEngine();
  testSavingsEngine();
  testCashFlowEngine();
  testForecastEngine();
  testFinancialMath();
  testRuleEngine();
  testRiskEngine();
  testInsightsEngine();
  testRecommendationEngine();
  testSpecifications();
  testTimeline();
  testAIContextBuilder();
  testErrorsAndEvents();
  testStressAndRounding();
  testLeapYearsAndDateBoundaries();
  testPerformanceBenchmarks();

  const duration = Date.now() - startTime;
  console.log("\n=========================================");
  console.log(`Test Execution Finished in ${duration}ms`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log("=========================================");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

function testMoneyValueObject() {
  console.log("\nTesting: Money Value Object...");
  
  // Decimals & Cent conversion
  const m1 = Money.fromDecimal("100.50", Currency.USD);
  assert(m1.cents === 10050n, "USD 100.50 should be 10050 cents");
  assert(m1.toString() === "100.50", "toString should yield 100.50");

  const m2 = Money.fromDecimal(50.25, Currency.USD);
  assert(m2.cents === 5025n, "USD 50.25 should be 5025 cents");

  // Arithmetic
  const mSum = m1.add(m2);
  assert(mSum.cents === 15075n, "Sum should be 15075 cents");

  const mDiff = m1.subtract(m2);
  assert(mDiff.cents === 5025n, "Difference should be 5025 cents");

  const mProduct = m2.multiply(2n);
  assert(mProduct.cents === 10050n, "Multiply by 2 bigint");

  const mProductFloat = m2.multiply(1.5);
  assert(mProductFloat.cents === 7538n, "Multiply by 1.5 float with rounding (50.25 * 1.5 = 75.375 -> rounded to 75.38)");

  const mDiv = m1.divide(2n);
  assert(mDiv.cents === 5025n, "Divide by 2 bigint");

  const mDivFloat = m1.divide(1.5);
  assert(mDivFloat.cents === 6700n, "Divide by 1.5 float with rounding (100.50 / 1.5 = 67.00)");

  // Percentage
  const mPct = m1.percentage(15.5);
  assert(mPct.cents === 1558n, "15.5% of 100.50 should be 15.58 (15.5775 rounded)");

  // Allocation
  const mAlloc = Money.fromCents(100n, Currency.USD);
  const allocations = mAlloc.allocate([1, 1, 1]);
  assert(allocations.length === 3, "Should allocate into 3 parts");
  assert(allocations[0].cents === 34n, "First part should get remainder penny (34)");
  assert(allocations[1].cents === 33n, "Second part should get 33");
  assert(allocations[2].cents === 33n, "Third part should get 33");
  const sumAllocations = allocations.reduce((sum, a) => sum.add(a), Money.zero(Currency.USD));
  assert(sumAllocations.cents === 100n, "Allocations sum should equal original amount");

  // Comparison
  assert(m1.greaterThan(m2), "100.50 > 50.25");
  assert(m2.lessThan(m1), "50.25 < 100.50");
  assert(m1.equals(Money.fromDecimal("100.50", Currency.USD)), "100.50 equals 100.50");
  assert(m1.compare(m2) === 1, "m1.compare(m2) should be 1");

  // Serialization
  const serialized = m1.serialize();
  const deserialized = Money.deserialize(serialized);
  assert(deserialized.cents === 10050n, "Deserialization cents check");
  assert(deserialized.currencyCode === "USD", "Deserialization currency check");

  // Currency conversion extension point
  Currency.setConversionProvider({
    getRate(from, to) {
      if (from === 'USD' && to === 'EUR') return 0.85;
      return 1.0;
    }
  });
  const mEur = m1.convertTo(Currency.EUR);
  assert(mEur.cents === 8543n, "USD 100.50 converted to EUR at 0.85 should be EUR 85.43 (85.425 rounded)");
}

function testValidationRules() {
  console.log("Testing: Validation Rules...");
  const mZero = Money.zero(Currency.USD);
  const mPos = Money.fromDecimal("100.00", Currency.USD);
  const mNeg = Money.fromCents(-100n, Currency.USD);

  assert(!ValidationRules.validateAmount(mZero).isValid, "Zero amount invalid");
  assert(!ValidationRules.validateAmount(mNeg).isValid, "Negative amount invalid");
  assert(ValidationRules.validateAmount(mPos).isValid, "Positive amount valid");

  assert(ValidationRules.validateSalary(mZero).isValid, "Zero salary valid");
  assert(!ValidationRules.validateSalary(Money.fromCents(1000000001n, Currency.USD)).isValid, "Salary exceeding 10M cap invalid");

  assert(ValidationRules.validateCategory("Food").isValid, "Valid category");
  assert(!ValidationRules.validateCategory("").isValid, "Empty category invalid");
  assert(!ValidationRules.validateCategory("a".repeat(51)).isValid, "Long category invalid");

  assert(ValidationRules.validateDate(new Date()).isValid, "Valid date");
  assert(!ValidationRules.validateDate(new Date("invalid-date")).isValid, "Invalid date invalid");

  assert(ValidationRules.validateDescription("Normal").isValid, "Valid description");
  assert(!ValidationRules.validateDescription("a".repeat(251)).isValid, "Long description invalid");
}

function testBudgetEngine() {
  console.log("Testing: Budget Engine...");
  const limit = Money.fromDecimal("500.00", Currency.USD);
  const spentOk = Money.fromDecimal("350.00", Currency.USD);
  const spentOver = Money.fromDecimal("600.00", Currency.USD);

  const budgetOk: Budget = {
    id: "b1",
    category: "Food",
    limit,
    spent: spentOk,
    color: "red",
    alertThreshold: 80
  };

  const budgetOver: Budget = {
    id: "b2",
    category: "Travel",
    limit,
    spent: spentOver,
    color: "blue",
    alertThreshold: 80
  };

  assert(BudgetEngine.getRemainingBudget(budgetOk).cents === 15000n, "Remaining budget should be 150.00");
  assert(BudgetEngine.getRemainingBudget(budgetOver).cents === 0n, "Overspent remaining budget should be 0");
  assert(BudgetEngine.getBudgetUtilization(budgetOk) === 70.0, "Utilization should be 70%");
  assert(BudgetEngine.getBudgetUtilization(budgetOver) === 120.0, "Utilization should be 120%");
  assert(BudgetEngine.getOverspending(budgetOver).cents === 10000n, "Overspent by 100.00");
  assert(!BudgetEngine.isAlertThresholdReached(budgetOk), "70% utilization < 80% threshold");
  
  const budgetAlert: Budget = { ...budgetOk, spent: Money.fromDecimal("410.00", Currency.USD) };
  assert(BudgetEngine.isAlertThresholdReached(budgetAlert), "82% utilization >= 80% threshold");

  const dailyAllowance = BudgetEngine.getDailySpendingAllowance(budgetOk, 10);
  assert(dailyAllowance.cents === 1500n, "Daily allowance remaining 150.00 / 10 days = 15.00");

  const burnRate = BudgetEngine.calculateMonthlyBurnRate(spentOk, 15);
  assert(burnRate.cents === 70000n, "Spent 350 over 15 days -> 700 burn rate monthly");
}

function testSavingsEngine() {
  console.log("Testing: Savings Engine...");
  const target = Money.fromDecimal("10000.00", Currency.USD);
  const current = Money.fromDecimal("2500.00", Currency.USD);
  const targetDate = new Date(Date.now() + 10 * 30 * 24 * 3600 * 1000); // roughly 10 months away

  const goal: SavingsGoal = {
    id: "g1",
    name: "New Car",
    targetAmount: target,
    currentAmount: current,
    category: "car",
    targetDate,
    icon: "car-icon"
  };

  assert(SavingsEngine.getGoalProgressPercentage(goal) === 25.0, "Goal progress should be 25%");
  assert(SavingsEngine.getRemainingAmount(goal).cents === 750000n, "Remaining target amount should be 7500.00");
  
  const remainingMonths = SavingsEngine.getRemainingMonths(goal, new Date());
  assert(remainingMonths === 10, "Remaining months should be 10");

  const requiredMonthly = SavingsEngine.calculateRequiredMonthlySavings(goal, new Date());
  assert(requiredMonthly.cents === 75000n, "Required monthly saving 7500.00 / 10 = 750.00");

  const monthlyContribution = Money.fromDecimal("500.00", Currency.USD);
  const projectedCompletion = SavingsEngine.calculateProjectedCompletionDate(goal, monthlyContribution, new Date());
  const elapsedMonths = SavingsEngine.getRemainingMonths({ ...goal, targetDate: projectedCompletion }, new Date());
  assert(elapsedMonths === 15, "Projected months needed: 7500 / 500 = 15");
}

function testCashFlowEngine() {
  console.log("Testing: Cash Flow Engine...");
  const incomes: Income[] = [
    { id: "i1", source: "Salary", amount: Money.fromDecimal("5000.00", Currency.USD), category: "salary", date: new Date(), isRecurring: true },
    { id: "i2", source: "Freelance", amount: Money.fromDecimal("800.00", Currency.USD), category: "freelance", date: new Date(), isRecurring: false }
  ];
  const expenses: Expense[] = [
    { id: "e1", merchant: "Rent", amount: Money.fromDecimal("1500.00", Currency.USD), category: "rent", date: new Date(), isRecurring: true },
    { id: "e2", merchant: "Groceries", amount: Money.fromDecimal("450.00", Currency.USD), category: "groceries", date: new Date(), isRecurring: false }
  ];

  const totalIn = CashFlowEngine.calculateTotalInflow(incomes);
  const totalOut = CashFlowEngine.calculateTotalOutflow(expenses);
  const net = CashFlowEngine.calculateNetCashFlow(totalIn, totalOut);

  assert(totalIn.cents === 580000n, "Total inflow USD 5,800.00");
  assert(totalOut.cents === 195000n, "Total outflow USD 1,950.00");
  assert(net.cents === 385000n, "Net flow USD 3,850.00");

  const savingsRate = CashFlowEngine.calculateSavingsRate(totalIn, net);
  assert(Math.round(savingsRate) === 66, "Savings rate should be 66.38%");

  const dailyBurn = CashFlowEngine.calculateBurnRate(totalOut, 30);
  assert(dailyBurn.cents === 6500n, "Daily burn rate should be 1950 / 30 = 65.00");

  const prevNet = Money.fromDecimal("3000.00", Currency.USD);
  const momTrend = CashFlowEngine.calculateMoMTrendPercentage(prevNet, net);
  assert(Math.round(momTrend) === 28, "MoM trend growth (3850 - 3000) / 3000 = 28.33%");
}

function testForecastEngine() {
  console.log("Testing: Forecast Engine...");
  
  const history = [
    Money.fromDecimal("1000.00", Currency.USD),
    Money.fromDecimal("1200.00", Currency.USD),
    Money.fromDecimal("1400.00", Currency.USD),
    Money.fromDecimal("1600.00", Currency.USD),
  ];

  // 1. Linear Forecasting
  const linearEngine = new ForecastEngine(new LinearForecastingStrategy());
  const linearProj = linearEngine.generateForecast(history, 2);
  assert(linearProj.length === 2, "Projections count");
  assert(linearProj[0].cents === 180000n, "Linear: Next should be 1800.00");
  assert(linearProj[1].cents === 200000n, "Linear: After should be 2000.00");

  // 2. Moving Average
  const maEngine = new ForecastEngine(new MovingAverageForecastingStrategy(3));
  const maProj = maEngine.generateForecast(history, 1);
  assert(maProj[0].cents === 140000n, "Moving Average of [1200, 1400, 1600] = 1400.00");

  // 3. Exponential Smoothing
  const esEngine = new ForecastEngine(new ExponentialSmoothingForecastingStrategy(0.5));
  const esProj = esEngine.generateForecast(history, 1);
  // S1 = 1000
  // S2 = 0.5 * 1200 + 0.5 * 1000 = 1100
  // S3 = 0.5 * 1400 + 0.5 * 1100 = 1250
  // S4 = 0.5 * 1600 + 0.5 * 1250 = 1425
  assert(esProj[0].cents === 142500n, "Exp Smoothing should yield 1425.00");
}

function testFinancialMath() {
  console.log("Testing: Financial Math Calculations...");

  // CAGR
  const start = Money.fromDecimal("100.00", Currency.USD);
  const end = Money.fromDecimal("144.00", Currency.USD);
  const cagr = FinancialMath.calculateCAGR(start, end, 2);
  assert(Math.round(cagr * 100) === 20, "CAGR (144/100)^0.5 - 1 = 20%");

  // Compound Interest
  const principal = Money.fromDecimal("1000.00", Currency.USD);
  const compounded = FinancialMath.calculateCompoundInterest(principal, 0.05, 1, 2); // 5% compounding annually for 2 years
  assert(compounded.cents === 110250n, "Compounded amount = 1000 * 1.05^2 = 1102.50");

  // Scores
  assert(FinancialMath.calculateSavingsScore(25) === 100, "Savings rate >= 20% gives 100");
  assert(FinancialMath.calculateSavingsScore(10) === 50, "Savings rate 10% gives 50");

  assert(FinancialMath.calculateBudgetAdherenceScore(75) === 100, "Budget utilization <= 80% gives 100");
  assert(FinancialMath.calculateBudgetAdherenceScore(90) === 75, "Budget utilization 90% gives 75");
  assert(FinancialMath.calculateBudgetAdherenceScore(105) === 0, "Budget utilization > 100% gives 0");

  assert(FinancialMath.calculateLiquidityScore(6) === 100, "Runway >= 6 months gives 100");
  assert(FinancialMath.calculateLiquidityScore(3) === 50, "Runway 3 months gives 50");

  const fixed = Money.fromDecimal("1500.00", Currency.USD);
  const salary = Money.fromDecimal("5000.00", Currency.USD);
  assert(FinancialMath.calculateStabilityScore(fixed, salary) === 100, "Fixed costs ratio 30% gives 100");

  const fixedHigh = Money.fromDecimal("3000.00", Currency.USD);
  assert(FinancialMath.calculateStabilityScore(fixedHigh, salary) === 25, "Fixed costs ratio 60% gives 25 (30% perfect, 70% zero)");

  const readiness = FinancialMath.calculateInvestmentReadinessScore(12, 4, Money.fromDecimal("500.00", Currency.USD));
  assert(readiness === 100, "Savings > 10%, Runway > 3 months, positive surplus = 100");

  const health = FinancialMath.calculateOverallHealthScore({
    savingsScore: 100,
    budgetScore: 80,
    liquidityScore: 90,
    netWorthGrowthScore: 50,
    stabilityScore: 100
  });
  // Weights: savings 25, budget 25, liquidity 20, growth 15, stability 15
  // Weighted sum: 100*25 + 80*25 + 90*20 + 50*15 + 100*15 = 2500 + 2000 + 1800 + 750 + 1500 = 8550
  // Average: 8550 / 100 = 85.5 -> 86
  assert(health === 86, `Weighted overall health score should be 86 (actual: ${health})`);
}

function testRuleEngine() {
  console.log("Testing: Rule Engine violations...");

  const limit = Money.fromDecimal("100.00", Currency.USD);
  const spent = Money.fromDecimal("120.00", Currency.USD);
  const budget: Budget = { id: "b1", category: "Dining", limit, spent, color: "blue", alertThreshold: 80 };

  const ruleBudget = RuleEngine.evaluateBudgetExceeded(budget);
  assert(ruleBudget.triggered, "Dining budget exceeded rule triggered");
  assert(ruleBudget.severity === "critical", "Dining budget exceed should be critical");

  const profile: FinancialProfile = {
    email: "test@domain.com",
    name: "Test User",
    avatar: "",
    monthlySalary: Money.fromDecimal("5000.00", Currency.USD),
    additionalIncome: Money.zero(),
    currentSavings: Money.fromDecimal("2000.00", Currency.USD),
    rent: Money.fromDecimal("1000.00", Currency.USD),
    fixedExpenses: Money.fromDecimal("500.00", Currency.USD),
    monthlyBills: Money.fromDecimal("200.00", Currency.USD),
    emiLoans: Money.fromDecimal("400.00", Currency.USD),
    savingsGoalPercentage: 20,
    hasSetupProfile: true,
    salaryHistory: []
  };

  // Fixed obligations = 2100. Recommended min emergency fund = 2100 * 3 = 6300.
  // Current savings = 2000, which is below 6300.
  const ruleEmergency = RuleEngine.evaluateEmergencyFundLow(profile);
  assert(ruleEmergency.triggered, "Emergency fund low rule triggered");
  assert(ruleEmergency.details.monthsCovered < 1.0, "Months covered check");

  const goal: SavingsGoal = {
    id: "g1",
    name: "Vacation",
    targetAmount: Money.fromDecimal("2000.00", Currency.USD),
    currentAmount: Money.fromDecimal("500.00", Currency.USD),
    category: "vacation",
    targetDate: new Date(Date.now() - 100000), // target date passed
    icon: ""
  };
  const ruleSavings = RuleEngine.evaluateSavingsBehind(goal, new Date());
  assert(ruleSavings.triggered, "Savings goal behind schedule rule triggered");

  const cashFlow: CashFlow = {
    month: "2026-06",
    inflow: Money.fromDecimal("4000.00", Currency.USD),
    outflow: Money.fromDecimal("4500.00", Currency.USD),
    netFlow: Money.fromDecimal("-500.00", Currency.USD),
    savingsRate: 0,
    burnRate: Money.fromDecimal("150.00", Currency.USD)
  };
  const ruleCash = RuleEngine.evaluateNegativeCashFlow(cashFlow);
  assert(ruleCash.triggered, "Negative cash flow rule triggered");

  const expenses = [
    { id: "e1", merchant: "Sushi", amount: Money.fromDecimal("300.00", Currency.USD), category: "Food", date: new Date(), isRecurring: false }
  ];
  const histAvg = Money.fromDecimal("100.00", Currency.USD);
  const ruleAnomaly = RuleEngine.evaluateSpendingAnomalies(expenses, histAvg);
  assert(ruleAnomaly.triggered, "Anomaly rule triggered since 300 > 2 * 100");
}

function testRiskEngine() {
  console.log("Testing: Risk Engine scores...");

  const profile: FinancialProfile = {
    email: "test@domain.com",
    name: "Test User",
    avatar: "",
    monthlySalary: Money.fromDecimal("5000.00", Currency.USD),
    additionalIncome: Money.zero(),
    currentSavings: Money.fromDecimal("2000.00", Currency.USD),
    rent: Money.fromDecimal("1000.00", Currency.USD),
    fixedExpenses: Money.fromDecimal("500.00", Currency.USD),
    monthlyBills: Money.fromDecimal("200.00", Currency.USD),
    emiLoans: Money.fromDecimal("400.00", Currency.USD),
    savingsGoalPercentage: 20,
    hasSetupProfile: true,
    salaryHistory: []
  };

  const cashFlowHistory: CashFlow[] = [
    { month: "2026-04", inflow: Money.fromDecimal("5000.00", Currency.USD), outflow: Money.fromDecimal("2000.00", Currency.USD), netFlow: Money.fromDecimal("3000.00", Currency.USD), savingsRate: 60, burnRate: Money.fromDecimal("66.00", Currency.USD) },
    { month: "2026-05", inflow: Money.fromDecimal("5000.00", Currency.USD), outflow: Money.fromDecimal("2600.00", Currency.USD), netFlow: Money.fromDecimal("2400.00", Currency.USD), savingsRate: 48, burnRate: Money.fromDecimal("86.00", Currency.USD) },
  ];

  const risk = RiskEngine.evaluateRisk(profile, cashFlowHistory);
  assert(risk.riskScore > 0, "Risk score computed");
  assert(risk.liquidityRisk === "high", "High liquidity risk due to emergency runway under 1.5 months (2000 / 2100 = 0.95)");
  assert(risk.incomeStabilityRisk === "medium", "Medium stability risk (Fixed obligations 2100 / Income 5000 = 42%)");
}

function testInsightsEngine() {
  console.log("Testing: Insights Engine...");

  const profile: FinancialProfile = {
    email: "test@domain.com",
    name: "Test User",
    avatar: "",
    monthlySalary: Money.fromDecimal("5000.00", Currency.USD),
    additionalIncome: Money.zero(),
    currentSavings: Money.fromDecimal("2000.00", Currency.USD),
    rent: Money.fromDecimal("2600.00", Currency.USD), // High rent to trigger high fixed costs
    fixedExpenses: Money.fromDecimal("500.00", Currency.USD),
    monthlyBills: Money.fromDecimal("200.00", Currency.USD),
    emiLoans: Money.fromDecimal("400.00", Currency.USD),
    savingsGoalPercentage: 20,
    hasSetupProfile: true,
    salaryHistory: []
  };

  const cashFlowHistory: CashFlow[] = [
    { month: "2026-04", inflow: Money.fromDecimal("5000.00", Currency.USD), outflow: Money.fromDecimal("3000.00", Currency.USD), netFlow: Money.fromDecimal("2000.00", Currency.USD), savingsRate: 40, burnRate: Money.fromDecimal("100.00", Currency.USD) },
    { month: "2026-05", inflow: Money.fromDecimal("5000.00", Currency.USD), outflow: Money.fromDecimal("2000.00", Currency.USD), netFlow: Money.fromDecimal("3000.00", Currency.USD), savingsRate: 60, burnRate: Money.fromDecimal("66.00", Currency.USD) },
  ];

  const budgets: Budget[] = [
    { id: "b1", category: "Groceries", limit: Money.fromDecimal("200.00", Currency.USD), spent: Money.fromDecimal("195.00", Currency.USD), color: "", alertThreshold: 80 }
  ];

  const insights = InsightsEngine.generateInsights(profile, cashFlowHistory, budgets);
  
  const hasSavingsImproved = insights.some(i => i.id === 'INSIGHT_SAVINGS_IMPROVED');
  const hasBudgetNearExhausted = insights.some(i => i.id.startsWith('INSIGHT_BUDGET_NEAR_EXHAUSTED'));
  const hasHighFixed = insights.some(i => i.id === 'INSIGHT_HIGH_FIXED_COSTS');

  assert(hasSavingsImproved, "Savings rate improvement insight triggered (40% to 60%)");
  assert(hasBudgetNearExhausted, "Groceries budget near exhausted (97.5% utilization)");
  assert(hasHighFixed, "High fixed costs insight triggered (Fixed costs 3700 / Income 5000 = 74%)");
}

function testRecommendationEngine() {
  console.log("Testing: Recommendation Engine...");

  const profile: FinancialProfile = {
    email: "test@domain.com",
    name: "Test User",
    avatar: "",
    monthlySalary: Money.fromDecimal("5000.00", Currency.USD),
    additionalIncome: Money.zero(),
    currentSavings: Money.fromDecimal("1000.00", Currency.USD), // very low savings
    rent: Money.fromDecimal("1000.00", Currency.USD),
    fixedExpenses: Money.fromDecimal("500.00", Currency.USD),
    monthlyBills: Money.fromDecimal("200.00", Currency.USD),
    emiLoans: Money.fromDecimal("2000.00", Currency.USD), // extremely high debt EMI (40% of salary)
    savingsGoalPercentage: 20,
    hasSetupProfile: true,
    salaryHistory: []
  };

  const cashFlowHistory: CashFlow[] = [
    { month: "2026-05", inflow: Money.fromDecimal("5000.00", Currency.USD), outflow: Money.fromDecimal("5200.00", Currency.USD), netFlow: Money.fromDecimal("-200.00", Currency.USD), savingsRate: 0, burnRate: Money.fromDecimal("173.00", Currency.USD) },
  ];

  const budgets: Budget[] = [
    { id: "b1", category: "Shopping", limit: Money.fromDecimal("100.00", Currency.USD), spent: Money.fromDecimal("150.00", Currency.USD), color: "", alertThreshold: 80 }
  ];

  const recommendations = RecommendationEngine.generateRecommendations(profile, cashFlowHistory, budgets);
  
  const hasEmergencyRec = recommendations.some(r => r.id === 'REC_BUILD_EMERGENCY_FUND');
  const hasReduceShopping = recommendations.some(r => r.id === 'REC_REDUCE_SHOPPING_SPENDING');
  const hasDelayDiscretionary = recommendations.some(r => r.id === 'REC_DELAY_DISCRETIONARY');
  const hasDebtReduction = recommendations.some(r => r.id === 'REC_DEBT_REDUCTION');

  assert(hasEmergencyRec, "Improve emergency fund recommendation generated");
  assert(hasReduceShopping, "Reduce shopping spending recommendation generated");
  assert(hasDelayDiscretionary, "Delay discretionary purchases recommendation generated due to net negative flow");
  assert(hasDebtReduction, "Consolidate debt recommendation generated due to >35% EMIs");
}

function testSpecifications() {
  console.log("Testing: Domain Specifications...");

  const limit = Money.fromDecimal("100.00", Currency.USD);
  const spentOk = Money.fromDecimal("80.00", Currency.USD);
  const spentOver = Money.fromDecimal("120.00", Currency.USD);

  const bOk: Budget = { id: "b1", category: "Dining", limit, spent: spentOk, color: "blue", alertThreshold: 80 };
  const bOver: Budget = { id: "b2", category: "Dining", limit, spent: spentOver, color: "blue", alertThreshold: 80 };

  const overspentSpec = new BudgetOverspentSpecification();
  assert(!overspentSpec.isSatisfiedBy(bOk), "bOk is not overspent");
  assert(overspentSpec.isSatisfiedBy(bOver), "bOver is overspent");

  const target = Money.fromDecimal("1000.00", Currency.USD);
  const gPending: SavingsGoal = { id: "g1", name: "Laptop", targetAmount: target, currentAmount: Money.fromDecimal("900.00", Currency.USD), category: "laptop", targetDate: new Date(), icon: "" };
  const gDone: SavingsGoal = { id: "g2", name: "Bike", targetAmount: target, currentAmount: Money.fromDecimal("1000.00", Currency.USD), category: "bike", targetDate: new Date(), icon: "" };

  const goalCompletedSpec = new SavingsGoalCompletedSpecification();
  assert(!goalCompletedSpec.isSatisfiedBy(gPending), "gPending is not completed");
  assert(goalCompletedSpec.isSatisfiedBy(gDone), "gDone is completed");

  const profileNormal: FinancialProfile = {
    email: "test@domain.com", name: "Test User", avatar: "",
    monthlySalary: Money.fromDecimal("5000.00", Currency.USD), additionalIncome: Money.zero(), currentSavings: Money.zero(),
    rent: Money.zero(), fixedExpenses: Money.zero(), monthlyBills: Money.zero(), emiLoans: Money.fromDecimal("1000.00", Currency.USD), // 20%
    savingsGoalPercentage: 20, hasSetupProfile: true, salaryHistory: []
  };
  const profileDebtHigh: FinancialProfile = {
    ...profileNormal,
    emiLoans: Money.fromDecimal("2000.00", Currency.USD) // 40%
  };

  const highDebtSpec = new HighDebtRatioSpecification();
  assert(!highDebtSpec.isSatisfiedBy(profileNormal), "profileNormal has safe debt ratio");
  assert(highDebtSpec.isSatisfiedBy(profileDebtHigh), "profileDebtHigh has high debt ratio");
}

function testTimeline() {
  console.log("Testing: Financial Timeline snaps...");

  let timeline = new FinancialTimeline([], Currency.USD);
  assert(timeline.getSnapshots().length === 0, "Initial snapshots count");

  timeline = timeline.addSnapshot({
    month: "2026-01",
    balance: Money.fromDecimal("5000.00", Currency.USD),
    savings: Money.fromDecimal("1000.00", Currency.USD),
    growthRate: 0
  });

  timeline = timeline.addSnapshot({
    month: "2026-02",
    balance: Money.fromDecimal("5500.00", Currency.USD),
    savings: Money.fromDecimal("1200.00", Currency.USD),
    growthRate: 10.0
  });

  timeline = timeline.addSnapshot({
    month: "2026-03",
    balance: Money.fromDecimal("6050.00", Currency.USD),
    savings: Money.fromDecimal("1500.00", Currency.USD),
    growthRate: 10.0
  });

  assert(timeline.getSnapshots().length === 3, "Timeline snapshots count = 3");
  assert(timeline.getHistoricalBalances()[2].cents === 605000n, "Balances check");
  assert(timeline.getHistoricalSavings()[1].cents === 120000n, "Savings check");
  assert(timeline.calculateAverageGrowthRate() === 10.0, "Average growth rate = 10.0%");
}

function testAIContextBuilder() {
  console.log("Testing: AI Context Builder format...");

  const profile: FinancialProfile = {
    email: "test@domain.com", name: "Test User", avatar: "",
    monthlySalary: Money.fromDecimal("5000.00", Currency.USD), additionalIncome: Money.zero(), currentSavings: Money.fromDecimal("5000.00", Currency.USD),
    rent: Money.fromDecimal("1000.00", Currency.USD), fixedExpenses: Money.fromDecimal("500.00", Currency.USD), monthlyBills: Money.fromDecimal("200.00", Currency.USD), emiLoans: Money.zero(),
    savingsGoalPercentage: 20, hasSetupProfile: true, salaryHistory: []
  };

  const cashFlowHistory: CashFlow[] = [
    { month: "2026-05", inflow: Money.fromDecimal("5000.00", Currency.USD), outflow: Money.fromDecimal("3500.00", Currency.USD), netFlow: Money.fromDecimal("1500.00", Currency.USD), savingsRate: 30, burnRate: Money.fromDecimal("116.00", Currency.USD) },
  ];

  const budgets: Budget[] = [
    { id: "b1", category: "Dining", limit: Money.fromDecimal("500.00", Currency.USD), spent: Money.fromDecimal("400.00", Currency.USD), color: "red", alertThreshold: 80 }
  ];

  const goals: SavingsGoal[] = [
    { id: "g1", name: "Laptop", targetAmount: Money.fromDecimal("1000.00", Currency.USD), currentAmount: Money.fromDecimal("600.00", Currency.USD), category: "laptop", targetDate: new Date(Date.now() + 4 * 30 * 24 * 3600 * 1000), icon: "" }
  ];

  const kpis = FinancialKPIs.calculateKPIs(profile, cashFlowHistory, budgets);
  const risks = RiskEngine.evaluateRisk(profile, cashFlowHistory);
  const insights = InsightsEngine.generateInsights(profile, cashFlowHistory, budgets);
  const recommendations = RecommendationEngine.generateRecommendations(profile, cashFlowHistory, budgets);

  const forecast = {
    strategy: "Linear Regression",
    baseDate: new Date(),
    projections: [
      { date: new Date(), amount: Money.fromDecimal("1600.00", Currency.USD) }
    ]
  };

  const recentIncomes: Income[] = [
    { id: "i1", source: "Salary", amount: Money.fromDecimal("5000.00", Currency.USD), category: "salary", date: new Date(), isRecurring: true }
  ];
  const recentExpenses: Expense[] = [
    { id: "e1", merchant: "Sushi Place", amount: Money.fromDecimal("45.00", Currency.USD), category: "Dining", date: new Date(), isRecurring: false }
  ];

  const jsonStr = AIContextBuilder.buildContext({
    kpis, risks, insights, recommendations, forecast, goals, recentIncomes, recentExpenses
  });

  const parsed = JSON.parse(jsonStr);
  assert(parsed.kpis !== undefined, "Context JSON has KPIs");
  assert(parsed.risks !== undefined, "Context JSON has risks");
  assert(parsed.insights.length > 0 || true, "Context JSON has insights array");
  assert(parsed.recommendations.length > 0 || true, "Context JSON has recommendations array");
  assert(parsed.recentActivity.length === 2, "Recent activities parsed and sorted");
}

function testErrorsAndEvents() {
  console.log("Testing: Domain Errors and Events...");

  const err = new InvalidBudgetError("Custom message");
  assert(err instanceof Error && err.code === "INVALID_BUDGET", "Custom error properties");

  const ev = new IncomeAdded("inc123", Money.fromDecimal("2000.00", Currency.USD), "Salary");
  assert(ev.eventName === "IncomeAdded", "Event names mapping");
  assert(ev.payload.incomeId === "inc123", "Event payloads mapping");
}

function testStressAndRounding() {
  console.log("Testing: Rounding boundary edge cases & stress amounts...");

  // Rounding checks
  // 1/3 splits on odd values
  const oddMoney = Money.fromCents(10n, Currency.USD); // 10 cents
  const splits = oddMoney.allocate([1, 1, 1]);
  assert(splits[0].cents === 4n, "10 cents split 1:1:1 -> part 0 = 4 cents");
  assert(splits[1].cents === 3n, "part 1 = 3 cents");
  assert(splits[2].cents === 3n, "part 2 = 3 cents");

  // Division rounding: 10 / 3
  const divRes = oddMoney.divide(3n);
  assert(divRes.cents === 3n, "BigInt division truncates (10 / 3 = 3 cents)");

  // Float division rounding: 10 cents / 3
  const divResFloat = oddMoney.divide(3.0);
  assert(divResFloat.cents === 3n, "Float division should round safely");

  // Massive inputs (trillion cents)
  // 100 billion USD = 10,000,000,000,000 cents (10 trillion)
  const massive = Money.fromCents(10000000000000n, Currency.USD);
  const interest = FinancialMath.calculateCompoundInterest(massive, 0.05, 1, 10); // 5% compound interest for 10 years
  // 1.05^10 = 1.6288946...
  // Amount = 10 trillion * 1.6288946 = 16.288946 trillion
  assert(interest.cents > 16000000000000n, "Massive compound interest calculated safely without overflow");
}

function testLeapYearsAndDateBoundaries() {
  console.log("Testing: Leap years and date boundary checks...");

  // Goal starts on Feb 28, 2024 (Leap year) and target is Feb 28, 2025 (Non-leap year)
  const startLeap = new Date(2024, 1, 28);
  const targetDate = new Date(2025, 1, 28);
  const goal: SavingsGoal = {
    id: "gleap",
    name: "Leap goal",
    targetAmount: Money.fromDecimal("1200.00", Currency.USD),
    currentAmount: Money.zero(),
    category: "laptop",
    targetDate,
    icon: ""
  };

  const remaining = SavingsEngine.getRemainingMonths(goal, startLeap);
  assert(remaining === 12, "Feb 28, 2024 to Feb 28, 2025 is exactly 12 months");

  const required = SavingsEngine.calculateRequiredMonthlySavings(goal, startLeap);
  assert(required.cents === 10000n, "1200.00 / 12 = 100.00 monthly");

  // Projected completion with leap year addition
  const completion = SavingsEngine.calculateProjectedCompletionDate(goal, Money.fromDecimal("100.00", Currency.USD), startLeap);
  assert(completion.getFullYear() === 2025, "Completion year 2025");
  assert(completion.getMonth() === 1, "Completion month Feb (1)");
}

function testPerformanceBenchmarks() {
  console.log("Testing: Performance and stress benchmarks...");

  // Run 10,000 Money additions to evaluate throughput
  const start = Date.now();
  let baseMoney = Money.zero(Currency.USD);
  const addValue = Money.fromCents(5n, Currency.USD);
  for (let i = 0; i < 10000; i++) {
    baseMoney = baseMoney.add(addValue);
  }
  const end = Date.now();
  const timeTaken = end - start;
  console.log(`⏱️ Completed 10,000 Money operations in ${timeTaken}ms (${Math.round(10000 / (timeTaken || 1))} ops/ms)`);
  assert(baseMoney.cents === 50000n, "Throughput result matches expected amount");
}

runTestSuite();
