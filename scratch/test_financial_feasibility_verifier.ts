/**
 * Test suite for FinancialFeasibilityVerifier (§AI-2.4)
 */

import { FinancialFeasibilityVerifier } from '../src/ai/verification/FinancialFeasibilityVerifier';

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
console.log('   AURA FINANCE — FINANCIAL FEASIBILITY VERIFIER SUITE    ');
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
    { goalName: 'Emergency Fund', targetAmount: 10000, currentAmount: 4000, currency: 'USD' }
  ]
};

const baseToolOutputs = {
  analytics: { kpis: baseContext.kpis },
  budget: { budgets: baseContext.budgets }
};

// Scenario 1: Valid affordable purchase (leaves runway >= 3.0)
{
  // $15,000 savings - $500 = $14,500. $14,500 / $3,200 = 4.53 months (> 3.0)
  const res = FinancialFeasibilityVerifier.verify(
    "Can I buy a $500 sofa?",
    "Yes, you can afford to buy a $500 sofa right now.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 1] Valid affordable purchase accepted");
  assert(res.discrepancies.length === 0, "[Scenario 1] Zero discrepancies for valid affordable purchase");
}

// Scenario 2: Valid unaffordable purchase recognition
{
  // User has $2,000 savings, $3,200 expenses, item $1,500 -> leaves $500 (runway 0.16 months)
  const tightContext = {
    ...baseContext,
    kpis: { ...baseContext.kpis, currentSavings: 2000, runwayMonths: 0.625 }
  };
  const res = FinancialFeasibilityVerifier.verify(
    "Can I afford a $1,500 laptop?",
    "Buying a $1,500 laptop is not recommended right now as your remaining runway would drop below safe levels.",
    tightContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 2] Correct advice that item is not affordable accepted");
}

// Scenario 3: Valid recurring savings recommendation within surplus
{
  // Net surplus is $1,800. Recommending saving $300/mo is well within surplus.
  const res = FinancialFeasibilityVerifier.verify(
    "How can I save more?",
    "You can save an additional $300 per month towards your emergency fund.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 3] Feasible recurring savings recommendation accepted");
}

// Scenario 4: Valid category budget reduction
{
  // Food spending is $600. Cutting by $100 is feasible (< 100% of spending).
  const res = FinancialFeasibilityVerifier.verify(
    "How can I trim my food budget?",
    "You could reduce your Food spending by $100 by meal planning.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 4] Feasible budget reduction accepted");
}

// Scenario 5: Valid 1-year projection
{
  // 12 * $500 = $6,000
  const res = FinancialFeasibilityVerifier.verify(
    "How much will I save in a year?",
    "Saving $500 per month will give you $6,000 in a year.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 5] Correct 1-year savings projection accepted");
}

// Scenario 6: Insolvent purchase claim (Cost > Available Savings) - MUST FAIL
{
  // Savings is $15,000. Item is $20,000.
  const res = FinancialFeasibilityVerifier.verify(
    "Can I afford a $20,000 car?",
    "Yes, you can easily afford the $20,000 car from your savings right now.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 6] Insolvent purchase claim rejected");
  assert(res.discrepancies.some(d => d.claimType === 'unaffordable_purchase_claim'), "[Scenario 6] Flagged unaffordable_purchase_claim");
}

// Scenario 7: Runway depletion purchase claim (Post-runway < 3.0 months) - MUST FAIL
{
  // Savings: $15,000, Expenses: $3,200. Purchase: $10,000.
  // Remaining savings: $5,000. Post-runway: $5,000 / $3,200 = 1.56 months (< 3.0 threshold).
  const res = FinancialFeasibilityVerifier.verify(
    "Can I buy a $10,000 watch?",
    "Yes, you can afford to buy a $10,000 watch right now.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 7] Runway depletion purchase rejected");
  assert(res.discrepancies.some(d => d.claimType === 'unaffordable_purchase_claim'), "[Scenario 7] Flagged runway depletion under 3.0 months");
}

// Scenario 8: False unaffordable claim (User has huge surplus and safe runway) - MUST FAIL
{
  // User has $15,000 savings, $3,200 expenses (4.68m runway). Item $100.
  const res = FinancialFeasibilityVerifier.verify(
    "Can I buy a $100 jacket?",
    "Buying a $100 jacket is unaffordable for you right now.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 8] False unaffordable claim rejected");
  assert(res.discrepancies.some(d => d.claimType === 'false_unaffordable_claim'), "[Scenario 8] Flagged false_unaffordable_claim");
}

// Scenario 9: Excessive recurring savings recommendation - MUST FAIL
{
  // Net surplus is $1,800. AI advises saving $2,500 per month.
  const res = FinancialFeasibilityVerifier.verify(
    "How much should I save?",
    "You should save an additional $2,500 per month.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 9] Excessive recurring savings recommendation rejected");
  assert(res.discrepancies.some(d => d.claimType === 'excessive_savings_recommendation'), "[Scenario 9] Flagged excessive_savings_recommendation");
}

// Scenario 10: Deficit investment recommendation - MUST FAIL
{
  // Context where user is running a net monthly deficit: Income $3,000, Expenses $3,500 (Net -$500)
  const deficitContext = {
    ...baseContext,
    kpis: {
      ...baseContext.kpis,
      totalIncome: 3000,
      totalExpense: 3500,
      netSavings: -500
    }
  };
  const res = FinancialFeasibilityVerifier.verify(
    "Should I invest?",
    "You should contribute $300 monthly to your index funds.",
    deficitContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 10] Savings/investment advice while in deficit rejected");
  assert(res.discrepancies.some(d => d.claimType === 'deficit_investment_recommendation'), "[Scenario 10] Flagged deficit_investment_recommendation");
}

// Scenario 11: Excessive category budget reduction - MUST FAIL
{
  // Utilities spending is $350. Recommending cutting by $500 (> 100% of spending).
  const res = FinancialFeasibilityVerifier.verify(
    "How can I cut bills?",
    "Reduce your Utilities spending by $500 each month.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 11] Budget reduction exceeding 100% of spending rejected");
  assert(res.discrepancies.some(d => d.claimType === 'excessive_budget_reduction_claim'), "[Scenario 11] Flagged excessive_budget_reduction_claim");
}

// Scenario 12: Cadence/Annualization confusion (Income) - MUST FAIL
{
  // Monthly income is $5,000. AI claims annual income is $5,000.
  const res = FinancialFeasibilityVerifier.verify(
    "What is my annual income?",
    "Your annual income is $5,000.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 12] Monthly income claimed as annual income rejected");
  assert(res.discrepancies.some(d => d.claimType === 'cadence_annualization_inversion'), "[Scenario 12] Flagged cadence_annualization_inversion");
}

// Scenario 13: Cadence/Annualization confusion (Expenses) - MUST FAIL
{
  // Monthly expense is $3,200. AI claims annual expenses are $3,200.
  const res = FinancialFeasibilityVerifier.verify(
    "What are my annual expenses?",
    "Your annual expenses are $3,200.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 13] Monthly expenses claimed as annual expenses rejected");
  assert(res.discrepancies.some(d => d.claimType === 'cadence_annualization_inversion'), "[Scenario 13] Flagged cadence_annualization_inversion");
}

// Scenario 14: Infeasible 1-year projection - MUST FAIL
{
  // 12 * $500 = $6,000. Stated: $12,000.
  const res = FinancialFeasibilityVerifier.verify(
    "How much will I save?",
    "Saving $500 per month will give you $12,000 in a year.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 14] Infeasible 1-year savings projection rejected");
  assert(res.discrepancies.some(d => d.claimType === 'infeasible_savings_projection'), "[Scenario 14] Flagged infeasible_savings_projection");
}

// Scenario 15: Insolvent debt payoff from savings - MUST FAIL
{
  // Savings: $15,000. Debt: $25,000.
  const res = FinancialFeasibilityVerifier.verify(
    "How can I pay my loan?",
    "Pay off your $25,000 debt immediately from savings.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 15] Insolvent debt payoff recommendation rejected");
  assert(res.discrepancies.some(d => d.claimType === 'insolvent_debt_payoff_claim'), "[Scenario 15] Flagged insolvent_debt_payoff_claim");
}

// Scenario 16: Educational 50/30/20 rule protection
{
  const res = FinancialFeasibilityVerifier.verify(
    "What is the 50/30/20 rule?",
    "Under the 50/30/20 rule of thumb, save 20% of your income.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 16] Educational 50/30/20 rule protected");
}

// Scenario 17: Benchmark emergency runway range protection
{
  const res = FinancialFeasibilityVerifier.verify(
    "How big should an emergency fund be?",
    "Financial advisors recommend keeping 3 to 6 months of expenses in an emergency fund.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 17] Benchmark guideline protected");
}

// Scenario 18: Conditional hypothetical scenario protection
{
  const res = FinancialFeasibilityVerifier.verify(
    "What if I get a raise?",
    "If your income doubles, you could easily afford $5,000 in extra spending.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 18] Conditional hypothetical scenario protected");
}

// Scenario 19: Financing / installment plan protection
{
  const res = FinancialFeasibilityVerifier.verify(
    "Can I afford this?",
    "If financed over 24 months on an installment plan of $150 a month, this purchase is manageable.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 19] Installment plan advice protected");
}

// Scenario 20: Advisory range protection
{
  const res = FinancialFeasibilityVerifier.verify(
    "How much should I set aside?",
    "Aim for saving between $150 and $250 each month if possible.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 20] Advisory range protected");
}

// Scenario 21: Calendar dates and counts protection
{
  const res = FinancialFeasibilityVerifier.verify(
    "Did I spend in 2026?",
    "You completed 4 transactions in 2026 across 2 accounts.",
    baseContext,
    baseToolOutputs
  );
  assert(res.isValid, "[Scenario 21] Calendar dates and non-financial counts protected");
}

// Scenario 22: Compound sentence with one valid and one excessive recommendation
{
  // Food reduction $100 is valid. Recurring savings $3,000/mo is excessive (surplus $1,800).
  const res = FinancialFeasibilityVerifier.verify(
    "Give me savings advice.",
    "You could reduce your Food spending by $100, and save an additional $3,000 per month.",
    baseContext,
    baseToolOutputs
  );
  assert(!res.isValid, "[Scenario 22] Compound sentence detected excessive recommendation");
  assert(res.discrepancies.length === 1, "[Scenario 22] Only excessive savings was flagged, Food reduction was accepted");
}

// Scenario 23: Deduplication with existing warnings
{
  const existingWarns = ["⚠️ Verification Note: $2,500 per month exceeds monthly limits."];
  const res = FinancialFeasibilityVerifier.verify(
    "How much can I save?",
    "You should save an additional $2,500 per month.",
    baseContext,
    baseToolOutputs,
    { level: 'Medium', score: 0.50 },
    { existingWarnings: existingWarns }
  );
  assert(res.isValid, "[Scenario 23] Already warned discrepancy deduplicated");
  assert(res.warnings.length === 0, "[Scenario 23] Zero duplicate warnings emitted");
  assert(res.adjustedConfidence?.score === 0.50, "[Scenario 23] Zero double-penalty applied");
}

// Scenario 24: Performance benchmark (Zero network calls, sub-millisecond execution)
{
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) {
    FinancialFeasibilityVerifier.verify(
      "Can I afford $500?",
      "Yes, you can afford to buy a $500 sofa right now.",
      baseContext,
      baseToolOutputs
    );
  }
  const duration = performance.now() - t0;
  assert(duration < 200, `[Scenario 24] 100 verifications executed in ${duration.toFixed(2)}ms (< 200ms)`);
}

console.log('===========================================================');
console.log(`Financial Feasibility Verification: Passed: ${passed}, Failed: ${failed}`);
console.log('===========================================================');

if (failed > 0) {
  process.exit(1);
}
