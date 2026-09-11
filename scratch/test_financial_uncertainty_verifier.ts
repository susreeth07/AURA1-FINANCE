/**
 * Test suite for FinancialUncertaintyVerifier (§AI-2.6)
 *
 * Covers:
 * - Scenarios 1–20 (MUST-PASS: legitimate uncertainty, conditional projections, educational rules, risk disclosures)
 * - Scenarios 21–35 (MUST-FAIL: risk-free claims, guaranteed outcomes, false precision, causal guarantees, scope expansion)
 * - Tests A–H (Adversarial edge cases, negation, nested quotation, multi-tier deduplication)
 * - 100-run latency benchmark (< 5ms average)
 */

import { FinancialUncertaintyVerifier } from '../src/ai/verification/FinancialUncertaintyVerifier';

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
console.log('   AURA FINANCE — FINANCIAL UNCERTAINTY VERIFIER SUITE    ');
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
    { category: 'Entertainment', limit: 300, spent: 350 }
  ]
};

const highConfidence = { level: 'High' as const, score: 0.95 };
const lowConfidence = { level: 'Low' as const, score: 0.45 };

// ============================================================================
// PART 1: SCENARIOS 1–20 (MUST-PASS)
// ============================================================================
console.log('\n--- PART 1: SCENARIOS 1–20 (MUST-PASS) ---');

// 1. Educational rule: 50/30/20
{
  const res = FinancialUncertaintyVerifier.verify(
    'What budgeting rule should I use?',
    'A common guideline is the 50/30/20 rule, which suggests allocating 50% to needs.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 1: Educational rule (50/30/20) passes');
}

// 2. Educational emergency fund rule: 3 to 6 months
{
  const res = FinancialUncertaintyVerifier.verify(
    'How much should I keep in emergency savings?',
    'Financial experts often recommend keeping 3 to 6 months of expenses in an emergency fund.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 2: Educational emergency fund guideline passes');
}

// 3. Clear conditional advice
{
  const res = FinancialUncertaintyVerifier.verify(
    'Can I save $500 monthly?',
    'If your income remains constant at $4,000, you could save approximately $500 monthly.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 3: Clear conditional advice with approximation passes');
}

// 4. Verified present fact
{
  const res = FinancialUncertaintyVerifier.verify(
    'What is my emergency fund balance?',
    'Your current emergency fund balance is $5,000, which covers 2.5 months of expenses.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 4: Verified present fact matches context');
}

// 5. Negative risk disclaimer
{
  const res = FinancialUncertaintyVerifier.verify(
    'Are returns guaranteed?',
    'Please note that all investments carry risk and returns are not guaranteed.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 5: Negative risk disclaimer passes');
}

// 6. Negative risk disclaimer: no investment is completely risk-free
{
  const res = FinancialUncertaintyVerifier.verify(
    'Is this risk-free?',
    'No investment strategy is completely risk-free.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 6: Negated risk-free assertion passes');
}

// 7. Cautious projection with qualifier
{
  const res = FinancialUncertaintyVerifier.verify(
    'When will I reach my goal?',
    'Based on your past savings rate, you may potentially reach your goal by December.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 7: Cautious projection with qualifiers passes');
}

// 8. Approximate future estimate
{
  const res = FinancialUncertaintyVerifier.verify(
    'How much will I have next year?',
    'You could have around $12,000 by next year if current patterns continue.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 8: Approximate future estimate with condition passes');
}

// 9. Balanced trade-off
{
  const res = FinancialUncertaintyVerifier.verify(
    'Should I pay debt or invest?',
    'Paying off high-interest debt first typically saves more in interest, though investing early offers compound growth potential.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 9: Balanced trade-off explanation passes');
}

// 10. Appropriate high confidence response
{
  const res = FinancialUncertaintyVerifier.verify(
    'What was my spending last month?',
    'Your total spending last month was $2,800 according to your transaction history.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 10: High confidence factual historical response passes');
}

// 11. Appropriate low confidence cautious response
{
  const res = FinancialUncertaintyVerifier.verify(
    'Can you estimate my freelance earnings?',
    'Because we have limited data on your freelance income, this estimate is uncertain and may vary significantly.',
    defaultContext,
    {},
    lowConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 11: Low confidence cautious response passes');
}

// 12. Mathematical identity conditional on assumptions
{
  const res = FinancialUncertaintyVerifier.verify(
    'How much will $1,000 earn at 5% APY?',
    'Assuming zero market volatility and constant 5% APY, $1,000 earns approximately $50 per year.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 12: Conditional mathematical projection passes');
}

// 13. Educational diversification rule
{
  const res = FinancialUncertaintyVerifier.verify(
    'Why buy index funds?',
    'Diversifying across index funds can help mitigate single-stock volatility.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 13: Educational diversification rule passes');
}

// 14. Historical context without future promise
{
  const res = FinancialUncertaintyVerifier.verify(
    'What is the stock market return?',
    'Historically, the S&P 500 has averaged roughly 7-10% annually before inflation, but past performance does not guarantee future results.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 14: Historical context with past performance disclaimer passes');
}

// 15. Verified budget fact
{
  const res = FinancialUncertaintyVerifier.verify(
    'How is my dining budget?',
    'You have spent $450 of your $600 dining budget this month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 15: Verified dining budget fact passes');
}

// 16. Scope-appropriate assessment
{
  const res = FinancialUncertaintyVerifier.verify(
    'How is my grocery spending?',
    'Based on your grocery spending of $400, this category is slightly higher than your historical average.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 16: Category-bounded assessment passes');
}

// 17. Conditional goal timeline
{
  const res = FinancialUncertaintyVerifier.verify(
    'How long to save $2,000?',
    'At your current pace of saving $200 per month, reaching $2,000 will take about 10 months.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 17: Conditional goal timeline with approx qualifier passes');
}

// 18. Hedged recommendation
{
  const res = FinancialUncertaintyVerifier.verify(
    'How can I cut expenses?',
    'You might consider reviewing your subscription services to identify potential recurring savings.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 18: Hedged recommendation passes');
}

// 19. Risk-acknowledged strategy
{
  const res = FinancialUncertaintyVerifier.verify(
    'Are HYSA accounts good?',
    'High-yield savings accounts offer a lower-risk option for your emergency fund, though yields fluctuate with interest rates.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 19: Risk-acknowledged HYSA strategy passes');
}

// 20. Multi-factor uncertainty acknowledgement
{
  const res = FinancialUncertaintyVerifier.verify(
    'What affects my savings timeline?',
    'Your savings timeline depends on several factors including income stability, unexpected expenses, and inflation.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Scenario 20: Multi-factor uncertainty acknowledgement passes');
}

// ============================================================================
// PART 2: SCENARIOS 21–35 (MUST-FAIL)
// ============================================================================
console.log('\n--- PART 2: SCENARIOS 21–35 (MUST-FAIL) ---');

// 21. Risk-free investment promise
{
  const res = FinancialUncertaintyVerifier.verify(
    'Is this crypto safe?',
    'This crypto strategy is completely risk-free and offers zero downside.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'risk_free_investment_claim'), 'Scenario 21: Risk-free crypto claim fails');
}

// 22. Guaranteed future market return
{
  const res = FinancialUncertaintyVerifier.verify(
    'What will I earn?',
    'You are guaranteed to earn 12% returns annually with this portfolio.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'risk_free_investment_claim' || d.issueType === 'guaranteed_future_outcome'), 'Scenario 22: Guaranteed 12% returns fails');
}

// 23. Absolute zero-risk assertion
{
  const res = FinancialUncertaintyVerifier.verify(
    'Are tech stocks safe?',
    'There is absolutely no risk in putting all your savings into tech stocks.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'risk_free_investment_claim'), 'Scenario 23: Absolute zero-risk assertion fails');
}

// 24. Impossible to lose claim
{
  const res = FinancialUncertaintyVerifier.verify(
    'Can I lose money trading options?',
    'It is impossible to lose money with this options strategy.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'risk_free_investment_claim'), 'Scenario 24: Impossible to lose money claim fails');
}

// 25. Fixed future promise with no conditions
{
  const res = FinancialUncertaintyVerifier.verify(
    'How much will I have next August?',
    'You will definitely have $50,000 in your account by next August.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'guaranteed_future_outcome' || d.issueType === 'projection_as_current_fact'), 'Scenario 25: Fixed future promise fails');
}

// 26. Certainty language with low confidence
{
  const res = FinancialUncertaintyVerifier.verify(
    'Will I hit my goal?',
    'You will definitely hit your goal with 100% certainty.',
    defaultContext,
    {},
    lowConfidence
  );
  assert(!res.isValid && res.discrepancies.length > 0, 'Scenario 26: 100% certainty with low confidence fails');
}

// 27. False precision in future prediction (cents)
{
  const res = FinancialUncertaintyVerifier.verify(
    'What will my portfolio be worth in 5 years?',
    'Your portfolio will be worth exactly $47,823.14 in 5 years.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'false_precision_future_prediction'), 'Scenario 27: Exact cents future prediction fails');
}

// 28. False precision in future completion date
{
  const res = FinancialUncertaintyVerifier.verify(
    'When will I be debt-free?',
    'You will pay off your debt on exactly October 14, 2028.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'false_precision_future_prediction'), 'Scenario 28: Exact calendar date payoff prediction fails');
}

// 29. Stating projection as current verified fact
{
  const res = FinancialUncertaintyVerifier.verify(
    'How are my retirement savings?',
    'You already have $15,000 saved for retirement next year.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'projection_as_current_fact'), 'Scenario 29: Future projection stated as already saved fails');
}

// 30. Unsupported causal guarantee
{
  const res = FinancialUncertaintyVerifier.verify(
    'What happens if I stop buying coffee?',
    'Cutting your coffee spending will make you a millionaire.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsupported_causal_claim'), 'Scenario 30: Unsupported causal guarantee to become millionaire fails');
}

// 31. Guaranteed debt-free date without qualifiers
{
  const res = FinancialUncertaintyVerifier.verify(
    'Can this plan fail?',
    'This plan ensures you will be completely debt-free in 24 months with no risk of delay.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'guaranteed_future_outcome' || d.issueType === 'risk_free_investment_claim'), 'Scenario 31: Debt-free guarantee with no risk of delay fails');
}

// 32. Scope expansion into character judgment
{
  const res = FinancialUncertaintyVerifier.verify(
    'How did I do on dining out?',
    'Your dining out spending shows that you have poor financial discipline and are financially irresponsible.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsupported_behavioral_judgment'), 'Scenario 32: Negative character judgment fails');
}

// 33. Unwarranted generalization from single metric
{
  const res = FinancialUncertaintyVerifier.verify(
    'Did I mess up my entertainment budget?',
    'Because you overspent on entertainment this month, your entire budget will collapse.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsupported_scope_expansion'), 'Scenario 33: Single metric collapse generalization fails');
}

// 34. Extreme epistemic overconfidence
{
  const res = FinancialUncertaintyVerifier.verify(
    'Is this move right for me?',
    'Without any doubt whatsoever, this is undeniably the single best financial move available to anyone.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'absolute_financial_language' || d.issueType === 'confidence_language_mismatch'), 'Scenario 34: Extreme epistemic overconfidence fails');
}

// 35. Combined multi-violation
{
  const res = FinancialUncertaintyVerifier.verify(
    'Should I invest in this scheme?',
    'This zero-risk investment guarantees you will earn $10,000 next month with 100% certainty, proving you are finally making smart financial choices.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.length >= 2, 'Scenario 35: Multi-violation detected and multiple discrepancies returned');
}

// ============================================================================
// PART 3: ADVERSARIAL TESTS A–H
// ============================================================================
console.log('\n--- PART 3: ADVERSARIAL TESTS A–H ---');

// Test A: Negative framing of risk-free (MUST PASS)
{
  const res = FinancialUncertaintyVerifier.verify(
    'Is any investment risk-free?',
    'Remember that no investment is risk-free.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test A: Negative framing ("no investment is risk-free") passes cleanly');
}

// Test B: Negation of guarantee (MUST PASS)
{
  const res = FinancialUncertaintyVerifier.verify(
    'Do you guarantee 8% growth?',
    'We cannot guarantee that your investments will grow at 8%.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test B: Negation of guarantee ("cannot guarantee") passes cleanly');
}

// Test C: Educational explanation of "guaranteed return" (MUST PASS)
{
  const res = FinancialUncertaintyVerifier.verify(
    'What are Treasury bills?',
    'Treasury bills offer what is often called a guaranteed return backed by the government, though inflation risk remains.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test C: Educational explanation of Treasury bills passes cleanly');
}

// Test D: Nested quotation of bad advice (MUST PASS)
{
  const res = FinancialUncertaintyVerifier.verify(
    'What should I look out for?',
    "Avoid anyone who tells you that 'this stock is a guaranteed winner with zero risk'.",
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test D: Warning quoting fraudulent advice passes cleanly');
}

// Test E: Compound sentence with valid facts and subtle overconfidence (MUST FAIL on second clause)
{
  const res = FinancialUncertaintyVerifier.verify(
    'What will happen to my balance?',
    'Your current balance is $5,000, and this strategy will certainly double it in 6 months.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'guaranteed_future_outcome'), 'Test E: Compound sentence flags second clause overconfidence');
}

// Test F: Sub-clause projection stated as certainty (MUST FAIL)
{
  const res = FinancialUncertaintyVerifier.verify(
    'What is next month looking like?',
    'While your spending is $2,000 today, you will certainly make $10,000 next month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'guaranteed_future_outcome'), 'Test F: Sub-clause projection stated as certainty fails');
}

// Test G: Sarcasm / colloquial exaggeration dismissal (MUST PASS)
{
  const res = FinancialUncertaintyVerifier.verify(
    'Will latte budgeting make me rich?',
    "Obviously you won't become a billionaire overnight by skipping one latte.",
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid && res.discrepancies.length === 0, 'Test G: Colloquial dismissal ("obviously you won\'t become a billionaire") passes cleanly');
}

// Test H: Multi-tier Deduplication Check
{
  const existingWarns = ['⚠️ Risk-free investment claims violate financial uncertainty standards'];
  const res = FinancialUncertaintyVerifier.verify(
    'Is this risk-free?',
    'This strategy is completely risk-free.',
    defaultContext,
    {},
    highConfidence,
    { existingWarnings: existingWarns }
  );
  assert(res.warnings.length === 0, 'Test H: Deduplication suppresses warnings already flagged by previous tiers');
}

// ============================================================================
// PART 4: LATENCY BENCHMARK (100 Verifications)
// ============================================================================
console.log('\n--- PART 4: LATENCY BENCHMARK ---');
const iterations = 100;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  FinancialUncertaintyVerifier.verify(
    'How should I budget my money next year?',
    'A common guideline is the 50/30/20 rule, which suggests allocating 50% to needs, and if your income remains constant at $4,000, you could save approximately $500 monthly.',
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
  console.log('ALL AI-2.6 UNCERTAINTY VERIFICATION TESTS PASSED SUCCESSFULLY.');
}
