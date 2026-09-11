/**
 * Test suite for FinancialConsistencyVerifier (§AI-2.3)
 */

import { FinancialConsistencyVerifier } from '../src/ai/verification/FinancialConsistencyVerifier';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('===========================================================');
console.log('   AURA FINANCE — FINANCIAL CONSISTENCY VERIFIER SUITE    ');
console.log('===========================================================');

const baseContext = {
  kpis: {
    totalIncome: 5000,
    totalExpense: 3200,
    netSavings: 1800,
    currentSavings: 15000,
    savingsRate: 36,
    runwayMonths: 4.68,
    overallHealthScore: 82
  },
  budgets: [
    { category: 'Food', limit: 800, spent: 600, currency: 'USD' },
    { category: 'Housing', limit: 1500, spent: 1200, currency: 'USD' },
    { category: 'Entertainment', limit: 300, spent: 450, currency: 'USD' },
    { category: 'Utilities', limit: 400, spent: 350, currency: 'USD' }
  ],
  savings: [
    { goalName: 'Emergency Fund', targetAmount: 10000, currentAmount: 4000, currency: 'USD' },
    { goalName: 'Vacation', targetAmount: 2000, currentAmount: 2000, currency: 'USD' }
  ],
  trends: {
    priorSpending: 3600,
    currentSpending: 3200,
    direction: 'decrease'
  }
};

const baseToolOutputs = {
  analytics: { kpis: baseContext.kpis },
  budget: { budgets: baseContext.budgets },
  goal: { savings: baseContext.savings }
};

// Scenario 1: Valid category spending
{
  const res = FinancialConsistencyVerifier.verify(
    "How much did I spend on food?",
    "You spent $600 on Food this month, staying well within your limits.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 1] Valid category spending accepted");
  assert(res.discrepancies.length === 0, "[Scenario 1] Zero discrepancies for correct spending");
}

// Scenario 2: Valid category budget limit
{
  const res = FinancialConsistencyVerifier.verify(
    "What is my food budget limit?",
    "Your Food budget limit is $800.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 2] Valid category budget limit accepted");
}

// Scenario 3: Valid category within budget claim
{
  const res = FinancialConsistencyVerifier.verify(
    "Is food under budget?",
    "Your Food spending is currently within budget.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 3] Valid within budget claim accepted");
}

// Scenario 4: Valid category over budget claim
{
  const res = FinancialConsistencyVerifier.verify(
    "Is entertainment over budget?",
    "Your Entertainment category is currently over budget.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 4] Valid over budget claim accepted");
}

// Scenario 5: Valid total income
{
  const res = FinancialConsistencyVerifier.verify(
    "What was my income?",
    "Your total income was $5,000 this month.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 5] Valid total income accepted");
}

// Scenario 6: Valid total expenses
{
  const res = FinancialConsistencyVerifier.verify(
    "What were my expenses?",
    "You spent a total of $3,200 across all categories.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 6] Valid total expenses accepted");
}

// Scenario 7: Valid positive cash flow surplus
{
  const res = FinancialConsistencyVerifier.verify(
    "Did I save money?",
    "You generated a positive cash flow with a net savings of $1,800.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 7] Valid positive cash flow surplus accepted");
}

// Scenario 8: Valid goal saved amount
{
  const res = FinancialConsistencyVerifier.verify(
    "How is my emergency fund?",
    "You have saved $4,000 towards your Emergency Fund.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 8] Valid goal saved amount accepted");
}

// Scenario 9: Valid goal target
{
  const res = FinancialConsistencyVerifier.verify(
    "What is my emergency fund target?",
    "Your Emergency Fund target is $10,000.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 9] Valid goal target accepted");
}

// Scenario 10: Valid historical trend
{
  const res = FinancialConsistencyVerifier.verify(
    "Did my spending increase or decrease?",
    "Your spending decreased compared to last month.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 10] Valid spending decreased trend accepted");
}

// Scenario 11: Invalid category spending (Fabricated value)
{
  const res = FinancialConsistencyVerifier.verify(
    "How much did I spend on food?",
    "You spent $950 on Food this month.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 11] Fabricated category spending rejected");
  assert(res.discrepancies.some(d => d.claimType === 'category_spent_mismatch'), "[Scenario 11] Discrepancy type category_spent_mismatch");
}

// Scenario 12: Invalid category limit (Fabricated value)
{
  const res = FinancialConsistencyVerifier.verify(
    "What is my housing budget?",
    "Your Housing budget limit is $2,500.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 12] Fabricated category limit rejected");
  assert(res.discrepancies.some(d => d.claimType === 'category_limit_mismatch'), "[Scenario 12] Discrepancy type category_limit_mismatch");
}

// Scenario 13: Invalid Category Attribute Inversion (Limit claimed as Spent)
{
  const res = FinancialConsistencyVerifier.verify(
    "How much did I spend on dining?",
    "You spent $800 on Food this month.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 13] Limit claimed as spending rejected");
  assert(res.discrepancies.some(d => d.claimType === 'category_attribute_inversion'), "[Scenario 13] Flagged category_attribute_inversion");
}

// Scenario 14: Invalid Category Attribute Inversion (Spent claimed as Limit)
{
  const res = FinancialConsistencyVerifier.verify(
    "What is my food budget limit?",
    "Your Food budget limit is $600.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 14] Spent claimed as budget limit rejected");
  assert(res.discrepancies.some(d => d.claimType === 'category_attribute_inversion'), "[Scenario 14] Flagged category_attribute_inversion");
}

// Scenario 15: Invalid Category Cross-Attribution (Housing spent claimed as Food)
{
  const res = FinancialConsistencyVerifier.verify(
    "How much did I spend on groceries?",
    "You spent $1,200 on Food this month.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 15] Housing spent attributed to Food rejected");
  assert(res.discrepancies.some(d => d.claimType === 'category_cross_attribution'), "[Scenario 15] Flagged category_cross_attribution");
}

// Scenario 16: Invalid Budget Direction Inversion (Over budget claimed when within)
{
  const res = FinancialConsistencyVerifier.verify(
    "Is food over budget?",
    "Your Food spending is over budget.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 16] False over budget claim rejected");
  assert(res.discrepancies.some(d => d.claimType === 'budget_status_inversion'), "[Scenario 16] Flagged budget_status_inversion");
}

// Scenario 17: Invalid Budget Direction Inversion (Within budget claimed when over)
{
  const res = FinancialConsistencyVerifier.verify(
    "Is entertainment within budget?",
    "Your Entertainment category is within budget.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 17] False within budget claim rejected");
  assert(res.discrepancies.some(d => d.claimType === 'budget_status_inversion'), "[Scenario 17] Flagged budget_status_inversion");
}

// Scenario 18: Invalid KPI Conflation (Expenses claimed as Income)
{
  const res = FinancialConsistencyVerifier.verify(
    "What is my income?",
    "Your total income was $3,200 this month.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 18] Conflating income with expenses rejected");
  assert(res.discrepancies.some(d => d.claimType === 'kpi_income_mismatch'), "[Scenario 18] Flagged kpi_income_mismatch");
}

// Scenario 19: Invalid Cash Flow Status Inversion (Deficit claimed when surplus)
{
  const res = FinancialConsistencyVerifier.verify(
    "Am I in a deficit?",
    "You are running a financial deficit with negative savings this month.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 19] False deficit claim rejected");
  assert(res.discrepancies.some(d => d.claimType === 'cashflow_status_inversion'), "[Scenario 19] Flagged cashflow_status_inversion");
}

// Scenario 20: Invalid Goal Completion Inversion
{
  const res = FinancialConsistencyVerifier.verify(
    "Is my emergency fund done?",
    "Your Emergency Fund goal is completed.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 20] Premature goal completion claim rejected");
  assert(res.discrepancies.some(d => d.claimType === 'goal_status_inversion'), "[Scenario 20] Flagged goal_status_inversion");
}

// Scenario 21: Invalid Goal Attribute Inversion (Target claimed as saved)
{
  const res = FinancialConsistencyVerifier.verify(
    "How much have I saved for emergency fund?",
    "You have saved $10,000 for your Emergency Fund.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 21] Target claimed as saved rejected");
  assert(res.discrepancies.some(d => d.claimType === 'goal_amount_mismatch'), "[Scenario 21] Flagged goal_amount_mismatch");
}

// Scenario 22: Adversarial MUST-FAIL: Unrelated Metric Collision (Total Savings $15,000 claimed as Food spending)
{
  const res = FinancialConsistencyVerifier.verify(
    "How much did I spend on food?",
    "You spent $15,000 on Food this month.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 22] MUST-FAIL: Unrelated metric collision rejected");
  assert(res.discrepancies.some(d => d.claimType === 'unrelated_metric_collision'), "[Scenario 22] Flagged unrelated_metric_collision");
}

// Scenario 23: Adversarial MUST-FAIL: Compound Sentence (One valid, one fabricated)
{
  const res = FinancialConsistencyVerifier.verify(
    "Summarize my food and housing.",
    "You spent $600 on Food, but you spent $2,400 on Housing.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 23] MUST-FAIL: Compound sentence caught invalid claim");
  assert(res.discrepancies.length === 1, "[Scenario 23] Exactly 1 discrepancy flagged");
  assert(res.discrepancies[0].entityName === 'Housing', "[Scenario 23] Only Housing was flagged, Food was accepted");
}

// Scenario 24: False-Positive Protection: Educational & Guideline ranges
{
  const res = FinancialConsistencyVerifier.verify(
    "What is the 50/30/20 rule?",
    "Under the 50/30/20 rule of thumb, you could save between $150 and $250 while keeping 3 to 6 months of expenses.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 24] Educational guidelines and ranges protected from false positives");
  assert(res.warnings.length === 0, "[Scenario 24] Zero warnings for educational advice");
}

// Scenario 25: False-Positive Protection: Non-financial counts & calendar years
{
  const res = FinancialConsistencyVerifier.verify(
    "How many transactions in 2026?",
    "You completed 5 transactions across 2 accounts in 2026.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 25] Non-financial counts and calendar years protected");
}

// Scenario 26: Deduplication with AI-2.1 and AI-2.2 existing warnings
{
  const existingWarns = ["⚠️ Verification Note: $950 spent on Food could not be verified against authoritative records."];
  const res = FinancialConsistencyVerifier.verify(
    "How much did I spend on food?",
    "You spent $950 on Food this month.",
    baseContext,
    baseToolOutputs,
    { level: 'Medium', score: 0.45 },
    { existingWarnings: existingWarns }
  );
  assert(res.isValid, "[Scenario 26] Already warned discrepancy deduplicated");
  assert(res.warnings.length === 0, "[Scenario 26] Zero duplicate warnings emitted");
  assert(res.adjustedConfidence?.score === 0.45, "[Scenario 26] No duplicate confidence penalty applied");
}

// Scenario 27: Performance Benchmark (Zero network calls, fast execution)
{
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) {
    FinancialConsistencyVerifier.verify(
      "How much did I spend on food?",
      "You spent $600 on Food this month.",
      baseContext,
      baseToolOutputs
    );
  }
  const duration = performance.now() - t0;
  assert(duration < 200, `[Scenario 27] 100 verifications executed in ${duration.toFixed(2)}ms (< 200ms)`);
}

console.log('===========================================================');
console.log(`Financial Consistency Verification: Passed: ${passed}, Failed: ${failed}`);
console.log('===========================================================');

if (failed > 0) {
  process.exit(1);
}
