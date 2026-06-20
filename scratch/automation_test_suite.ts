import { AutomationConfig } from '../src/automation/AutomationConfig';
import { AutomationFacade } from '../src/automation/AutomationFacade';
import { AutomationEventBus } from '../src/automation/AutomationEventBus';
import { DomainEventBus } from '../src/domain/events/DomainEventBus';
import { IncomeAdded, ExpenseAdded, BudgetExceeded, SalaryUpdated, GoalFunded } from '../src/domain/events/FinancialEvents';
import { Money } from '../src/domain/finance/Money';
import { Currency } from '../src/domain/finance/Currency';
import { QueueJob } from '../src/automation/queue/Queue';
import { MemoryQueue } from '../src/automation/queue/MemoryQueue';
import { WorkerPool } from '../src/automation/WorkerPool';
import { AutomationEngine } from '../src/automation/AutomationEngine';
import { AutomationRuleRegistry } from '../src/automation/AutomationRuleRegistry';
import { AutomationState } from '../src/automation/AutomationState';
import { AutomationHistory } from '../src/automation/AutomationHistory';
import { AutomationMetrics } from '../src/automation/AutomationMetrics';
import { AutomationHealth } from '../src/automation/AutomationHealth';
import { ActionCenter } from '../src/automation/ActionCenter';
import { AnalyticsRepository } from '../src/analytics/AnalyticsRepository';
import { AnalyticsSnapshot } from '../src/analytics/AnalyticsSnapshot';
import { InAppNotificationChannel } from '../src/automation/channels/InAppNotificationChannel';
import { BudgetRules } from '../src/automation/rules/BudgetRules';
import { GoalRules } from '../src/automation/rules/GoalRules';
import { EmergencyRules } from '../src/automation/rules/EmergencyRules';
import { ReminderRules } from '../src/automation/rules/ReminderRules';
import { RecurringRules } from '../src/automation/rules/RecurringRules';

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

// 1. Mock AnalyticsRepository.loadSnapshot
let mockSnapshot: AnalyticsSnapshot;

AnalyticsRepository.loadSnapshot = async (userId: string): Promise<AnalyticsSnapshot> => {
  return mockSnapshot;
};

// 2. Mock Snapshot Generator Helper
function generateBaseMockSnapshot(userId: string): AnalyticsSnapshot {
  const currency = Currency.USD;
  return {
    profile: {
      email: "test@aurafinance.com",
      name: "Test User",
      avatar: "",
      monthlySalary: Money.fromDecimal(8000, currency),
      additionalIncome: Money.fromDecimal(0, currency),
      currentSavings: Money.fromDecimal(15000, currency),
      rent: Money.fromDecimal(2000, currency),
      fixedExpenses: Money.fromDecimal(1000, currency),
      monthlyBills: Money.fromDecimal(500, currency),
      emiLoans: Money.fromDecimal(500, currency),
      savingsGoalPercentage: 20,
      hasSetupProfile: true,
      salaryHistory: []
    },
    incomes: [],
    expenses: [],
    budgets: [
      { id: "b_food", category: "Food", limit: Money.fromDecimal(500, currency), spent: Money.fromDecimal(100, currency), color: "", alertThreshold: 90 }
    ],
    savingsGoals: [
      { id: "g_laptop", name: "Laptop", targetAmount: Money.fromDecimal(2000, currency), currentAmount: Money.fromDecimal(500, currency), category: "laptop", targetDate: new Date(), icon: "" }
    ],
    notifications: [],
    timelineHistory: [],
    cashFlowHistory: [],
    reminders: [
      { id: "rem_rent", title: "Rent payment", amount: 2000, due_date: "2026-06-25", is_paid: false }
    ]
  };
}

async function runTestSuite() {
  console.log("=========================================");
  console.log("    Automation Platform Test Suite       ");
  console.log("=========================================");

  testEnvironmentConfig();
  testQueueIdempotency();
  testRegistrySortingAndCycleDetection();
  await testEventDrivenQueueWakeupAndPool();
  await testBudgetRulesTrigger();
  await testGoalRulesTrigger();
  await testEmergencyFundCheck();
  await testBillRemindersRule();
  await testSalaryAllocationRule();
  testHealthAndSummaryGeneration();
  await testWorkerFailuresAndDLQ();

  console.log("\n=========================================");
  console.log(`Verification Complete: Passed: ${passedTests}, Failed: ${failedTests}`);
  console.log("=========================================");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

function testEnvironmentConfig() {
  console.log("\nTesting: Environment Profile configuration...");
  
  AutomationConfig.setProfile('testing');
  assert(AutomationConfig.profileName === 'testing', "Profile should be updated to testing");
  assert(AutomationConfig.active.workerCount === 2, "Testing profile contains 2 workers");
  assert(AutomationConfig.active.cooldownDurationDefaultMs === 50, "Testing cooldown should be 50ms");
}

function testQueueIdempotency() {
  console.log("Testing: Queue Deduplication & Concurrency...");
  
  const queue = new MemoryQueue();
  const event = new ExpenseAdded("user_123", "exp_1", Money.fromDecimal(50), "Food");

  queue.enqueue(event, 3);
  queue.enqueue(event, 3); // duplicate enqueue

  assert(queue.getMetrics().totalEnqueued === 1, "Duplicate enqueues with identical eventId must be ignored");
}

function testRegistrySortingAndCycleDetection() {
  console.log("Testing: Rule Registry & Dependency Resolution...");

  const registry = new AutomationRuleRegistry();

  const ruleA = {
    id: "rule_a",
    name: "Rule A",
    priority: "MEDIUM" as const,
    cooldownDuration: 0,
    dependencies: ["rule_b"],
    shouldRun: () => true,
    evaluate: async () => ({} as any)
  };

  const ruleB = {
    id: "rule_b",
    name: "Rule B",
    priority: "HIGH" as const,
    cooldownDuration: 0,
    dependencies: [],
    shouldRun: () => true,
    evaluate: async () => ({} as any)
  };

  registry.register(ruleA);
  registry.register(ruleB);

  const sorted = registry.getSortedRules();
  assert(sorted[0].id === "rule_b", "Rule B (no dependencies) should execute before dependent Rule A");
  assert(sorted[1].id === "rule_a", "Rule A executes after Rule B");

  // Verify duplicate registration error
  try {
    registry.register(ruleA);
    assert(false, "Should throw error on duplicate registration");
  } catch (err: any) {
    assert(err.message.includes("Duplicate rule registration"), "Registry catches duplicate registers");
  }

  // Cycle detection
  const cycleRegistry = new AutomationRuleRegistry();
  const cyclic1 = {
    id: "cy_1",
    name: "Cyclic 1",
    priority: "LOW" as const,
    cooldownDuration: 0,
    dependencies: ["cy_2"],
    shouldRun: () => true,
    evaluate: async () => ({} as any)
  };
  const cyclic2 = {
    id: "cy_2",
    name: "Cyclic 2",
    priority: "LOW" as const,
    cooldownDuration: 0,
    dependencies: ["cy_1"],
    shouldRun: () => true,
    evaluate: async () => ({} as any)
  };
  cycleRegistry.register(cyclic1);
  cycleRegistry.register(cyclic2);

  try {
    cycleRegistry.getSortedRules();
    assert(false, "Should throw error on cyclic dependencies");
  } catch (err: any) {
    assert(err.message.includes("Circular dependency detected"), "Registry cycle check succeeds");
  }
}

async function testEventDrivenQueueWakeupAndPool() {
  console.log("Testing: Event-driven Queue wake-up & WorkerPool distribution...");

  const queue = new MemoryQueue();
  let executedCount = 0;
  let finishedResolver: () => void = () => {};
  const finishedPromise = new Promise<void>((resolve) => {
    finishedResolver = resolve;
  });

  const pool = new WorkerPool(queue, async (job) => {
    executedCount++;
    finishedResolver();
  });

  pool.start();

  const event = new SalaryUpdated("user_789", Money.fromDecimal(5000), Money.fromDecimal(6000));
  await queue.enqueue(event, 3);

  // Wait for worker pool execution asynchronously
  await finishedPromise;
  
  assert(executedCount === 1, "WorkerPool automatically dequeued and processed job without timer polling loop");
  pool.stop();
}

async function testBudgetRulesTrigger() {
  console.log("Testing: BudgetRules calculations & Cooldown Suppression...");

  const userId = "u_budget_test";
  mockSnapshot = generateBaseMockSnapshot(userId);
  
  // Set budget utilization to 95% (spent 475 / limit 500)
  (mockSnapshot.budgets[0] as any).spent = Money.fromDecimal(475, Currency.USD);

  const budgetRule = new BudgetRules();
  const context = {
    userId,
    event: new ExpenseAdded(userId, "exp_b", Money.fromDecimal(20), "Food"),
    snapshot: mockSnapshot,
    timezone: "UTC",
    correlationId: "corr_b"
  };

  assert(budgetRule.shouldRun(context), "BudgetRule runs on ExpenseAdded");

  const result1 = await budgetRule.evaluate(context);
  assert(result1.success === true, "Budget warning triggered");
  assert(result1.actions.length === 1, "One notification action generated");
  assert(result1.actions[0].priority === "HIGH", "Threshold alert has HIGH priority");

  // Test critical limit breach (spent 520 / limit 500 -> 104%)
  (mockSnapshot.budgets[0] as any).spent = Money.fromDecimal(520, Currency.USD);
  const result2 = await budgetRule.evaluate(context);
  assert(result2.actions[0].priority === "CRITICAL", "Overlimit alert has CRITICAL priority");
}

async function testGoalRulesTrigger() {
  console.log("Testing: GoalRules Achievements & Milestones...");

  const userId = "u_goal_test";
  mockSnapshot = generateBaseMockSnapshot(userId);
  
  const goalRule = new GoalRules();
  const context = {
    userId,
    event: new GoalFunded(userId, "g_laptop", Money.fromDecimal(500), Money.fromDecimal(1000)),
    snapshot: mockSnapshot,
    timezone: "UTC",
    correlationId: "corr_g"
  };

  assert(goalRule.shouldRun(context), "GoalRule runs on GoalFunded");

  // Milestone check: current 500 / target 2000 is 25% (No milestone)
  const res1 = await goalRule.evaluate(context);
  assert(res1.actions.length === 0, "No milestone triggered at 25% progress");

  // Milestone check: set to 1000 / 2000 (50%)
  (mockSnapshot.savingsGoals[0] as any).currentAmount = Money.fromDecimal(1000, Currency.USD);
  const res2 = await goalRule.evaluate(context);
  assert(res2.actions.length === 1, "Milestone triggered at 50% progress");
  assert(res2.actions[0].title.includes("Savings Milestone Reached"), "Correct milestone alert");

  // Milestone check: set to 2000 / 2000 (100%)
  (mockSnapshot.savingsGoals[0] as any).currentAmount = Money.fromDecimal(2000, Currency.USD);
  const res3 = await goalRule.evaluate(context);
  assert(res3.actions.length === 1, "Completed milestone triggered at 100%");
  assert(res3.actions[0].title.includes("Goal Completed"), "Goal Completion celebration alert triggered");
}

async function testEmergencyFundCheck() {
  console.log("Testing: EmergencyReserve liquidity checks...");

  const userId = "u_emergency_test";
  mockSnapshot = generateBaseMockSnapshot(userId);

  // monthly commitments: rent 2000 + fixed 1000 + bills 500 + emi 500 = 4000
  // target emergency fund (3 months): 12,000
  // currentSavings: 15,000 -> stable
  const emergencyRule = new EmergencyRules();
  const context = {
    userId,
    event: new SalaryUpdated(userId, Money.fromDecimal(8000), Money.fromDecimal(8000)),
    snapshot: mockSnapshot,
    timezone: "UTC",
    correlationId: "corr_e"
  };

  const res1 = await emergencyRule.evaluate(context);
  assert(res1.success === false, "Emergency fund is safe, no deficit notifications");

  // Set current savings to 9000 (Deficit of 3000)
  (mockSnapshot.profile as any).currentSavings = Money.fromDecimal(9000, Currency.USD);
  const res2 = await emergencyRule.evaluate(context);
  assert(res2.success === true, "Low emergency fund warning triggered");
  assert(res2.actions[0].priority === "CRITICAL", "Emergency reserve warning has CRITICAL priority");
  assert(res2.actions[0].message.includes("Deficit: $3,000.00"), "Deficit value computed correctly");
}

async function testBillRemindersRule() {
  console.log("Testing: BillReminder payments near due dates...");

  const userId = "u_bill_test";
  mockSnapshot = generateBaseMockSnapshot(userId);

  const reminderRule = new ReminderRules();
  const context = {
    userId,
    event: { eventType: "SchedulerTick", userId, eventId: "tick", correlationId: "c", version: "1.0", timestamp: new Date(), source: "s", payload: { userId }, id: "tick", occurredAt: new Date(), eventName: "SchedulerTick" },
    snapshot: mockSnapshot,
    timezone: "UTC",
    correlationId: "corr_r"
  };

  // reminder date is 2026-06-25. Let's mock today's date context inside the rule:
  // In ReminderRules, today is new Date().
  // Let's set the bill due_date to 3 days in the future relative to new Date():
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 3);
  const y = targetDate.getFullYear();
  const m = targetDate.getMonth() + 1;
  const d = targetDate.getDate();
  const formattedDueDate = `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;

  mockSnapshot.reminders[0].due_date = formattedDueDate;

  const res1 = await reminderRule.evaluate(context);
  assert(res1.success === true, "Reminder warning triggered");
  assert(res1.actions[0].priority === "MEDIUM", "Reminder due in 3 days has MEDIUM priority");

  // Set due date to today
  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${today.getMonth() + 1 < 10 ? '0' + (today.getMonth() + 1) : today.getMonth() + 1}-${today.getDate() < 10 ? '0' + today.getDate() : today.getDate()}`;
  mockSnapshot.reminders[0].due_date = formattedToday;

  const res2 = await reminderRule.evaluate(context);
  assert(res2.actions[0].priority === "HIGH", "Reminder due today has HIGH priority");
}

async function testSalaryAllocationRule() {
  console.log("Testing: Salary receipt savings recommendation triggers...");

  const userId = "u_salary_test";
  mockSnapshot = generateBaseMockSnapshot(userId);

  const recurringRule = new RecurringRules();
  const context = {
    userId,
    event: new IncomeAdded(userId, "inc_sal", Money.fromDecimal(8000), "Salary"),
    snapshot: mockSnapshot,
    timezone: "UTC",
    correlationId: "corr_s"
  };

  const res1 = await recurringRule.evaluate(context);
  assert(res1.success === true, "Salary alert triggered");
  assert(res1.actions[0].category === "salary", "Salary notification action categorized under 'salary'");
  assert(res1.actions[0].message.includes("We suggest allocating $1,600.00"), "20% allocation correctly computed ($1,600)");
}

function testHealthAndSummaryGeneration() {
  console.log("Testing: Platform Health monitoring & Summary payloads...");

  const health = AutomationHealth.checkHealth(10, 0, 1, 0);
  assert(health.platformScore === 100, "100 platform health score with zero failures and low queue sizes");

  const healthDegraded = AutomationHealth.checkHealth(1500, 2, 1, 5);
  assert(healthDegraded.platformScore < 80, "Degraded platform health score due to dead letters and queue size");
}

async function testWorkerFailuresAndDLQ() {
  console.log("Testing: Job execution retry logic & DLQ routing...");

  const queue = new MemoryQueue();
  let failureCount = 0;
  let finishedResolver: () => void = () => {};
  const finishedPromise = new Promise<void>((resolve) => {
    finishedResolver = resolve;
  });

  const pool = new WorkerPool(queue, async (job) => {
    failureCount++;
    throw new Error("Transient execution error simulated");
  });

  pool.start();

  const event = new IncomeAdded("user_retry_1", "inc_retry", Money.fromDecimal(100), "Other");
  await queue.enqueue(event, 3);

  // We set testing profile in testEnvironmentConfig, which allows up to 3 retries
  // Wait a short delay to let worker finish retry loops
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  const dlq = await queue.getDeadLetterQueue();
  assert(dlq.length === 1, "Job was successfully routed to Dead-Letter Queue (DLQ) after retry limit reached");
  assert(dlq[0].event.eventId === event.eventId, "DLQ stores correct job event reference");

  pool.stop();
}

runTestSuite();
