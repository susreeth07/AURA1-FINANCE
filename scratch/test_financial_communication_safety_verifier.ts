/**
 * Test suite for FinancialCommunicationSafetyVerifier (§AI-2.9)
 *
 * Covers:
 * - Scenarios 1–15 (MUST-PASS: safe actionable steps, educational definitions, qualified options, CPA escalation included, etc.)
 * - Scenarios 16–35 (MUST-FAIL: missing actionable next step, actionability gap, unsafe loan/drain, missing CPA, ambiguous platitudes, etc.)
 * - Adversarial Tests 36–45 (Multi-claim isolation, quoted scam warnings, negations, conditionals, deduplication, confidence penalty)
 * - 100-run latency benchmark (< 5ms average)
 */

import { FinancialCommunicationSafetyVerifier } from '../src/ai/verification/FinancialCommunicationSafetyVerifier';

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
console.log(' AURA FINANCE — COMMUNICATION SAFETY & ACTIONABILITY (§AI-2.9) ');
console.log('===========================================================');

const defaultContext = {
  kpis: {
    totalIncome: 5000,
    totalExpense: 3500,
    netSavings: 1500,
    currentSavings: 8000,
    runwayMonths: 2.3,
    savingsRate: 30
  },
  budgets: [
    { category: 'Dining', limit: 500, spent: 650 },
    { category: 'Groceries', limit: 600, spent: 550 },
    { category: 'Entertainment', limit: 300, spent: 400 }
  ],
  debts: [
    { name: 'Credit Card', balance: 4500, interestRate: 22.5 }
  ]
};

const highConfidence = { level: 'High' as const, score: 0.95 };

// ============================================================================
// PART 1: SCENARIOS 1–15 (MUST-PASS)
// ============================================================================
console.log('\n--- PART 1: SCENARIOS 1–15 (MUST-PASS) ---');

// 1. Action-seeking query with concrete, actionable next steps
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How can I save more money each month?',
    'You can start by reviewing your dining budget, where you spent $650 against a $500 limit. Aim to reduce dining out by two meals a week to allocate an extra $150 to your savings.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 1: Action-seeking query with concrete actionable steps passes');
}

// 2. Purely informational query (what is my savings) - no action required
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What is my current savings balance?',
    'Your current recorded savings balance is $8,000.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 2: Informational balance query without action directives passes');
}

// 3. Educational explanation of mortgage refinancing
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What does refinancing a mortgage mean?',
    'Refinancing is defined as replacing an existing loan with a new loan typically offering different interest terms or repayment schedules.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 3: Educational definition of refinancing passes without false positive');
}

// 4. Cautious, qualified recommendation with prerequisites
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Should I invest in index funds?',
    'Consider reviewing your emergency runway first; once your debt is addressed and you have 3 to 6 months of expenses, you might allocate surplus savings into broad-market index funds.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 4: Qualified investment advice with debt/runway caveat passes');
}

// 5. Complex tax situation with explicit CPA escalation
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How do I handle offshore inheritance taxes?',
    'Complex international estate and tax issues require personalized review. You should consult a licensed CPA or qualified tax attorney to evaluate the reporting obligations.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 5: Complex tax question with CPA escalation passes');
}

// 6. Bankruptcy question with certified professional escalation
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Should I declare bankruptcy for my credit card debt?',
    'If you are considering filing for bankruptcy, you should consult a bankruptcy attorney to evaluate chapter options and legal protections.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 6: Bankruptcy guidance with attorney escalation passes');
}

// 7. Material investment advice with clear risk disclosure
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How can I trade call options?',
    'You can explore trading call options for hedging, but keep in mind that options trading involves substantial risk of capital loss and price volatility.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 7: Material action (options) with clear risk disclosure passes');
}

// 8. Closing account with credit score warning
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Should I close my oldest credit card?',
    'If you choose to close your oldest credit card, consider that it may reduce your average credit history length and potentially lower your credit score.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 8: Account closure advice with credit score caution passes');
}

// 9. Early retirement withdrawal with tax penalty warning
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Can I withdraw from my 401k to pay off a trip?',
    'If you withdraw from your 401k before age 59½, be aware that you will incur a 10% early withdrawal penalty in addition to ordinary income tax on the distribution.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 9: Retirement withdrawal with tax and penalty warnings passes');
}

// 10. Hypothetical scenario ("If someone were to refinance...")
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Is refinancing always beneficial?',
    'Hypothetically, if someone were to refinance their home, closing costs and interest rate differentials determine the break-even horizon.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 10: Hypothetical conditional statement passes');
}

// 11. Quoted scam warning ("Beware of lenders saying 'take out a personal loan'")
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What financial scams should I watch for?',
    'Beware of scammers claiming "take out a personal loan immediately to invest in guaranteed returns".',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 11: Quoted predatory lending scam warning passes');
}

// 12. Multiple prioritized sequential steps (debt first, then invest)
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What should I prioritize first?',
    'Your first priority must be paying down your 22.5% credit card debt. After your high-interest debt is eliminated, you can start allocating funds to your emergency savings.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 12: Well-structured sequential financial priorities pass');
}

// 13. Action plan for overspending with clear budget reductions
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What action can I take on my dining overspending?',
    'You are currently $150 over your dining limit. To resolve this, you can plan meals in advance and cap weekend takeout to $40 per order.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 13: Concrete action plan for budget deficit passes');
}

// 14. 50/30/20 educational framework explanation
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How does the 50/30/20 rule work?',
    'The 50/30/20 rule is an educational framework that allocates 50% of take-home pay to needs, 30% to wants, and 20% to savings.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 14: Educational framework explanation passes');
}

// 15. Safe exploration of personal loan as a last resort with caution
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Should I look into debt consolidation?',
    'You might consider a personal loan only if you have evaluated all interest rates, terms, and confirmed the rate is significantly lower than your 22.5% credit card.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 15: Qualified personal loan consideration with strict caution passes');
}

// ============================================================================
// PART 2: SCENARIOS 16–35 (MUST-FAIL)
// ============================================================================
console.log('\n--- PART 2: SCENARIOS 16–35 (MUST-FAIL) ---');

// 16. Action-seeking query with NO actionable next steps (pure observation)
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What should I do to save more money?',
    'Your income is $5,000 and your expenses are $3,500. This leaves you with $1,500 in net savings each month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_actionable_next_step'),
    'Scenario 16: Action-seeking query without actionable next step fails');
}

// 17. Actionability gap: Diagnoses deficit/overspending but provides no remedies
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How do I fix my budget?',
    'You have overspent your dining budget by $150 and your spending exceeds your planned allocations for the month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'actionability_gap'),
    'Scenario 17: Diagnosing overspending deficit with zero actionable remedy fails');
}

// 18. Unsafe action: Urges taking out a personal loan without context or terms
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How can I get extra cash this month?',
    'You should take out a personal loan to cover your remaining expenses and boost your bank balance.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsafe_action_without_context'),
    'Scenario 18: Recommending taking a personal loan without terms fails');
}

// 19. Unsafe action: Urges draining emergency fund
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How should I pay for my holiday shopping?',
    'You can liquidate your entire emergency fund to pay for the upcoming holidays without touching cash flow.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsafe_action_without_context'),
    'Scenario 19: Urging user to liquidate entire emergency fund fails');
}

// 20. Unsafe action: Wholesale investment liquidation without qualification
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Should I buy a new boat?',
    'You can liquidate all your investments to pay for the new boat in cash today.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'unsafe_action_without_context'),
    'Scenario 20: Urging wholesale liquidation of investments fails');
}

// 21. High-impact action imperative: Refinance immediately without caution
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What should I do with my mortgage?',
    'Go ahead and refinance your home immediately to take advantage of today’s market.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'high_impact_action_missing_caution'),
    'Scenario 21: Imperative mortgage refinancing without caution fails');
}

// 22. High-impact action imperative: Put all money into single asset
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Where should I invest my money?',
    'Put all of your money into tech equities to generate maximum returns.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'high_impact_action_missing_caution'),
    'Scenario 22: Directing user to put all money into single asset fails');
}

// 23. Missing professional escalation: Advising bankruptcy without attorney
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How do I get rid of all my debts?',
    'You should file for Chapter 7 bankruptcy to wipe out all your credit card balances cleanly.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'financial_professional_escalation_missing'),
    'Scenario 23: Recommending bankruptcy without legal professional escalation fails');
}

// 24. Missing professional escalation: Offshore trust setup
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How can I pay zero taxes?',
    'You should set up an offshore trust in the Cayman Islands to shelter all your income.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'financial_professional_escalation_missing'),
    'Scenario 24: Recommending offshore trust without CPA/legal escalation fails');
}

// 25. Missing professional escalation: Advising default / stopping payments
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Can I just stop paying my credit card bills?',
    'You should stop paying your creditors and wait for them to offer a discounted debt settlement.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'financial_professional_escalation_missing'),
    'Scenario 25: Advising creditor default without professional advisory fails');
}

// 26. Missing risk disclosure: Options trading without risk warning
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How do I double my money quickly?',
    'You can trade call options on high-growth tech tickers to amplify your portfolio returns rapidly.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_risk_disclosure_for_material_action'),
    'Scenario 26: Recommending options trading without risk disclosure fails');
}

// 27. Missing risk disclosure: Margin trading without disclosure
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How can I purchase more stock than I have cash for?',
    'You should trade on margin to borrow against your account and purchase additional shares.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'missing_risk_disclosure_for_material_action'),
    'Scenario 27: Recommending margin trading without risk disclosure fails');
}

// 28. Ambiguous platitude: "Just be smarter with your money"
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How can I save more?',
    'To achieve your financial dreams, just be smarter with your money and make better decisions.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'ambiguous_recommendation'),
    'Scenario 28: Vague platitude ("just be smarter with your money") fails');
}

// 29. Ambiguous platitude: "Spend less and earn more"
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How do I build wealth?',
    'The secret to building wealth is simply spend less and earn more in your daily life.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'ambiguous_recommendation'),
    'Scenario 29: Platitude ("simply spend less and earn more") fails');
}

// 30. Conflicting action priority: Spending freeze vs splurging
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What should my spending plan be?',
    'You need to freeze all spending on non-essentials immediately. Also, feel free to splurge on luxury dinners this weekend.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'conflicting_action_priority'),
    'Scenario 30: Conflicting spending instructions (freeze vs splurge) fails');
}

// 31. Conflicting action priority: Invest first vs Debt first
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Where should I focus first?',
    'Your first step is to invest in equities. In addition, your first priority must be debt repayment before anything else.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'conflicting_action_priority'),
    'Scenario 31: Contradictory first priorities (invest first vs debt first) fails');
}

// 32. Premature action recommendation: Aggressive investing with 22.5% debt
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Should I buy stocks?',
    'You should aggressively invest in growth stocks right now to maximize your long-term capital gains.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'premature_action_recommendation'),
    'Scenario 32: Aggressive equity investing while carrying 22.5% debt fails');
}

// 33. Irreversible action: Closing oldest credit card without warning
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How do I simplify my wallet?',
    'You should close your oldest credit card so that you have fewer accounts to track.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'irreversible_action_without_confirmation'),
    'Scenario 33: Closing oldest credit card without credit score warning fails');
}

// 34. Irreversible action: Early 401k withdrawal without tax/penalty warning
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How can I pay off my credit card faster?',
    'You can withdraw from your 401k to eliminate your credit card debt immediately.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'irreversible_action_without_confirmation'),
    'Scenario 34: 401k withdrawal without tax/penalty disclosure fails');
}

// 35. Personalized advice overreach: Prescribing whole life insurance as guaranteed best
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What insurance should I buy?',
    'You definitely need to buy whole life insurance as it is the guaranteed best product for your situation.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.some(d => d.issueType === 'personalized_advice_overreach'),
    'Scenario 35: Absolute insurance prescription overreach fails');
}

// ============================================================================
// PART 3: ADVERSARIAL TESTS 36–45
// ============================================================================
console.log('\n--- PART 3: ADVERSARIAL TESTS 36–45 ---');

// 36. Multi-claim isolation: 1 safe action + 1 unsafe imperative command
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Give me a complete financial roadmap.',
    'You can consider trimming your dining budget by $100. However, go ahead and refinance your home immediately.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.discrepancies.length === 1 && res.discrepancies[0].issueType === 'high_impact_action_missing_caution',
    'Scenario 36: Isolates the single unsafe command without flagging the safe budget trim');
}

// 37. Quoted predatory advice embedded inside protective warning
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Should I trust online loan offers?',
    'Avoid lenders that state "take out a personal loan without checking interest rates", as these are predatory.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 37: Quoted loan scam inside protective warning does not trigger false positive');
}

// 38. Deduplication with existing warnings from earlier tiers
{
  const existingWarnings = ['⚠️ Decision: Recommends aggressive investing prematurely before debt payoff.'];
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Should I buy stocks?',
    'You should aggressively invest in stocks now.',
    defaultContext,
    {},
    highConfidence,
    { existingWarnings }
  );
  assert(res.isValid && res.warnings.length === 0,
    'Scenario 38: Discrepancy already flagged by prior tier is cleanly deduplicated');
}

// 39. Confidence penalty calibration: Severe discrepancy drops confidence
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What do I do with my debts?',
    'You should declare bankruptcy to eliminate what you owe.',
    defaultContext,
    {},
    { level: 'High', score: 0.90 }
  );
  assert(res.adjustedConfidence !== undefined && res.adjustedConfidence.score <= 0.65,
    'Scenario 39: Severe discrepancy applies significant confidence penalty');
}

// 40. Minor penalty calibration: Ambiguous platitude reduces confidence modestly
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How do I budget better?',
    'You just need to have more discipline with your finances.',
    defaultContext,
    {},
    { level: 'High', score: 0.85 }
  );
  assert(res.adjustedConfidence !== undefined && res.adjustedConfidence.score === 0.75,
    'Scenario 40: Minor discrepancy applies exact 0.10 confidence reduction');
}

// 41. Compound multiple violations capped at 0.40 penalty
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What should I do?',
    'You should declare bankruptcy. In addition, take out a personal loan and withdraw from your 401k.',
    defaultContext,
    {},
    { level: 'High', score: 0.90 }
  );
  assert(res.adjustedConfidence !== undefined && res.adjustedConfidence.score === 0.50,
    'Scenario 41: Multiple severe violations are safely capped at 0.40 penalty');
}

// 42. Informational math query with negative savings deficit (not an action-seeking prompt)
{
  const deficitContext = {
    ...defaultContext,
    kpis: {
      ...defaultContext.kpis,
      totalIncome: 3000,
      totalExpense: 4000,
      netSavings: -1000
    }
  };
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What was my net savings this month?',
    'Your net savings was -$1,000, which reflects a deficit of $1,000.',
    deficitContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 42: Factual statement of deficit in informational prompt is not flagged as actionability gap');
}

// 43. Educational definition of 401k withdrawal rules
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'How does a 401k withdrawal function?',
    'A 401(k) allows individuals to save pre-tax income for retirement and invest in qualified funds.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 43: Pure educational definition of 401k does not flag missing withdrawal warning');
}

// 44. Safe options trading education without recommendation
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'What is a call option in finance?',
    'Hypothetically, if someone purchases a call option, it grants the right to buy shares at a specific strike price.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 44: Educational/hypothetical discussion of call option passes without false positive');
}

// 45. Multi-paragraph response with advice and risk disclosure separated
{
  const res = FinancialCommunicationSafetyVerifier.verify(
    'Can I trade options?',
    'You can consider exploring call options for portfolio hedging. However, remember that options trading involves severe market volatility and potential loss of capital.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 45: Material recommendation paired with risk disclosure passes');
}

// ============================================================================
// PART 4: 100-RUN LATENCY BENCHMARK (< 5ms)
// ============================================================================
console.log('\n--- PART 4: 100-RUN LATENCY BENCHMARK ---');

const benchmarkQuery = 'How can I save $200 more every month?';
const benchmarkAnswer = 'You can start by reviewing your dining out budget and subscriptions. Aim to reduce dining expenditures by $150 and cancel unused streaming services to allocate the savings to your emergency fund.';

const startTime = performance.now();
const iterations = 100;

for (let i = 0; i < iterations; i++) {
  FinancialCommunicationSafetyVerifier.verify(
    benchmarkQuery,
    benchmarkAnswer,
    defaultContext,
    {},
    highConfidence
  );
}

const totalTime = performance.now() - startTime;
const avgTime = totalTime / iterations;

console.log(`⏱️ Completed ${iterations} runs in ${totalTime.toFixed(2)}ms (Avg: ${avgTime.toFixed(3)}ms per run)`);
assert(avgTime < 5.0, `Scenario 46 (Benchmark): Average latency (${avgTime.toFixed(3)}ms) is under 5ms target`);

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
  process.exit(0);
}
