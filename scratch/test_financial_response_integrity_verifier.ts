/**
 * Test suite for FinancialResponseIntegrityVerifier (§AI-2.7)
 *
 * Covers:
 * - Scenarios 1–15 (MUST-PASS: direct answers, multi-entity, comparisons, affordability, why explanations, projections, synonyms, etc.)
 * - Scenarios 16–40 (MUST-FAIL: misalignments, missing numbers, missing entities, missing comparisons, contradictions, vague evasions, etc.)
 * - Adversarial Tests 41–48 (Synonyms, negations, legitimate refusal, concise answers, safety disclaimers, educational frameworks)
 * - Multi-tier deduplication check
 * - 100-run latency benchmark (< 5ms average)
 */

import { FinancialResponseIntegrityVerifier } from '../src/ai/verification/FinancialResponseIntegrityVerifier';

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
console.log(' AURA FINANCE — FINANCIAL RESPONSE INTEGRITY TEST SUITE   ');
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
  ]
};

const highConfidence = { level: 'High' as const, score: 0.95 };

// ============================================================================
// PART 1: SCENARIOS 1–15 (MUST-PASS)
// ============================================================================
console.log('\n--- PART 1: SCENARIOS 1–15 (MUST-PASS) ---');

// 1. Direct numerical answer
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Dining this month?',
    'You have spent $450 on Dining this month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 1: Direct numerical answer passes');
}

// 2. Correct category answer
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'What is my Groceries spending?',
    'Your Groceries spending is $400, which is within your $500 monthly limit.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 2: Correct category answer passes');
}

// 3. Correct multi-category answer
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Dining and Groceries?',
    'You spent $450 on Dining and $400 on Groceries, for a combined total of $850.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 3: Correct multi-category answer passes');
}

// 4. Correct comparison
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Which was higher, Dining or Groceries?',
    'Dining was higher at $450, compared to $400 for Groceries.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 4: Correct comparison answer passes');
}

// 5. Correct yes/no affordability answer
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Can I afford a $100 purchase right now?',
    'Yes, you can afford this purchase as you have $2,000 in net savings this month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 5: Correct affordability answer passes');
}

// 6. Correct goal-progress answer
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How is my Emergency Fund goal progressing?',
    'Your Emergency Fund has $5,000 saved toward your $12,000 target, covering 2.5 months of expenses.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 6: Correct goal progress answer passes');
}

// 7. Correct debt question answer
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'What is my Credit Card debt balance?',
    'Your Credit Card debt balance is $6,500 with a 24.99% interest rate.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 7: Correct debt question answer passes');
}

// 8. Correct "why" explanation
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Why is my Entertainment spending high?',
    'Your Entertainment spending is high because you had an unexpected concert ticket purchase of $150.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 8: Correct why explanation passes');
}

// 9. Correct qualified future projection
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much will I have next year?',
    'I cannot know the exact future balance, but based on your current savings rate, you could have approximately $12,000 next year if current conditions continue.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 9: Correct qualified future projection passes');
}

// 10. Valid insufficient-data response
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'What will my freelance taxes be next April?',
    "We don't have enough data on your freelance income or 1099 deductions to provide an accurate tax estimate.",
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 10: Valid insufficient-data refusal passes');
}

// 11. Concise but complete answer
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'What is my monthly income?',
    'Your monthly income is $4,000.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 11: Concise but complete answer passes');
}

// 12. Educational explanation
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'What is the 50/30/20 budgeting rule?',
    'The 50/30/20 rule is a budgeting guideline allocating 50% to needs, 30% to wants, and 20% to savings.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 12: Educational explanation passes');
}

// 13. Safety warning + direct answer
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Can I invest $5,000 into crypto today?',
    'No, you cannot afford this purchase without compromising your safety, because your emergency runway is only 2.5 months.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 13: Safety warning with direct determination passes');
}

// 14. Synonym usage
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Food?',
    'Your Groceries spending was $400 this month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 14: Valid synonym ("Groceries" for "Food") passes');
}

// 15. Multi-part answer covering all parts
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Dining and Groceries, and which was higher?',
    'You spent $450 on Dining and $400 on Groceries. Dining was higher by $50.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 15: Multi-part answer covering all parts passes');
}

// ============================================================================
// PART 2: SCENARIOS 16–40 (MUST-FAIL)
// ============================================================================
console.log('\n--- PART 2: SCENARIOS 16–40 (MUST-FAIL) ---');

// 16. Completely unrelated answer
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Food?',
    'You should consider increasing your 401k contribution by 2% to take advantage of compound interest.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'wrong_entity_substitution' || d.issueType === 'question_answer_misalignment'), 'Scenario 16: Unrelated answer fails');
}

// 17. Generic advice instead of requested number
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'What did I spend on Dining this month?',
    'Dining out frequently can strain your monthly budget, so meal prepping is always a smart choice.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_required_number'), 'Scenario 17: Generic advice without amount fails');
}

// 18. Missing one category in a multi-category question
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Dining and Utilities?',
    'You spent $450 on Dining this month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_entity_coverage'), 'Scenario 18: Missing second category in multi-category query fails');
}

// 19. Missing comparison result
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Which was higher, Dining or Groceries?',
    'You spent $450 on Dining and $400 on Groceries.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_comparison'), 'Scenario 19: Missing comparison determination fails');
}

// 20. Missing yes/no determination
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Can I afford to buy a new $800 laptop?',
    'A laptop is useful for remote work and digital entertainment.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_yes_no_determination'), 'Scenario 20: Missing yes/no determination fails');
}

// 21. Missing requested goal
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How is my Vacation goal doing?',
    'Your Emergency Fund currently has $5,000 saved.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'wrong_entity_substitution' || d.issueType === 'question_answer_misalignment'), 'Scenario 21: Missing requested goal fails');
}

// 22. Missing requested debt
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'What is my Credit Card balance?',
    'Your savings account has a balance of $3,000.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'wrong_entity_substitution' || d.issueType === 'question_answer_misalignment'), 'Scenario 22: Missing requested debt fails');
}

// 23. Empty / generic response
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I save this month?',
    'Hello! I am Aura. Having good financial habits is essential for a secure financial future.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'empty_non_informative_answer'), 'Scenario 23: Empty/generic response fails');
}

// 24. Contradictory direct answers
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Can I afford this $300 purchase?',
    'Yes, you can afford this purchase without issue. However, you cannot afford this purchase because your funds are insufficient.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'contradictory_answer'), 'Scenario 24: Contradictory direct answers fails');
}

// 25. Non-answer disguised as explanation
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Why did my expenses increase?',
    'Expenses are the money that leaves your account each month to pay for goods and services.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_causal_explanation'), 'Scenario 25: Non-answer dictionary definition fails');
}

// 26. Unsupported completeness claim
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'What are my monthly expenses and what are my debts?',
    "Your monthly expenses are $2,000. That's everything you need to know and this fully solves your financial situation.",
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsupported_completeness_claim'), 'Scenario 26: Unsupported completeness claim while omitting debts fails');
}

// 27. Multiple requested entities but only one addressed
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Tell me about my Dining, Groceries, and Entertainment spending.',
    'You spent $450 on Dining this month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_entity_coverage'), 'Scenario 27: Omitting 2 of 3 requested entities fails');
}

// 28. Calculation question answered with investment advice
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Calculate my remaining Dining budget.',
    'You should invest in index funds to achieve long-term wealth.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_required_number' || d.issueType === 'wrong_entity_substitution'), 'Scenario 28: Calculation answered with investment advice fails');
}

// 29. "How much" question with no amount
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much is left in my Groceries budget?',
    'You have plenty of room left in your budget to buy groceries.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_required_number'), 'Scenario 29: "How much" without amount fails');
}

// 30. "Which is higher?" with no comparison
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Which was higher, housing or food?',
    'Housing and food are essential living expenses that everyone must pay.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_comparison'), 'Scenario 30: "Which is higher" without comparison fails');
}

// 31. "Can I afford this?" without affordability determination
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Can I afford a $50 dinner tonight?',
    'Dining at restaurants is a popular social activity.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_yes_no_determination'), 'Scenario 31: Affordability question with no determination fails');
}

// 32. "Why is my spending high?" with no causal/explanatory response
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Why is my spending high this month?',
    'Your spending this month was $2,000 across multiple categories.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_causal_explanation'), 'Scenario 32: Why question without causal reasoning fails');
}

// 33. Multi-part question with only first part answered
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Dining and what is my remaining budget?',
    'You spent $450 on Dining.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'partial_multi_part_answer'), 'Scenario 33: Multi-part with second part omitted fails');
}

// 34. Multi-part question with only second part answered
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Dining and can I afford a $50 dinner?',
    'Yes, you can afford a $50 dinner.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'partial_multi_part_answer'), 'Scenario 34: Multi-part with first part omitted fails');
}

// 35. Entity substitution
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Groceries?',
    'You spent $450 on Dining.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'wrong_entity_substitution'), 'Scenario 35: Entity substitution fails');
}

// 36. Wrong requested category
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'What did I spend on Utilities?',
    'You spent $350 on Entertainment.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'wrong_entity_substitution'), 'Scenario 36: Wrong category substitution fails');
}

// 37. Wrong goal
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How is my House Downpayment goal progressing?',
    'Your Vacation goal is 90% complete.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'wrong_entity_substitution'), 'Scenario 37: Wrong goal substitution fails');
}

// 38. Wrong debt/account
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'What is my Student Loan balance?',
    'Your Credit Card balance is $6,500.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'wrong_entity_substitution'), 'Scenario 38: Wrong debt substitution fails');
}

// 39. Vague response with no useful information
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I save last month?',
    'Savings fluctuate from month to month depending on what happens.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'empty_non_informative_answer' || d.issueType === 'missing_required_number'), 'Scenario 39: Vague evasion fails');
}

// 40. Compound incomplete answer
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Dining, what was my Groceries spending, and which was higher?',
    'You spent $450 on Dining.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_entity_coverage' || d.issueType === 'missing_comparison'), 'Scenario 40: Compound incomplete answer fails');
}

// ============================================================================
// PART 3: ADVERSARIAL TESTS 41–48
// ============================================================================
console.log('\n--- PART 3: ADVERSARIAL TESTS 41–48 ---');

// Test 41: Synonym usage: "eating out" for Dining (MUST PASS)
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Dining?',
    'You spent $450 on eating out this month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 41: Synonym ("eating out") passes cleanly');
}

// Test 42: Negation in comparative answer (MUST PASS)
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Which was higher, Dining or Groceries?',
    'Dining was higher than Groceries, as you spent $450 compared to $400.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 42: Direct comparative phrasing passes cleanly');
}

// Test 43: Legitimate refusal to fabricate data (MUST PASS)
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'What will my stock portfolio return in 2030?',
    'We do not have enough data to predict stock market returns in 2030 as future returns cannot be known.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 43: Legitimate refusal to fabricate data passes cleanly');
}

// Test 44: Concise direct answer (MUST PASS)
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'Can I afford this purchase?',
    'Yes, you can afford it within your budget.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 44: Concise direct answer passes cleanly');
}

// Test 45: Safety disclaimer + valid answer (MUST PASS)
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'What was my spending on Entertainment?',
    'Please keep in mind that budgets are guidelines, but you spent $350 on Entertainment this month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 45: Safety disclaimer alongside valid answer passes cleanly');
}

// Test 46: Educational content without numbers (MUST PASS)
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How does an emergency fund work?',
    'An emergency fund is a cash reserve set aside for unplanned expenses like medical bills or repairs.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 46: Educational conceptual answer passes cleanly');
}

// Test 47: Multiple entities mentioned in explanation (MUST PASS)
{
  const res = FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Dining and Groceries?',
    'You spent $450 on Dining and $400 on Groceries, while your Utilities were $210.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test 47: Additional context entities alongside requested entities passes cleanly');
}

// Test 48: Multi-tier Deduplication Check
{
  const existingWarns = ['⚠️ Response Integrity Note: The query requested a specific financial amount, but no numerical value was provided.'];
  const res = FinancialResponseIntegrityVerifier.verify(
    'What did I spend on Dining?',
    'Dining out is fun.',
    defaultContext,
    {},
    highConfidence,
    { existingWarnings: existingWarns }
  );
  assert(res.warnings.length === 0, 'Test 48: Deduplication suppresses already flagged integrity warnings');
}

// ============================================================================
// PART 4: LATENCY BENCHMARK (100 Verifications)
// ============================================================================
console.log('\n--- PART 4: LATENCY BENCHMARK ---');
const iterations = 100;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  FinancialResponseIntegrityVerifier.verify(
    'How much did I spend on Dining and Groceries, and which was higher?',
    'You spent $450 on Dining and $400 on Groceries. Dining was higher by $50.',
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
  console.log('ALL AI-2.7 RESPONSE INTEGRITY VERIFICATION TESTS PASSED SUCCESSFULLY.');
}
