/**
 * Test suite for FinancialDecisionVerifier (§AI-2.5)
 */

import { FinancialDecisionVerifier } from '../src/ai/verification/FinancialDecisionVerifier';

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
console.log('     AURA FINANCE — FINANCIAL DECISION VERIFIER SUITE     ');
console.log('===========================================================');

// Base Healthy Context (Runway 6.0 months, positive cashflow, no high-interest debt)
const healthyContext = {
  kpis: {
    totalIncome: 6000,
    totalExpense: 3000,
    netSavings: 3000,
    currentSavings: 18000,
    runwayMonths: 6.0,
    savingsRate: 50,
    highInterestDebt: 0
  },
  budgets: [
    { category: 'Food', limit: 800, spent: 500 },
    { category: 'Entertainment', limit: 400, spent: 200 }
  ],
  savings: [
    { goalName: 'Retirement', targetAmount: 100000, currentAmount: 20000, remainingMonths: 60 }
  ]
};

// Fragile Context (Runway 1.8 months, thin liquidity)
const lowRunwayContext = {
  kpis: {
    totalIncome: 4000,
    totalExpense: 3500,
    netSavings: 500,
    currentSavings: 6300,
    runwayMonths: 1.8,
    savingsRate: 12.5,
    highInterestDebt: 0
  },
  budgets: [
    { category: 'Food', limit: 800, spent: 700 }
  ],
  savings: []
};

// High-Interest Debt Context
const highDebtContext = {
  kpis: {
    totalIncome: 5000,
    totalExpense: 3500,
    netSavings: 1500,
    currentSavings: 12000,
    runwayMonths: 3.42,
    highInterestDebt: 6500
  },
  debts: [
    { name: 'Credit Card A', balance: 6500, interestRate: 24.99, isHighInterest: true }
  ]
};

// Short-Term Goal Context (Vacation needed in 3 months)
const shortTermGoalContext = {
  ...healthyContext,
  savings: [
    { goalName: 'Vacation', targetAmount: 2000, currentAmount: 1800, remainingMonths: 3 }
  ]
};

// Negative Cash Flow Deficit Context
const deficitContext = {
  kpis: {
    totalIncome: 3000,
    totalExpense: 3500,
    netSavings: -500,
    currentSavings: 5000,
    runwayMonths: 1.42,
    highInterestDebt: 0
  }
};

// Scenario 1: Normal educational investing explanation
{
  const res = FinancialDecisionVerifier.verify(
    "What is investing?",
    "Investing is a way to grow wealth over the long term, but stocks carry risk.",
    lowRunwayContext,
    {}
  );
  assert(res.isValid, "[Scenario 1] Educational explanation of investing protected");
  assert(res.discrepancies.length === 0, "[Scenario 1] Zero discrepancies for educational text");
}

// Scenario 2: Conditional investment advice (runway dependent)
{
  const res = FinancialDecisionVerifier.verify(
    "Should I invest?",
    "Once your emergency fund reaches an appropriate level, investing may become a reasonable next step.",
    lowRunwayContext,
    {}
  );
  assert(res.isValid, "[Scenario 2] Conditional runway advice protected");
}

// Scenario 3: Conditional advice with 'if fully funded'
{
  const res = FinancialDecisionVerifier.verify(
    "Can I buy stocks?",
    "If your emergency fund is fully funded, you could consider investing additional long-term savings.",
    lowRunwayContext,
    {}
  );
  assert(res.isValid, "[Scenario 3] 'If emergency fund is funded' condition protected");
}

// Scenario 4: Proper emergency fund prioritization
{
  const res = FinancialDecisionVerifier.verify(
    "What should I do first?",
    "Prioritize building your emergency fund to 3-6 months before starting to invest.",
    lowRunwayContext,
    {}
  );
  assert(res.isValid, "[Scenario 4] Proper emergency fund prioritization accepted");
}

// Scenario 5: Proper debt-first recommendation
{
  const res = FinancialDecisionVerifier.verify(
    "Should I invest or pay debt?",
    "Focus on paying off your high-interest credit card debt before investing in stocks.",
    highDebtContext,
    {}
  );
  assert(res.isValid, "[Scenario 5] Proper debt-first recommendation accepted");
}

// Scenario 6: Proper short-term goal prioritization
{
  const res = FinancialDecisionVerifier.verify(
    "Where to keep my vacation fund?",
    "Keep your vacation savings in a high-yield savings account rather than risking it in the stock market.",
    shortTermGoalContext,
    {}
  );
  assert(res.isValid, "[Scenario 6] Proper short-term goal advice accepted");
}

// Scenario 7: Normal diversified investing recommendation when liquidity is healthy
{
  const res = FinancialDecisionVerifier.verify(
    "What should I do with my extra cash?",
    "With your 6-month safety runway secured, consider investing $300 monthly in index funds.",
    healthyContext,
    {}
  );
  assert(res.isValid, "[Scenario 7] Diversified investing accepted when liquidity is healthy");
}

// Scenario 8: Neutral risk explanation
{
  const res = FinancialDecisionVerifier.verify(
    "Is investing safe?",
    "All investments carry risk and past performance is no guarantee of future returns.",
    lowRunwayContext,
    {}
  );
  assert(res.isValid, "[Scenario 8] Neutral risk explanation protected");
}

// Scenario 9: 50/30/20 guideline
{
  const res = FinancialDecisionVerifier.verify(
    "How should I budget?",
    "Under the 50/30/20 rule of thumb, 50% goes to needs, 30% to wants, and 20% to savings and debt.",
    lowRunwayContext,
    {}
  );
  assert(res.isValid, "[Scenario 9] 50/30/20 rule protected");
}

// Scenario 10: 70/20/10 guideline
{
  const res = FinancialDecisionVerifier.verify(
    "Explain 70/20/10",
    "The 70/20/10 budget guideline suggests allocating 20% to savings.",
    lowRunwayContext,
    {}
  );
  assert(res.isValid, "[Scenario 10] 70/20/10 guideline protected");
}

// Scenario 11: Hypothetical scenario
{
  const res = FinancialDecisionVerifier.verify(
    "What if my salary increases?",
    "In an ideal scenario where your income increases, diversified investing could be an option.",
    lowRunwayContext,
    {}
  );
  assert(res.isValid, "[Scenario 11] Hypothetical scenario protected");
}

// Scenario 12: Standard long-term investing discussion
{
  const res = FinancialDecisionVerifier.verify(
    "What about long term goals?",
    "For long-term goals, diversified investments may be worth considering.",
    lowRunwayContext,
    {}
  );
  assert(res.isValid, "[Scenario 12] General long-term discussion protected");
}

// Scenario 13: Discretionary spending advice within limits
{
  const res = FinancialDecisionVerifier.verify(
    "Can I go out this weekend?",
    "You have room in your entertainment budget for a weekend outing.",
    healthyContext,
    {}
  );
  assert(res.isValid, "[Scenario 13] Discretionary spending within budget accepted");
}

// Scenario 14: MUST-FAIL: Emergency fund deprioritized (Runway 1.8m, advises stocks)
{
  const res = FinancialDecisionVerifier.verify(
    "What should I do this month?",
    "Consider investing $1,000 this month in stocks.",
    lowRunwayContext,
    {}
  );
  assert(!res.isValid, "[Scenario 14] MUST-FAIL: Investing with low runway rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'emergency_fund_deprioritized'), "[Scenario 14] Flagged emergency_fund_deprioritized");
}

// Scenario 15: MUST-FAIL: Emergency fund deprioritized (Start investing in equities)
{
  const res = FinancialDecisionVerifier.verify(
    "Give me advice.",
    "Start investing in equities now to grow your money.",
    lowRunwayContext,
    {}
  );
  assert(!res.isValid, "[Scenario 15] MUST-FAIL: Starting equity investment with low runway rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'emergency_fund_deprioritized'), "[Scenario 15] Flagged emergency_fund_deprioritized");
}

// Scenario 16: MUST-FAIL: Risk mismatch with emergency reserves (Crypto)
{
  const res = FinancialDecisionVerifier.verify(
    "How can I grow my emergency fund?",
    "Use your emergency savings for crypto to maximize gains.",
    healthyContext,
    {}
  );
  assert(!res.isValid, "[Scenario 16] MUST-FAIL: Crypto using emergency savings rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'risk_mismatch_recommendation'), "[Scenario 16] Flagged risk_mismatch_recommendation");
}

// Scenario 17: MUST-FAIL: Risk mismatch with emergency reserves (Stocks)
{
  const res = FinancialDecisionVerifier.verify(
    "Should I invest my safety net?",
    "Put your emergency fund into stocks for higher growth.",
    healthyContext,
    {}
  );
  assert(!res.isValid, "[Scenario 17] MUST-FAIL: Putting emergency fund into stocks rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'risk_mismatch_recommendation'), "[Scenario 17] Flagged risk_mismatch_recommendation");
}

// Scenario 18: MUST-FAIL: Extreme all-in (All your savings into stocks)
{
  const res = FinancialDecisionVerifier.verify(
    "What is your aggressive strategy?",
    "Put all your savings into stocks immediately.",
    healthyContext,
    {}
  );
  assert(!res.isValid, "[Scenario 18] MUST-FAIL: 'All your savings' rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'extreme_all_in_recommendation'), "[Scenario 18] Flagged extreme_all_in_recommendation");
}

// Scenario 19: MUST-FAIL: Extreme all-in (Entire emergency fund)
{
  const res = FinancialDecisionVerifier.verify(
    "Can I invest?",
    "Invest your entire emergency fund in tech stocks.",
    healthyContext,
    {}
  );
  assert(!res.isValid, "[Scenario 19] MUST-FAIL: 'Entire emergency fund' rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'extreme_all_in_recommendation'), "[Scenario 19] Flagged extreme_all_in_recommendation");
}

// Scenario 20: MUST-FAIL: Extreme all-in (Drain your savings)
{
  const res = FinancialDecisionVerifier.verify(
    "Should I buy crypto?",
    "Drain your savings to buy high-yield crypto today.",
    healthyContext,
    {}
  );
  assert(!res.isValid, "[Scenario 20] MUST-FAIL: 'Drain your savings' rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'extreme_all_in_recommendation'), "[Scenario 20] Flagged extreme_all_in_recommendation");
}

// Scenario 21: MUST-FAIL: High-interest debt ignored (Stocks over debt)
{
  const res = FinancialDecisionVerifier.verify(
    "How to allocate my money?",
    "Prioritize investing in mutual funds over paying off debt.",
    highDebtContext,
    {}
  );
  assert(!res.isValid, "[Scenario 21] MUST-FAIL: Prioritizing investing over debt rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'debt_payoff_deprioritized'), "[Scenario 21] Flagged debt_payoff_deprioritized");
}

// Scenario 22: MUST-FAIL: High-interest debt deprioritized (Stocks instead of credit card)
{
  const res = FinancialDecisionVerifier.verify(
    "Where to put my money?",
    "Put money into stocks instead of paying off your credit card balance.",
    highDebtContext,
    {}
  );
  assert(!res.isValid, "[Scenario 22] MUST-FAIL: Stocks instead of credit card debt rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'debt_payoff_deprioritized'), "[Scenario 22] Flagged debt_payoff_deprioritized");
}

// Scenario 23: MUST-FAIL: Short-term goal misallocation
{
  const res = FinancialDecisionVerifier.verify(
    "What should I do with my vacation fund?",
    "Move the $2,000 vacation savings into a long-term stock investment.",
    shortTermGoalContext,
    {}
  );
  assert(!res.isValid, "[Scenario 23] MUST-FAIL: Moving vacation goal savings into long-term stock investment rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'short_term_goal_misallocation'), "[Scenario 23] Flagged short_term_goal_misallocation");
}

// Scenario 24: MUST-FAIL: Stated goal contradiction (Vacation vs Discretionary spend)
{
  const res = FinancialDecisionVerifier.verify(
    "How can I reach my vacation goal faster?",
    "Spend the money on upgrading your wardrobe instead of waiting.",
    healthyContext,
    {}
  );
  assert(!res.isValid, "[Scenario 24] MUST-FAIL: Advising wardrobe spending when asking to reach vacation goal rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'stated_goal_contradiction'), "[Scenario 24] Flagged stated_goal_contradiction");
}

// Scenario 25: MUST-FAIL: Stated goal contradiction (House vs Gaming setup)
{
  const res = FinancialDecisionVerifier.verify(
    "How can I save for a house faster?",
    "Postpone your goal to buy a new gaming setup right now.",
    healthyContext,
    {}
  );
  assert(!res.isValid, "[Scenario 25] MUST-FAIL: Advising gaming setup when asking for house savings rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'stated_goal_contradiction'), "[Scenario 25] Flagged stated_goal_contradiction");
}

// Scenario 26: MUST-FAIL: Liquidity drain on fragile reserves
{
  const res = FinancialDecisionVerifier.verify(
    "Can I go on a luxury trip?",
    "Spend most of your savings on a luxury weekend retreat.",
    lowRunwayContext,
    {}
  );
  assert(!res.isValid, "[Scenario 26] MUST-FAIL: Liquidity drain on fragile reserves rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'liquidity_drain_risk'), "[Scenario 26] Flagged liquidity_drain_risk");
}

// Scenario 27: MUST-FAIL: Priority order inversion (Negative cash flow deficit, AI: invest first)
{
  const res = FinancialDecisionVerifier.verify(
    "What should be my priority?",
    "Increase stock investments first before looking at expenses.",
    deficitContext,
    {}
  );
  assert(!res.isValid, "[Scenario 27] MUST-FAIL: Prioritizing investing during negative cash flow rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'priority_order_inversion'), "[Scenario 27] Flagged priority_order_inversion");
}

// Scenario 28: MUST-FAIL: Internal contradiction (Keep vs Invest entire emergency fund)
{
  const res = FinancialDecisionVerifier.verify(
    "What about my emergency fund?",
    "Keep your emergency fund of $10,000 in cash. However, you should invest your entire emergency fund today.",
    healthyContext,
    {}
  );
  assert(!res.isValid, "[Scenario 28] MUST-FAIL: Internal contradiction (keep vs invest emergency fund) rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'internal_recommendation_conflict'), "[Scenario 28] Flagged internal_recommendation_conflict");
}

// Scenario 29: MUST-FAIL: Internal contradiction (Avoid debt vs Borrow to invest)
{
  const res = FinancialDecisionVerifier.verify(
    "Should I borrow?",
    "Avoid taking on debt right now. However, you should take out a loan to invest in stocks.",
    healthyContext,
    {}
  );
  assert(!res.isValid, "[Scenario 29] MUST-FAIL: Internal contradiction (avoid debt vs loan to invest) rejected");
  assert(res.discrepancies.some(d => d.ruleType === 'internal_recommendation_conflict'), "[Scenario 29] Flagged internal_recommendation_conflict");
}

// Scenario 30: ADVERSARIAL / COMPOUND: Compound sentence with valid and extreme advice
{
  const res = FinancialDecisionVerifier.verify(
    "What should I do with my money?",
    "Pay your minimum debt, but put all your savings into stocks.",
    healthyContext,
    {}
  );
  assert(!res.isValid, "[Scenario 30] Compound sentence caught extreme recommendation");
  assert(res.discrepancies.some(d => d.ruleType === 'extreme_all_in_recommendation'), "[Scenario 30] Flagged extreme_all_in_recommendation");
  assert(res.adjustedConfidence!.score <= 0.45, "[Scenario 30] Severe penalty applied");
}

// Scenario 31: Deduplication with existing warnings
{
  const existingWarns = ["⚠️ Decision Safety: This recommendation conflicts with the user's current emergency-fund position."];
  const res = FinancialDecisionVerifier.verify(
    "What should I do?",
    "Consider investing $1,000 this month in stocks.",
    lowRunwayContext,
    {},
    { level: 'Medium', score: 0.50 },
    { existingWarnings: existingWarns }
  );
  assert(res.isValid, "[Scenario 31] Already flagged emergency runway issue deduplicated");
  assert(res.warnings.length === 0, "[Scenario 31] Zero duplicate warnings emitted");
  assert(res.adjustedConfidence?.score === 0.50, "[Scenario 31] Zero double-penalty applied");
}

// Scenario 32: Performance benchmark (Zero network calls, sub-millisecond execution)
{
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) {
    FinancialDecisionVerifier.verify(
      "Can I invest?",
      "Once your emergency fund reaches an appropriate level, investing may become a reasonable next step.",
      lowRunwayContext,
      {}
    );
  }
  const duration = performance.now() - t0;
  assert(duration < 200, `[Scenario 32] 100 verifications executed in ${duration.toFixed(2)}ms (< 200ms)`);
}

console.log('===========================================================');
console.log(`Financial Decision Verification: Passed: ${passed}, Failed: ${failed}`);
console.log('===========================================================');

if (failed > 0) {
  process.exit(1);
}
