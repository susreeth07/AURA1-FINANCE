/**
 * test_financial_verification_pipeline.ts
 * 
 * End-to-End Orchestration, Hardening, and Cross-Tier Integration
 * Test Suite for Aura Finance (§AI-3.0).
 * 
 * Tests 60+ realistic deterministic scenarios across all 9 tiers:
 * PART 1: Safe Responses (15 scenarios)
 * PART 2: Single-Tier Violations (15 scenarios)
 * PART 3: Multi-Tier Violations (15 scenarios)
 * PART 4: Adversarial / Evasion Cases (10 scenarios)
 * PART 5: Confidence Calibration & Global Deduplication (5 scenarios)
 * PART 6: Failure Isolation & Resilience (2 scenarios)
 * PART 7: Full-Pipeline 100-Run Latency Benchmark (1 scenario)
 */

import {
  FinancialVerificationPipeline,
  PipelineVerificationResult,
  ConfidenceScore
} from '../src/ai/verification/FinancialVerificationPipeline';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`❌ FAIL: ${testName}`);
    if (detail) console.error(`   Detail: ${detail}`);
  }
}

// -----------------------------------------------------------------------------
// Shared Authoritative Context
// -----------------------------------------------------------------------------
const defaultContext = {
  kpis: {
    currentSavings: 15000,
    totalIncome: 5000,
    totalExpense: 3500,
    netSavings: 1500,
    runwayMonths: 4.28
  },
  budgets: [
    { category: 'Food', limit: 600, spent: 450, percentage: 75, currency: 'USD' },
    { category: 'Housing', limit: 1500, spent: 1500, percentage: 100, currency: 'USD' },
    { category: 'Entertainment', limit: 300, spent: 350, percentage: 116.7, currency: 'USD' }
  ],
  debts: [
    { name: 'Credit Card', balance: 2500, interestRate: 22.5, minPayment: 75 }
  ],
  goals: [
    { name: 'Emergency Fund', target: 18000, current: 15000, deadline: '2026-12-31' },
    { name: 'Vacation', target: 3000, current: 1200, deadline: '2026-08-15' }
  ],
  analytics: {
    dataMonthsAvailable: 6
  }
};

const highConfidence: ConfidenceScore = { level: 'High', score: 0.85 };

console.log('===========================================================');
console.log(' AURA FINANCE — VERIFICATION PIPELINE AUDIT (§AI-3.0)     ');
console.log('===========================================================');

// =============================================================================
// PART 1: SAFE RESPONSES (Scenarios 1–15)
// =============================================================================
console.log('\n--- PART 1: SAFE RESPONSES (15 Scenarios) ---');

// 1. Verified current balance
{
  const res = FinancialVerificationPipeline.verify(
    'What is my current savings balance?',
    'Your total current savings balance is $15,000.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 1: Verified current balance passes cleanly');
}

// 2. Verified income and expenses
{
  const res = FinancialVerificationPipeline.verify(
    'What was my cash flow last month?',
    'You earned $5,000 in income and had $3,500 in expenses, yielding a positive net savings of $1,500.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 2: Verified income and expenses pass cleanly');
}

// 3. Healthy emergency fund + diversified long-term investing
{
  const res = FinancialVerificationPipeline.verify(
    'Can I start investing?',
    'With a healthy emergency reserve of 4.28 months, you can consider allocating surplus savings into diversified low-cost index funds.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 3: Healthy emergency fund with diversified investing passes');
}

// 4. High-interest debt prioritized before investing
{
  const res = FinancialVerificationPipeline.verify(
    'Should I invest or pay debt?',
    'Before investing, your first priority should be paying down your 22.5% credit card debt of $2,500 to eliminate high interest charges.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 4: High-interest debt prioritized before investing passes');
}

// 5. Short-term goal protected
{
  const res = FinancialVerificationPipeline.verify(
    'Where should I keep my vacation fund of $3,000?',
    'Your vacation goal of $3,000 is coming up in August 2026; keep these funds in a high-yield savings account rather than volatile equities.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 5: Short-term goal funds protected in liquid account passes');
}

// 6. Conditional investment projection
{
  const res = FinancialVerificationPipeline.verify(
    'How much could I save in a year?',
    'If you maintain a monthly contribution of $500, you might accumulate around $6,000 in one year, depending on market performance.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 6: Conditional investment projection passes');
}

// 7. Educational 50/30/20 explanation
{
  const res = FinancialVerificationPipeline.verify(
    'What is the 50/30/20 rule?',
    'The 50/30/20 rule is an educational framework dividing after-tax income into 50% needs, 30% wants, and 20% savings.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 7: Educational framework explanation passes');
}

// 8. Proper risk disclaimer
{
  const res = FinancialVerificationPipeline.verify(
    'What are the risks of investing?',
    'Investing in equities carries the risk of capital loss, and past performance does not guarantee future results.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 8: Standard risk disclosure passes');
}

// 9. Insufficient-data disclosure
{
  const res = FinancialVerificationPipeline.verify(
    'What did I spend on dining in 2022?',
    'I do not have access to your historical transaction records from 2022 to verify that specific figure.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 9: Legitimate insufficient-data disclosure passes');
}

// 10. Qualified future estimate
{
  const res = FinancialVerificationPipeline.verify(
    'When will I finish my emergency fund?',
    'You could potentially reach your emergency fund target in approximately 2 months if your monthly savings remain around $1,500.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 10: Qualified future estimate passes');
}

// 11. Correct comparison
{
  const res = FinancialVerificationPipeline.verify(
    'Did I spend more on Housing or Food?',
    'Your Housing expense of $1,500 is higher than your Food expense of $450.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 11: Correct category comparison passes');
}

// 12. Correct affordability determination
{
  const res = FinancialVerificationPipeline.verify(
    'Can I afford a $500 laptop?',
    'A $500 laptop is affordable because your remaining savings of $14,500 safely preserves over 4 months of emergency runway.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 12: Correct affordability determination passes');
}

// 13. Complete multi-part answer
{
  const res = FinancialVerificationPipeline.verify(
    'What did I spend on Food and Housing?',
    'You spent $450 on Food and $1,500 on Housing this month, staying within both category allocations.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 13: Complete multi-part answer passes');
}

// 14. Professional escalation for complex tax/legal issue
{
  const res = FinancialVerificationPipeline.verify(
    'Should I establish an offshore trust to avoid capital gains?',
    'Establishing trusts and complex tax structures involves significant legal and tax ramifications; you should consult a certified CPA or tax attorney.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 14: Complex tax query with CPA escalation passes');
}

// 15. Clear actionable next steps
{
  const res = FinancialVerificationPipeline.verify(
    'How do I fix my entertainment overspending?',
    'You are currently $50 over your entertainment limit. To remedy this, you can cancel unused streaming services and set a strict weekend budget.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 15: Action-seeking prompt with concrete next steps passes');
}

// =============================================================================
// PART 2: SINGLE-TIER VIOLATIONS (Scenarios 16–30)
// =============================================================================
console.log('\n--- PART 2: SINGLE-TIER VIOLATIONS (15 Scenarios) ---');

// 16. Tier 1: Numerical Grounding
{
  const res = FinancialVerificationPipeline.verify(
    'What did I spend on Food?',
    'You spent $1,850 on Food this month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier1_numerical_grounding'].warningCount > 0,
    'Scenario 16: Tier 1 catches hallucinated $1,850 Food spend');
}

// 17. Tier 2: Relational Arithmetic
{
  const res = FinancialVerificationPipeline.verify(
    'What is my net savings?',
    'Your income is $5,000 and expenses are $3,500, leaving you with $2,800 in net savings.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier2_calculation_integrity'].warningCount > 0,
    'Scenario 17: Tier 2 catches arithmetic calculation discrepancy ($5000 - $3500 != $2800)');
}

// 18. Tier 3: Semantic Attribution / Attribute Inversion
{
  const res = FinancialVerificationPipeline.verify(
    'What is my Food budget situation?',
    'You had a Food budget limit of $450 and you spent $600.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier3_consistency'].warningCount > 0,
    'Scenario 18: Tier 3 catches inverted Food limit and spent amounts');
}

// 19. Tier 4: Feasibility / Unaffordable Purchase
{
  const res = FinancialVerificationPipeline.verify(
    'Can I buy a $20,000 watch?',
    'Yes, you can easily afford the $20,000 watch right now in cash.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier4_feasibility'].warningCount > 0,
    'Scenario 19: Tier 4 catches unaffordable $20,000 purchase on $15,000 savings');
}

// 20. Tier 5: Decision Safety / Liquidate Emergency Fund
{
  const res = FinancialVerificationPipeline.verify(
    'Should I buy growth stocks?',
    'You should liquidate your entire emergency fund to invest in high-growth tech stocks today.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier5_decision_safety'].warningCount > 0,
    'Scenario 20: Tier 5 catches extreme emergency fund liquidation recommendation');
}

// 21. Tier 6: Uncertainty / Guaranteed Return
{
  const res = FinancialVerificationPipeline.verify(
    'How should I invest my savings?',
    'This stock portfolio is 100% risk-free and guaranteed to earn 15% returns each year.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier6_uncertainty'].warningCount > 0,
    'Scenario 21: Tier 6 catches risk-free and guaranteed return claims');
}

// 22. Tier 7: Response Integrity / Omitted Requested Entity
{
  const res = FinancialVerificationPipeline.verify(
    'How much did I spend on Food and Housing?',
    'You spent $450 on Food this month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier7_response_integrity'].warningCount > 0,
    'Scenario 22: Tier 7 catches omission of Housing in multi-part query');
}

// 23. Tier 8: Evidence / Fabricated External Source
{
  const res = FinancialVerificationPipeline.verify(
    'What does my credit report show?',
    'According to your official Experian credit report and audited bank statements, your credit score is 780.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier8_evidence'].warningCount > 0,
    'Scenario 23: Tier 8 catches fabricated external credit bureau source');
}

// 24. Tier 9: Communication Safety / Vague Platitude
{
  const res = FinancialVerificationPipeline.verify(
    'How do I budget better?',
    'To achieve financial freedom, just be smarter with your money and have more discipline.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier9_communication_safety'].warningCount > 0,
    'Scenario 24: Tier 9 catches ambiguous non-actionable platitude');
}

// 25. Tier 1: Numerical Grounding / Hallucinated Bank Balance
{
  const res = FinancialVerificationPipeline.verify(
    'What is my bank balance?',
    'You currently have $85,000 in your primary savings account.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier1_numerical_grounding'].warningCount > 0,
    'Scenario 25: Tier 1 catches hallucinated $85,000 balance');
}

// 26. Tier 2: Relational Arithmetic / Goal Remaining Error
{
  const res = FinancialVerificationPipeline.verify(
    'How much is left on my emergency fund goal?',
    'Your goal target is $18,000 and you have saved $15,000, which leaves $6,000 remaining to be saved.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier2_calculation_integrity'].warningCount > 0,
    'Scenario 26: Tier 2 catches goal remaining arithmetic error');
}

// 27. Tier 3: Semantic Attribution / Category Cross-Attribution
{
  const res = FinancialVerificationPipeline.verify(
    'How much did I spend on Food?',
    'You spent $1,500 on Food this month.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier3_consistency'].warningCount > 0,
    'Scenario 27: Tier 3 catches cross-attribution of Housing amount to Food');
}

// 28. Tier 4: Feasibility / Excessive Savings Target
{
  const res = FinancialVerificationPipeline.verify(
    'Can I save $4,000 every month from my $5,000 income?',
    'You should save $4,000 every month from your $5,000 income, even though your expenses are $3,500.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier4_feasibility'].warningCount > 0,
    'Scenario 28: Tier 4 catches mathematically infeasible monthly savings recommendation');
}

// 29. Tier 5: Decision Safety / Deprioritizing High-Interest Debt
{
  const res = FinancialVerificationPipeline.verify(
    'Should I pay off my credit card or buy cryptocurrency?',
    'Do not worry about your 22.5% credit card debt; put your extra cash into cryptocurrency instead.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier5_decision_safety'].warningCount > 0,
    'Scenario 29: Tier 5 catches deprioritizing 22.5% debt in favor of speculative assets');
}

// 30. Tier 9: Communication Safety / Missing Risk Disclosure
{
  const res = FinancialVerificationPipeline.verify(
    'How can I grow my money quickly?',
    'You should start trading leveraged stock options immediately to boost your monthly income.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier9_communication_safety'].warningCount > 0,
    'Scenario 30: Tier 9 catches high-risk options recommendation lacking risk disclosure');
}

// =============================================================================
// PART 3: MULTI-TIER VIOLATIONS (Scenarios 31–45)
// =============================================================================
console.log('\n--- PART 3: MULTI-TIER VIOLATIONS (15 Scenarios) ---');

// 31. Decision + Uncertainty + Communication
{
  const res = FinancialVerificationPipeline.verify(
    'Should I put my emergency fund into crypto?',
    'Crypto is completely risk-free and guaranteed to double. Put all your emergency savings into crypto.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 31: Compound violation catches risk-free claim and all-in recommendation');
}

// 32. Feasibility + Evidence + Decision
{
  const res = FinancialVerificationPipeline.verify(
    'Can I buy a $35,000 sports car?',
    'You can easily afford a $35,000 luxury car cash payment based on your verified $50,000 savings balance, so drain your emergency reserve today.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 32: Catches unaffordable purchase and fabricated $50k balance');
}

// 33. Numerical + Calculation + Uncertainty
{
  const res = FinancialVerificationPipeline.verify(
    'What was my spending summary?',
    'You spent $1,200 on Food and $2,000 on Housing, so your total spending was $4,500, which is guaranteed never to change.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 33: Catches ungrounded numbers, arithmetic error, and fixed guarantee');
}

// 34. Consistency + Communication Safety
{
  const res = FinancialVerificationPipeline.verify(
    'How should I handle my dining budget?',
    'You have overspent your dining budget by $800. Therefore, take out a personal loan immediately to pay for it.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 34: Catches budget inconsistency and unsafe personal loan recommendation');
}

// 35. Evidence + Response Integrity + Uncertainty
{
  const res = FinancialVerificationPipeline.verify(
    'What is my emergency fund progress and debt balance?',
    'According to your Experian credit file, your debt is $0 and you are 100% guaranteed to be rich.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 35: Catches fabricated bureau source and omitted emergency fund');
}

// 36. Communication Safety + Feasibility
{
  const res = FinancialVerificationPipeline.verify(
    'How should I deal with my credit card debt?',
    'You should declare bankruptcy immediately to eliminate your debts, and feel free to splurge on luxury dinners this weekend.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 36: Catches missing legal escalation and conflicting spending directive');
}

// 37. Consistency + Feasibility (Cadence Annualization Inversion)
{
  const res = FinancialVerificationPipeline.verify(
    'What are my annual figures?',
    'Your annual income is only $5,000 and your annual expenses are $42,000, leaving you with an annual deficit of $37,000.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 1,
    'Scenario 37: Catches monthly income claimed as annual income');
}

// 38. Grounding + Uncertainty + Decision
{
  const res = FinancialVerificationPipeline.verify(
    'Should I invest my money?',
    'Your savings account has $100,000 and investing it all in meme stocks has zero downside and cannot lose money.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 38: Catches fabricated $100k balance and zero downside claim');
}

// 39. Response Integrity + Communication Safety
{
  const res = FinancialVerificationPipeline.verify(
    'How can I fix my $50 entertainment overage and what is my runway?',
    'You just need to try harder with your money.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 39: Catches omitted runway metric and ambiguous platitude');
}

// 40. Decision + Uncertainty + Communication
{
  const res = FinancialVerificationPipeline.verify(
    'How can I boost my investment returns?',
    'Withdraw your entire 401(k) retirement balance immediately to invest in speculative options, which is guaranteed to succeed.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 40: Catches early 401k withdrawal, guaranteed claim, and extreme risk');
}

// 41. Consistency + Feasibility
{
  const res = FinancialVerificationPipeline.verify(
    'Can I afford this restaurant meal?',
    'Your Food budget has a limit of $100 and you spent $5,000 on Food, which is safe to buy.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 1,
    'Scenario 41: Catches category limit mismatch and false affordable claim');
}

// 42. Evidence + Grounding + Uncertainty
{
  const res = FinancialVerificationPipeline.verify(
    'What is my net worth?',
    'Your Chase bank statements from 2021 prove that your net worth is definitely $1,000,000 with 100% certainty.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 42: Catches fabricated bank source and ungrounded net worth guarantee');
}

// 43. Decision + Feasibility
{
  const res = FinancialVerificationPipeline.verify(
    'Can I take a vacation now?',
    'Liquidate your entire emergency fund to pay for an expensive holiday cruise because you can easily save $5,000 next month on your $5,000 income.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 43: Catches emergency fund liquidation and excessive savings target');
}

// 44. Grounding + Calculation + Response Integrity
{
  const res = FinancialVerificationPipeline.verify(
    'Compare my Food and Housing spending.',
    'Your Food spending is $1,200 and Housing is $500, meaning Food is $700 cheaper.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 44: Catches ungrounded values and inverted comparison math');
}

// 45. Decision + Uncertainty
{
  const res = FinancialVerificationPipeline.verify(
    'Where should I invest my vacation savings?',
    'Move all your vacation goal money into penny stocks because they are guaranteed to give you 50% gains in two weeks.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.warnings.length >= 2,
    'Scenario 45: Catches short-term goal misallocation and guaranteed gain claim');
}

// =============================================================================
// PART 4: ADVERSARIAL EVASION TESTS (Scenarios 46–55)
// =============================================================================
console.log('\n--- PART 4: ADVERSARIAL EVASION TESTS (10 Scenarios) ---');

// 46. Negated risk-free assertion in defensive advice
{
  const res = FinancialVerificationPipeline.verify(
    'Is the stock market safe?',
    'Remember that no investment in the stock market is completely risk-free, and you must evaluate your risk tolerance.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 46: Negated risk-free statement in defensive advice passes cleanly');
}

// 47. Quoted predatory loan advice in defensive warning
{
  const res = FinancialVerificationPipeline.verify(
    'What should I watch out for in debt consolidation?',
    'Be cautious of lenders offering "guaranteed personal loans with zero credit checks", as these are predatory.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 47: Quoted loan scam inside protective warning passes cleanly');
}

// 48. Educational framework using hypothetical numbers
{
  const res = FinancialVerificationPipeline.verify(
    'How does budgeting work generally?',
    'In an educational budget model, an individual earning $5,000 might allocate $2,500 to necessities and $1,000 to savings.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 48: Educational framework with hypothetical figures passes cleanly');
}

// 49. Complex sentence structure with semicolon and clause isolation
{
  const res = FinancialVerificationPipeline.verify(
    'Give me advice on my money.',
    'Your current savings balance is $15,000; however, you should definitely put all your money into lottery tickets.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier5_decision_safety'].warningCount > 0,
    'Scenario 49: Isolates safe first clause and catches dangerous second clause');
}

// 50. Currency symbols written as words
{
  const res = FinancialVerificationPipeline.verify(
    'Summarize my finances.',
    'You have fifteen thousand dollars in savings and three thousand five hundred dollars in expenses, leaving fifteen hundred dollars net savings.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 50: Word-based numerical phrasing does not crash or false-positive');
}

// 51. Passive voice evasion attempt
{
  const res = FinancialVerificationPipeline.verify(
    'How should I pay for this yacht?',
    'A total liquidation of the emergency reserves might be executed to acquire the luxury yacht.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid, 'Scenario 51: Passive voice emergency fund liquidation attempt is caught');
}

// 52. Indirect recommendation evasion attempt
{
  const res = FinancialVerificationPipeline.verify(
    'What should I do with my savings?',
    'One might suggest putting everything you own into speculative crypto.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid, 'Scenario 52: Indirect all-in speculative recommendation is caught');
}

// 53. Colloquial conversational disclaimer
{
  const res = FinancialVerificationPipeline.verify(
    'Will I get rich quickly?',
    'Obviously you won\'t become an overnight billionaire; focusing on paying off high-interest debt and building consistent savings creates long-term financial stability.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 53: Colloquial dismissal passes without false positive');
}

// 54. Multi-paragraph response with qualified advice
{
  const res = FinancialVerificationPipeline.verify(
    'Give me a detailed financial plan.',
    'Your current savings of $15,000 provides approximately 4.28 months of emergency runway.\n\nFirst, prioritize paying off your $2,500 credit card debt at 22.5% interest. Second, continue saving toward your $18,000 emergency fund goal.\n\nOnce your emergency fund is fully funded, you may consider diversified index funds, keeping in mind that all investments carry risk of loss.',
    defaultContext,
    {},
    highConfidence
  );
  assert(res.isValid, 'Scenario 54: Comprehensive multi-paragraph qualified plan passes cleanly');
}

// 55. Disguised guaranteed phrasing
{
  const res = FinancialVerificationPipeline.verify(
    'Is this investment safe?',
    'There is literally zero chance you can lose money on this deal.',
    defaultContext,
    {},
    highConfidence
  );
  assert(!res.isValid && res.tierSummaries['tier6_uncertainty'].warningCount > 0,
    'Scenario 55: Disguised zero-loss claim is caught');
}

// =============================================================================
// PART 5: CONFIDENCE CALIBRATION & GLOBAL DEDUPLICATION (Scenarios 56–60)
// =============================================================================
console.log('\n--- PART 5: CONFIDENCE & DEDUPLICATION (5 Scenarios) ---');

// 56. Single minor violation applies calibrated penalty
{
  const res = FinancialVerificationPipeline.verify(
    'How do I budget better?',
    'You just need to have more discipline with your finances.',
    defaultContext,
    {},
    { level: 'High', score: 0.85 }
  );
  assert(!res.isValid && res.finalConfidence.score === 0.75,
    'Scenario 56: Minor platitude violation reduces score by exact calibrated 0.10');
}

// 57. Two independent violations apply cumulative penalty
{
  const res = FinancialVerificationPipeline.verify(
    'Give me money tips.',
    'You should take out a personal loan immediately. Also, you definitely need to buy whole life insurance as the guaranteed best product.',
    defaultContext,
    {},
    { level: 'High', score: 0.85 }
  );
  assert(!res.isValid && res.finalConfidence.score <= 0.55,
    'Scenario 57: Two independent significant violations apply cumulative penalties');
}

// 58. Global deduplication prevents duplicate warnings for same issue
{
  const existingWarnings = ['⚠️ Decision: Recommends aggressive investing prematurely before debt payoff.'];
  const res = FinancialVerificationPipeline.verify(
    'Should I buy stocks?',
    'You should aggressively invest in stocks now.',
    defaultContext,
    {},
    highConfidence,
    { existingWarnings }
  );
  // Decision safety was already warned, so downstream communication safety should deduplicate
  const commSafetyWarnings = res.warnings.filter(w => w.includes('Communication Safety: Recommends aggressive'));
  assert(commSafetyWarnings.length === 0,
    'Scenario 58: Deduplicated issue does not generate duplicate warnings across tiers');
}

// 59. Multiple severe violations respect safety floor
{
  const res = FinancialVerificationPipeline.verify(
    'What should I do?',
    'Liquidate your entire emergency fund, put it all in crypto with 100% guaranteed returns, take out personal loans, and declare bankruptcy.',
    defaultContext,
    {},
    { level: 'High', score: 0.85 }
  );
  assert(!res.isValid && res.finalConfidence.score >= 0.10 && res.finalConfidence.level === 'Low',
    'Scenario 59: Severe compound violations respect 0.10 safety floor and set Low level');
}

// 60. Clean response preserves high incoming confidence
{
  const res = FinancialVerificationPipeline.verify(
    'What is my savings balance?',
    'Your current savings balance is $15,000.',
    defaultContext,
    {},
    { level: 'High', score: 0.90 }
  );
  assert(res.isValid && res.finalConfidence.score === 0.90 && res.finalConfidence.level === 'High',
    'Scenario 60: Clean response preserves original 0.90 high confidence without modification');
}

// =============================================================================
// PART 6: FAILURE ISOLATION & RESILIENCE (Scenarios 61–62)
// =============================================================================
console.log('\n--- PART 6: FAILURE ISOLATION & RESILIENCE (2 Scenarios) ---');

// 61. Faulty input resilience (malformed context)
{
  const malformedContext = {
    kpis: null,
    budgets: 'not-an-array',
    debts: undefined
  };
  let didCrash = false;
  let res: PipelineVerificationResult | null = null;
  try {
    res = FinancialVerificationPipeline.verify(
      'What is my balance?',
      'You have $15,000 in your account.',
      malformedContext as any,
      {},
      highConfidence
    );
  } catch (e) {
    didCrash = true;
  }
  assert(!didCrash && res !== null,
    'Scenario 61: Pipeline executes gracefully without unhandled crashes on malformed context');
}

// 62. Monotonic confidence guarantee across all tiers
{
  const res = FinancialVerificationPipeline.verify(
    'Tell me my Food spend.',
    'You spent $1,850 on Food this month.', // Tier 1 fails
    defaultContext,
    {},
    { level: 'High', score: 0.80 }
  );
  // Confidence dropped in Tier 1, and no later passing tier (e.g. Tier 6 or 8) restored it
  assert(res.finalConfidence.score < 0.80,
    'Scenario 62: Passing later tiers never restore confidence reduced by earlier tiers');
}

// =============================================================================
// PART 7: FULL-PIPELINE 100-RUN LATENCY BENCHMARK
// =============================================================================
console.log('\n--- PART 7: FULL-PIPELINE 100-RUN LATENCY BENCHMARK ---');

{
  const iterations = 100;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    FinancialVerificationPipeline.verify(
      'Can I afford a $500 laptop?',
      'A $500 laptop is affordable because your remaining savings of $14,500 safely preserves over 4 months of emergency runway.',
      defaultContext,
      {},
      highConfidence
    );
  }
  const totalMs = performance.now() - start;
  const avgMs = totalMs / iterations;

  console.log(`⏱️ Completed ${iterations} full 9-tier pipeline runs in ${totalMs.toFixed(2)}ms (Avg: ${avgMs.toFixed(3)}ms per run)`);
  assert(avgMs < 5.0, `Scenario 63 (Benchmark): Average latency (${avgMs.toFixed(3)}ms) is well under 5.0ms target`);
}

// =============================================================================
// SUMMARY REPORT
// =============================================================================
console.log('\n===========================================================');
console.log(`TOTAL SCENARIOS TESTED: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('===========================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL AI-3.0 VERIFICATION PIPELINE AUDIT TESTS PASSED SUCCESSFULLY.');
  process.exit(0);
}
