/**
 * Test suite for FinancialEvidenceVerifier (§AI-2.8)
 *
 * Covers:
 * - Scenarios 1–15 (MUST-PASS: verified balances, verified historicals, qualified estimates, educational examples, etc.)
 * - Scenarios 16–35 (MUST-FAIL: invented balances, fabricated data sources, unsupported entities, stale/partial misrepresentation, etc.)
 * - Adversarial Tests 36–45 (Multi-claim isolation, quoted advice, negations, conditionals, deduplication, confidence penalty)
 * - 100-run latency benchmark (< 5ms average)
 */

import { FinancialEvidenceVerifier } from '../src/ai/verification/FinancialEvidenceVerifier';

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
console.log('    AURA FINANCE — FINANCIAL EVIDENCE TEST SUITE (§AI-2.8) ');
console.log('===========================================================');

const defaultContext = {
  kpis: {
    totalIncome: 4000,
    totalExpense: 2000,
    netSavings: 2000,
    currentSavings: 5000,
    runwayMonths: 2.5,
    savingsRate: 50
  },
  budgets: [
    { category: 'Dining', limit: 600, spent: 450 },
    { category: 'Groceries', limit: 500, spent: 400 },
    { category: 'Entertainment', limit: 300, spent: 350 },
    { category: 'Utilities', limit: 250, spent: 210 }
  ],
  goals: [
    { name: 'Emergency Fund', target: 12000, current: 5000 },
    { name: 'Vacation', target: 2000, current: 1800 }
  ],
  debts: [
    { name: 'Credit Card', balance: 6500, interestRate: 24.99 }
  ],
  historyMonths: 1,
  historicalSpending: {
    dining_last_month: 400
  },
  isStale: false,
  isPartial: false
};

const highConfidence = { level: 'High' as const, score: 0.95 };

// ============================================================================
// PART 1: SCENARIOS 1–15 (MUST-PASS)
// ============================================================================
console.log('\n--- PART 1: SCENARIOS 1–15 (MUST-PASS) ---');

// 1. Exact verified current balance
{
  const res = FinancialEvidenceVerifier.verify(
    'What is my savings balance?',
    'Your current savings balance is $5,000.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 1: Exact verified current balance passes');
}

// 2. Exact verified income
{
  const res = FinancialEvidenceVerifier.verify(
    'What is my income?',
    'Your verified monthly income is $4,000.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 2: Exact verified income passes');
}

// 3. Exact verified expense
{
  const res = FinancialEvidenceVerifier.verify(
    'What are my total expenses?',
    'Your monthly expenses are $2,000.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 3: Exact verified expenses passes');
}

// 4. Verified historical spending
{
  const res = FinancialEvidenceVerifier.verify(
    'What did I spend on dining last month?',
    'Last month you spent $400 on dining.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 4: Verified historical spending passes');
}

// 5. Verified category data
{
  const res = FinancialEvidenceVerifier.verify(
    'How did I do on groceries?',
    'You spent $400 of your $500 Groceries budget.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 5: Verified category data passes');
}

// 6. Valid derived calculation
{
  const res = FinancialEvidenceVerifier.verify(
    'What is my net monthly surplus?',
    'Your net monthly savings is $2,000.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 6: Valid derived calculation passes');
}

// 7. Qualified estimate
{
  const res = FinancialEvidenceVerifier.verify(
    'Estimate my groceries spending next month',
    'Based on available records, your grocery spending is approximately $400.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 7: Qualified estimate passes');
}

// 8. Approximate projection
{
  const res = FinancialEvidenceVerifier.verify(
    'How much could I have next year?',
    'At this savings rate, you could have around $10,000 next year if current income continues.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 8: Approximate projection passes');
}

// 9. Conditional trend statement
{
  const res = FinancialEvidenceVerifier.verify(
    'How is my dining spending trending?',
    'Based on the two months of data available, your dining expenses appear to be trending downward.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 9: Conditional trend statement passes');
}

// 10. Insufficient-data disclaimer
{
  const res = FinancialEvidenceVerifier.verify(
    'What is my 12-month dining average?',
    "We don't have enough data to calculate your 12-month average as only recent data is on file.",
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 10: Insufficient-data disclaimer passes');
}

// 11. Hypothetical example
{
  const res = FinancialEvidenceVerifier.verify(
    'How do grocery budgets work?',
    'If someone spends $500 on groceries per month, that accounts for a substantial portion of a budget.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 11: Hypothetical example passes');
}

// 12. Educational example
{
  const res = FinancialEvidenceVerifier.verify(
    'What is the 50/30/20 rule?',
    'Under the 50/30/20 rule, a typical allocation would dedicate 50% to needs.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 12: Educational example passes');
}

// 13. User-specific verified entity
{
  const res = FinancialEvidenceVerifier.verify(
    'What is my credit card balance?',
    'Your Credit Card balance is $6,500.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 13: User-specific verified entity passes');
}

// 14. Valid comparison with available baseline
{
  const res = FinancialEvidenceVerifier.verify(
    'Did I spend more on dining this month than last month?',
    'Your dining spending is $50 higher than last month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 14: Valid comparison with available baseline passes');
}

// 15. Valid multi-period trend with sufficient history
{
  const twelveMonthContext = { ...defaultContext, historyMonths: 12 };
  const res = FinancialEvidenceVerifier.verify(
    'How has my spending changed over the year?',
    'Your average grocery spending over the last 12 months is $400.',
    twelveMonthContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 15: 12-month average with 12 months history passes');
}

// ============================================================================
// PART 2: SCENARIOS 16–35 (MUST-FAIL)
// ============================================================================
console.log('\n--- PART 2: SCENARIOS 16–35 (MUST-FAIL) ---');

// 16. Invented current balance
{
  const res = FinancialEvidenceVerifier.verify(
    'What are my current savings?',
    'Your current savings are $10,000.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsupported_current_fact'), 'Scenario 16: Invented $10,000 savings balance fails');
}

// 17. Invented savings balance
{
  const res = FinancialEvidenceVerifier.verify(
    'How much do I have saved?',
    'You currently have $25,000 in your savings account.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsupported_current_fact'), 'Scenario 17: Invented $25,000 savings account fails');
}

// 18. Invented historical spending
{
  const res = FinancialEvidenceVerifier.verify(
    'What did I spend in 2023?',
    'In 2023, you spent $18,000 on dining.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsupported_historical_claim'), 'Scenario 18: Invented 2023 historical spending fails');
}

// 19. Invented annual spending
{
  const res = FinancialEvidenceVerifier.verify(
    'What is my annual dining spending?',
    'Your annual dining spending is $4,800.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'evidence_scope_expansion'), 'Scenario 19: Unsubstantiated annual dining total fails');
}

// 20. Invented category (Yacht)
{
  const res = FinancialEvidenceVerifier.verify(
    'What did I spend on maintenance?',
    'You spent $1,200 on Yacht maintenance this month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsupported_user_entity'), 'Scenario 20: Invented Yacht maintenance category fails');
}

// 21. Invented mortgage
{
  const res = FinancialEvidenceVerifier.verify(
    'What are my housing payments?',
    'Your mortgage payment is $1,800 per month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsupported_user_entity'), 'Scenario 21: Invented mortgage payment fails');
}

// 22. Invented car expense
{
  const res = FinancialEvidenceVerifier.verify(
    'How much do I spend on transportation?',
    'You spend $500/month on your Tesla.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsupported_user_entity'), 'Scenario 22: Invented Tesla vehicle expense fails');
}

// 23. Fabricated bank statement
{
  const res = FinancialEvidenceVerifier.verify(
    'Are there any overdrafts?',
    "According to your bank's latest statement, your account has no overdrafts.",
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'fabricated_data_source'), 'Scenario 23: Fabricated bank statement source fails');
}

// 24. Fabricated credit bureau source
{
  const res = FinancialEvidenceVerifier.verify(
    'What is my credit score?',
    'Based on your credit bureau data from Experian, your credit score is 740.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'fabricated_data_source'), 'Scenario 24: Fabricated credit bureau data fails');
}

// 25. Unsupported 12-month trend
{
  const res = FinancialEvidenceVerifier.verify(
    'What is my 12-month average?',
    'Your average grocery spending over the last 12 months is $400.',
    defaultContext, // historyMonths is 1
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'data_availability_misrepresentation'), 'Scenario 25: 12-month claim with only 1 month history fails');
}

// 26. Unsupported annualization
{
  const res = FinancialEvidenceVerifier.verify(
    'How much do I spend on utilities a year?',
    'Your annual utility spending is $2,400.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'evidence_scope_expansion'), 'Scenario 26: Unsupported utility annualization fails');
}

// 27. Unsupported monthly average
{
  const res = FinancialEvidenceVerifier.verify(
    'What is typical for me?',
    'You typically spend $400 every month on dining.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'evidence_scope_expansion'), 'Scenario 27: Unsupported typical monthly claim fails');
}

// 28. Unsupported comparison baseline
{
  const res = FinancialEvidenceVerifier.verify(
    'How does my grocery spending compare to last year?',
    'Your grocery spending is 30% higher than last year.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsupported_comparison_baseline'), 'Scenario 28: Unsupported last-year comparison fails');
}

// 29. Partial dataset presented as complete
{
  const partialContext = { ...defaultContext, isPartial: true };
  const res = FinancialEvidenceVerifier.verify(
    'What are my total expenses?',
    'Your total monthly expenses are $3,000.',
    partialContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'partial_data_as_complete'), 'Scenario 29: Partial dataset asserted as complete total fails');
}

// 30. Derived surplus presented as bank balance
{
  // Income 4000, Expense 2000, NetSavings 2000, CurrentSavings 5000
  const res = FinancialEvidenceVerifier.verify(
    'What is in my savings account?',
    'You have exactly $2,000 in your savings account.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'inference_presented_as_fact'), 'Scenario 30: Monthly net surplus presented as savings account balance fails');
}

// 31. Estimate presented as exact fact
{
  const res = FinancialEvidenceVerifier.verify(
    'How much will I have in 3 months?',
    'Your account will have exactly $8,542 in 3 months.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unqualified_estimate'), 'Scenario 31: Future estimate asserted as exact fact fails');
}

// 32. Stale data presented as current
{
  const staleContext = { ...defaultContext, isStale: true };
  const res = FinancialEvidenceVerifier.verify(
    'What is my current balance?',
    'Your current balance is $5,000.',
    staleContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'stale_data_as_current_fact'), 'Scenario 32: Stale data asserted as current up-to-date fact fails');
}

// 33. Unsupported "every month" claim
{
  const res = FinancialEvidenceVerifier.verify(
    'How much do I spend on entertainment?',
    'You spend $350 every month on entertainment.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'evidence_scope_expansion'), 'Scenario 33: Unsupported "every month" claim fails');
}

// 34. Unsupported "typically" claim
{
  const res = FinancialEvidenceVerifier.verify(
    'How much do I spend on dining?',
    'You typically spend $450 on dining.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'evidence_scope_expansion'), 'Scenario 34: Unsupported "typically" claim fails');
}

// 35. Unsupported "always" claim
{
  const res = FinancialEvidenceVerifier.verify(
    'How much do I spend on entertainment?',
    'You always spend $350 on entertainment.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'evidence_scope_expansion'), 'Scenario 35: Unsupported "always" claim fails');
}

// ============================================================================
// PART 3: ADVERSARIAL TESTS 36–45
// ============================================================================
console.log('\n--- PART 3: ADVERSARIAL TESTS 36–45 ---');

// Test 36: Valid statement followed by invalid statement
{
  const res = FinancialEvidenceVerifier.verify(
    'Tell me about my income and dining',
    'Your verified monthly income is $4,000. You typically spend $400 every month on dining.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.length === 1 && res.discrepancies[0].issueType === 'evidence_scope_expansion', 'Test 36: Isolates invalid second clause without rejecting verified first clause');
}

// Test 37: Invalid statement followed by valid statement
{
  const res = FinancialEvidenceVerifier.verify(
    'Tell me about my expenses and savings',
    'You spend $500/month on your Tesla. Your current savings balance is $5,000.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.length === 1 && res.discrepancies[0].issueType === 'unsupported_user_entity', 'Test 37: Isolates invalid first clause without rejecting verified second clause');
}

// Test 38: Quoted fabricated advice
{
  const res = FinancialEvidenceVerifier.verify(
    'What scam warning should I heed?',
    "Beware of scammers claiming 'according to your bank's latest statement you owe money'.",
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 38: Quoted fabricated advice is protected and passes cleanly');
}

// Test 39: Educational fabricated example
{
  const res = FinancialEvidenceVerifier.verify(
    'How do mortgages work?',
    'For example, if a homeowner has a mortgage payment of $1,800, that is their primary housing cost.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 39: Educational mortgage example passes cleanly');
}

// Test 40: Hypothetical scenario
{
  const res = FinancialEvidenceVerifier.verify(
    'What if I bought a car?',
    'If you had a car payment of $500, your monthly surplus would decrease.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 40: Hypothetical car payment scenario passes cleanly');
}

// Test 41: Negated unsupported claim
{
  const res = FinancialEvidenceVerifier.verify(
    'Do I have any car loans?',
    'You do not have any recorded Tesla or car expenses in your profile.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 41: Negated entity check passes cleanly');
}

// Test 42: Conditional unsupported claim
{
  const res = FinancialEvidenceVerifier.verify(
    'What would my annual dining be?',
    'If your dining spending were to remain at $400, your annual spending would be around $4,800.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 42: Conditional qualified annualization passes cleanly');
}

// Test 43: Multi-category evidence scope
{
  const res = FinancialEvidenceVerifier.verify(
    'What did I spend on dining and groceries?',
    'You spent $450 on Dining and $400 on Groceries.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 43: Verified multi-category spending passes cleanly');
}

// Test 44: Deduplication with previous verifier warning
{
  const existingWarns = ['⚠️ Evidence Note: Claim attributes a Tesla or car expense to the user that is not present in authoritative records.'];
  const res = FinancialEvidenceVerifier.verify(
    'How is my car?',
    'You spend $500/month on your Tesla.',
    defaultContext,
    {},
    highConfidence,
    { existingWarnings: existingWarns }
  );
  assert(res.warnings.length === 0, 'Test 44: Deduplication suppresses already flagged evidence warning');
}

// Test 45: Confidence penalty correctness
{
  const res = FinancialEvidenceVerifier.verify(
    'What are my savings?',
    'Your current savings are $10,000.', // severe discrepancy (-0.30)
    defaultContext,
    {},
    { level: 'High', score: 0.90 }
  );
  assert(res.adjustedConfidence !== undefined && res.adjustedConfidence.score === 0.60, 'Test 45: Severe discrepancy applies exact 0.30 confidence penalty');
}

// ============================================================================
// PART 4: LATENCY BENCHMARK (100 Verifications)
// ============================================================================
console.log('\n--- PART 4: LATENCY BENCHMARK ---');
const iterations = 100;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  FinancialEvidenceVerifier.verify(
    'How much did I spend on Dining and Groceries?',
    'You spent $450 on Dining and $400 on Groceries this month.',
    defaultContext,
    {},
    highConfidence
  );
}
const elapsed = performance.now() - start;
const avg = elapsed / iterations;
console.log(`Benchmark completed: ${iterations} runs in ${elapsed.toFixed(2)}ms (avg ${avg.toFixed(3)}ms/call)`);
assert(avg < 5.0, `Benchmark passes latency target (< 5ms avg, actual: ${avg.toFixed(3)}ms)`);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n===========================================================');
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('===========================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL AI-2.8 EVIDENCE VERIFICATION TESTS PASSED SUCCESSFULLY.');
}
