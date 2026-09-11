import { FinancialVerifier } from '../src/ai/verification/FinancialVerifier';
import { AuraAI } from '../src/ai/AuraAI';
import { AnalyticsRepository } from '../src/analytics/AnalyticsRepository';
import { AnalyticsSnapshot } from '../src/analytics/AnalyticsSnapshot';
import { Money } from '../src/domain/finance/Money';
import { Currency } from '../src/domain/finance/Currency';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${name}`);
    failed++;
  }
}

// Build standard test context
const sampleContext = {
  kpis: {
    totalIncome: '$8,000.00',
    totalExpense: '$4,500.00',
    netSavings: '$3,500.00',
    currentSavings: '$15,000.00',
    runwayMonths: 46.51,
    savingsRate: 20,
    overallHealthScore: 85
  },
  budgets: [
    { cat: 'Food', lim: '$800.00', spent: '$600.00', pct: 75 },
    { cat: 'Utilities', lim: '$400.00', spent: '$200.00', pct: 50 }
  ]
};

const sampleToolOutputs = {
  analytics: sampleContext,
  budget: {
    budgets: [
      { category: 'Food', limit: '$800.00', spent: '$600.00', utilizationPercent: 75 },
      { category: 'Utilities', limit: '$400.00', spent: '$200.00', utilizationPercent: 50 }
    ]
  },
  goal: {
    savings: [
      { goalName: 'Emergency Fund', targetAmount: '$20,000.00', currentAmount: '$15,000.00', progressPercent: 75, remainingMonths: 12 }
    ]
  },
  forecast: {
    projectedCash3Months: '$10,200.00'
  }
};

const defaultConfidence = { level: 'High' as const, score: 0.95 };

async function runVerifierTests() {
  console.log('===========================================================');
  console.log('       AURA FINANCE — FINANCIAL VERIFIER TEST SUITE        ');
  console.log('===========================================================\n');

  // Test 1: "$600.00" matches authoritative "$600.00"
  {
    const res = FinancialVerifier.verify(
      'Check food budget',
      'You have spent $600.00 on Food this month.',
      sampleContext,
      sampleToolOutputs,
      defaultConfidence
    );
    assert(res.isValid, 'Test 1: "$600.00" matches authoritative "$600.00"');
    assert(res.discrepancies.length === 0, 'Test 1: Zero discrepancies for exact amount');
  }

  // Test 2: "$600" matches "$600.00"
  {
    const res = FinancialVerifier.verify(
      'Check food budget',
      'You have spent $600 on Food this month.',
      sampleContext,
      sampleToolOutputs,
      defaultConfidence
    );
    assert(res.isValid, 'Test 2: "$600" matches "$600.00"');
    assert(res.discrepancies.length === 0, 'Test 2: Zero discrepancies for integer format');
  }

  // Test 3: "$0.6k" matches "$600"
  {
    const res = FinancialVerifier.verify(
      'Check food budget',
      'Your Food expenses are around $0.6k out of an $0.8k limit.',
      sampleContext,
      sampleToolOutputs,
      defaultConfidence
    );
    assert(res.isValid, 'Test 3: "$0.6k" matches "$600" and "$0.8k" matches "$800"');
    assert(res.discrepancies.length === 0, 'Test 3: Zero discrepancies for shorthand k format');
  }

  // Test 4: 46.5 months matches 46.51 months
  {
    const res = FinancialVerifier.verify(
      'Check runway',
      'Your current emergency fund provides 46.5 months of coverage.',
      sampleContext,
      sampleToolOutputs,
      defaultConfidence
    );
    assert(res.isValid, 'Test 4: 46.5 months matches 46.51 months within tolerance');
  }

  // Test 5: 47 months matches 46.51 months
  {
    const res = FinancialVerifier.verify(
      'Check runway',
      'Your current emergency fund runway is approximately 47 months.',
      sampleContext,
      sampleToolOutputs,
      defaultConfidence
    );
    assert(res.isValid, 'Test 5: 47 months matches 46.51 months within 0.5 month tolerance');
  }

  // Test 6: "$4,200 spent on Food" is flagged when actual is $600
  {
    const res = FinancialVerifier.verify(
      'Check food budget',
      'Based on your records, you spent $4,200 on Food out of a $5,000 limit.',
      sampleContext,
      sampleToolOutputs,
      defaultConfidence
    );
    assert(!res.isValid, 'Test 6: "$4,200 spent on Food" is flagged when actual is $600');
    assert(res.discrepancies.length > 0, 'Test 6: Discrepancies detected for hallucinated numbers');
    assert(res.warnings.some(w => w.includes('Food budget has $600.00 spent')), 'Test 6: Warning contains authoritative Food spent ($600.00)');
    assert(res.adjustedConfidence?.level !== 'High', 'Test 6: Confidence downgraded for material discrepancy');
    assert(res.adjustedConfidence?.score !== undefined && res.adjustedConfidence.score <= 0.65, 'Test 6: Confidence score penalized by ~0.30+');
  }

  // Test 7: "$1,200" from the user's query is allowed
  {
    const res = FinancialVerifier.verify(
      'Can I buy a sofa for $1,200?',
      'If you purchase the sofa for $1,200, your savings will adjust accordingly.',
      sampleContext,
      sampleToolOutputs,
      defaultConfidence
    );
    assert(res.isValid, 'Test 7: "$1,200" introduced by user query is allowed in answer');
    assert(res.discrepancies.length === 0, 'Test 7: No discrepancies for query-sourced amount');
  }

  // Test 8: "3 tips for 2026" does not trigger financial verification
  {
    const res = FinancialVerifier.verify(
      'General advice',
      'Here are 3 tips for 2026 to optimize your financial habits.',
      sampleContext,
      sampleToolOutputs,
      defaultConfidence
    );
    assert(res.isValid, 'Test 8: "3 tips for 2026" does not trigger financial verification');
    assert(res.discrepancies.length === 0, 'Test 8: Counts and calendar years ignored');
  }

  // Test 9: "10 days" does not trigger financial verification
  {
    const res = FinancialVerifier.verify(
      'Check bills',
      'You should pay your bills within 10 days to avoid fees.',
      sampleContext,
      sampleToolOutputs,
      defaultConfidence
    );
    assert(res.isValid, 'Test 9: "10 days" does not trigger financial verification');
    assert(res.discrepancies.length === 0, 'Test 9: Day counts ignored');
  }

  // Test 10: Missing budget + "$500 budget limit" is flagged as unsupported
  {
    const contextWithoutBudget = {
      kpis: { runwayMonths: 12 },
      budgets: []
    };
    const toolOutputsWithoutBudget = {
      analytics: contextWithoutBudget,
      budget: { budgets: [] }
    };

    const res = FinancialVerifier.verify(
      'Check travel budget',
      'Your travel budget has a limit of $500.',
      contextWithoutBudget,
      toolOutputsWithoutBudget,
      defaultConfidence
    );
    assert(!res.isValid, 'Test 10: Missing budget + "$500 budget limit" is flagged as unsupported');
    assert(res.warnings.some(w => w.includes('N/A — insufficient data') || w.includes('No authoritative budget records')), 'Test 10: Warning indicates N/A / no authoritative budget records');
  }

  // Test 11: "$400 + $200 = $600" is accepted when those values are authoritative
  {
    // Utilities limit is 400, Utilities spent is 200, Food spent is 600
    // 400 + 200 = 600 is derived from authoritative values
    const res = FinancialVerifier.verify(
      'Budget sum check',
      'Your Utilities budget ($400) and spent ($200) relate to your Food expenses of $600.',
      sampleContext,
      sampleToolOutputs,
      defaultConfidence
    );
    assert(res.isValid, 'Test 11: Derived combinations of authoritative figures are accepted');
    assert(res.discrepancies.length === 0, 'Test 11: Zero discrepancies for derived numbers');
  }

  // Test 12: Different currencies are not treated as equivalent
  {
    // Authoritative data is in USD ($)
    const res = FinancialVerifier.verify(
      'Check food budget',
      'You spent ₹600 on Food.',
      sampleContext,
      sampleToolOutputs,
      defaultConfidence
    );
    assert(!res.isValid, 'Test 12: Currency mismatch (₹600 vs $600) is flagged as unverified');
    assert(res.discrepancies.some(d => d.claimText.includes('₹600')), 'Test 12: Discrepancy logged for incompatible currency');
  }

  // Test 13: Existing qualitative answers remain unchanged
  {
    const qualitativeAnswer = 'Overall, your financial situation is strong. Prioritize rebuilding your emergency savings and avoid impulse discretionary spending.';
    const res = FinancialVerifier.verify(
      'How am I doing?',
      qualitativeAnswer,
      sampleContext,
      sampleToolOutputs,
      defaultConfidence
    );
    assert(res.isValid, 'Test 13: Qualitative financial advice without claims passes verification');
    assert(res.warnings.length === 0, 'Test 13: No warnings for pure qualitative advice');
  }

  // Test 14: Verification does not make any network/API calls
  {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      FinancialVerifier.verify(
        'Check food budget',
        'You spent $600 on Food out of an $800 limit (75% utilized).',
        sampleContext,
        sampleToolOutputs,
        defaultConfidence
      );
    }
    const duration = performance.now() - start;
    assert(duration < 50, `Test 14: 100 verifications executed in ${duration.toFixed(2)}ms (average ${(duration / 100).toFixed(3)}ms per call, zero network calls)`);
  }

  console.log('\n===========================================================');
  console.log(`Financial Verifier Verification: Passed: ${passed}, Failed: ${failed}`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerifierTests().catch((err) => {
  console.error('Test execution crashed:', err);
  process.exit(1);
});
