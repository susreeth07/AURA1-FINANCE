import { FinancialReasoningVerifier } from '../src/ai/verification/FinancialReasoningVerifier';
import { FinancialVerifier } from '../src/ai/verification/FinancialVerifier';

const sampleContext = {
  kpis: {
    totalIncome: '$5,200.00',
    totalExpense: '$3,400.00',
    netSavings: '$1,800.00',
    currentSavings: '$25,000.00',
    savingsRate: 34.6,
    runwayMonths: 7.35,
    overallHealthScore: 82
  },
  budgets: [
    { category: 'Housing', limit: 1500, spent: 1500, utilizationPercent: 100 },
    { category: 'Food', limit: 800, spent: 600, utilizationPercent: 75 },
    { category: 'Utilities', limit: 400, spent: 200, utilizationPercent: 50 },
    { category: 'Entertainment', limit: 300, spent: 350, utilizationPercent: 116.7 }
  ],
  savings: [
    { name: 'Emergency Fund', currentAmount: 20000, targetAmount: 25000 },
    { name: 'Vacation', currentAmount: 2500, targetAmount: 5000 }
  ]
};

const sampleToolOutputs = {
  analytics: sampleContext,
  budget: { budgets: sampleContext.budgets },
  goal: { savings: sampleContext.savings }
};

const defaultConfidence = { level: 'High' as const, score: 0.90 };

interface TestCase {
  id: number;
  name: string;
  query: string;
  answer: string;
  expectedValid: boolean;
  expectedDiscrepancyType?: string;
  notes?: string;
}

const testCases: TestCase[] = [
  // 1. Exact income-expense calculation
  {
    id: 1,
    name: 'Exact income-expense calculation',
    query: 'What is my net savings?',
    answer: 'With an income of $5,200 and expenses of $3,400, your net savings is $1,800.',
    expectedValid: true
  },

  // 2. Rounded income-expense calculation
  {
    id: 2,
    name: 'Rounded income-expense calculation',
    query: 'How much do I save each month?',
    answer: 'With an income of $5.2k and expenses of $3.4k, your net savings is $1.8k.',
    expectedValid: true
  },

  // 3. Remaining budget
  {
    id: 3,
    name: 'Remaining budget calculation',
    query: 'How is my Food budget looking?',
    answer: 'Your Food budget limit is $800 and you spent $600, leaving $200 remaining.',
    expectedValid: true
  },

  // 4. Budget overage
  {
    id: 4,
    name: 'Budget overage calculation',
    query: 'Did I overspend anywhere?',
    answer: 'You spent $350 on Entertainment against a $300 limit, putting you over by $50.',
    expectedValid: true
  },

  // 5. Savings rate
  {
    id: 5,
    name: 'Savings rate calculation',
    query: 'What is my savings rate?',
    answer: 'Saving $1,800 from your $5,200 income yields a savings rate of 34.6%.',
    expectedValid: true
  },

  // 6. Goal progress
  {
    id: 6,
    name: 'Goal progress percentage calculation',
    query: 'How is my Emergency Fund goal going?',
    answer: 'With $20,000 saved toward your $25,000 goal, you have reached 80% progress.',
    expectedValid: true
  },

  // 7. Goal remaining
  {
    id: 7,
    name: 'Goal remaining amount calculation',
    query: 'How much more do I need for Emergency Fund?',
    answer: 'To reach your $25,000 goal from $20,000, you need $5,000 more.',
    expectedValid: true
  },

  // 8. Emergency runway
  {
    id: 8,
    name: 'Emergency runway calculation',
    query: 'What is my runway?',
    answer: 'With $25,000 in savings and $3,400 monthly expenses, your runway is 7.4 months.',
    expectedValid: true
  },

  // 9. Spending increase
  {
    id: 9,
    name: 'Absolute spending increase calculation',
    query: 'How has my spending changed?',
    answer: 'Your monthly spending increased from $3,000 to $3,400, an increase of $400.',
    expectedValid: true
  },

  // 10. Spending decrease
  {
    id: 10,
    name: 'Absolute spending decrease calculation',
    query: 'Did my utilities drop?',
    answer: 'Your utility spending decreased from $300 to $200, a drop of $100.',
    expectedValid: true
  },

  // 11. Percentage increase
  {
    id: 11,
    name: 'Percentage spending increase calculation',
    query: 'How much did expenses grow in percent?',
    answer: 'Your expenses increased from $3,000 to $3,450, a 15% increase.',
    expectedValid: true
  },

  // 12. Percentage decrease
  {
    id: 12,
    name: 'Percentage spending decrease calculation',
    query: 'How much did dining drop?',
    answer: 'Your dining expenses fell from $500 to $400, a 20% decrease.',
    expectedValid: true
  },

  // 13. Combined category arithmetic
  {
    id: 13,
    name: 'Combined category arithmetic calculation',
    query: 'How much did I spend on Food and Utilities?',
    answer: 'Between Food ($600) and Utilities ($200), your combined spending is $800.',
    expectedValid: true
  },

  // 14. Category-scoped arithmetic
  {
    id: 14,
    name: 'Category-scoped arithmetic',
    query: 'Can you compare Food and Utilities?',
    answer: 'You spent $400 more on Food ($600) than on Utilities ($200).',
    expectedValid: true
  },

  // 15. Hypothetical calculation
  {
    id: 15,
    name: 'Hypothetical savings timeline calculation',
    query: 'How long to save for a $1,200 laptop?',
    answer: 'If you save $300 per month toward a $1,200 laptop, it will take 4 months.',
    expectedValid: true
  },

  // 16. Educational benchmark
  {
    id: 16,
    name: 'Educational benchmark protection',
    query: 'What budgeting method is best?',
    answer: 'The 50/30/20 rule suggests allocating 50% to needs, 30% to wants, and 20% to savings.',
    expectedValid: true
  },

  // 17. User-provided number
  {
    id: 17,
    name: 'User-provided number handling',
    query: 'Can I afford a $1,200 sofa?',
    answer: 'A $1,200 sofa is manageable with your current savings buffer.',
    expectedValid: true
  },

  // 18. Unrelated cross-metric collision (MUST FAIL)
  {
    id: 18,
    name: 'Unrelated cross-metric collision rejection (MUST FAIL)',
    query: 'How much did I spend on Food?',
    answer: 'Your Food budget limit is $800 and you spent $600, leaving you with $1,450 remaining.',
    expectedValid: false,
    expectedDiscrepancyType: 'budget_remaining',
    notes: '800 - 600 = 200, not 1450 (which happens to be 1800 - 350)'
  },

  // 19. Hallucinated calculation (MUST FAIL)
  {
    id: 19,
    name: 'Hallucinated calculation rejection (MUST FAIL)',
    query: 'Check Food remaining',
    answer: 'Your Food budget limit is $800 and you spent $600, leaving you with $350 remaining.',
    expectedValid: false,
    expectedDiscrepancyType: 'budget_remaining',
    notes: '800 - 600 = 200, not 350'
  },

  // 20. Multiple inconsistent claims (MUST FAIL)
  {
    id: 20,
    name: 'Multiple inconsistent claims rejection (MUST FAIL)',
    query: 'Explain my cash flow',
    answer: 'With an income of $5,000 and expenses of $3,000, your net savings is $1,200, representing a 40% savings rate.',
    expectedValid: false,
    notes: '5000 - 3000 = 2000 (not 1200); 1200 / 5000 = 24% (not 40%)'
  },

  // 21. Currency mismatch
  {
    id: 21,
    name: 'Currency mismatch verification',
    query: 'What is my Food budget in Rupees?',
    answer: 'You spent ₹600 on Food out of an ₹800 limit.',
    expectedValid: true, // Reasoner verifies math (600 vs 800); FinancialVerifier catches currency code mismatch
    notes: 'Mathematical ratio 600/800 is internally consistent'
  },

  // 22. Rounding tolerance
  {
    id: 22,
    name: 'Rounding tolerance acceptance',
    query: 'What is my savings rate rounded?',
    answer: 'Saving $1,800 from your $5,200 income yields a savings rate of 35%.',
    expectedValid: true,
    notes: 'Actual is 34.615%, 35% is within 1.0% rounding tolerance'
  },

  // 23. Non-financial numbers
  {
    id: 23,
    name: 'Non-financial numbers ignored',
    query: 'What steps should I take?',
    answer: 'Follow these 3 simple steps within 10 days to optimize your financial habits.',
    expectedValid: true
  },

  // 24. Calendar dates
  {
    id: 24,
    name: 'Calendar dates ignored',
    query: 'When was this reviewed?',
    answer: 'On October 15, 2026, your monthly audit was recorded.',
    expectedValid: true
  },

  // 25. Pure qualitative advice
  {
    id: 25,
    name: 'Pure qualitative advice accepted without warnings',
    query: 'Any general tips?',
    answer: 'Prioritize paying off any variable-rate debts first and maintain a disciplined savings cadence.',
    expectedValid: true
  }
];

console.log('===========================================================');
console.log('    AURA FINANCE — FINANCIAL REASONING VERIFIER SUITE     ');
console.log('===========================================================\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = FinancialReasoningVerifier.verify(
    tc.query,
    tc.answer,
    sampleContext,
    sampleToolOutputs,
    defaultConfidence
  );

  const isSuccess = result.isValid === tc.expectedValid;
  if (isSuccess) {
    console.log(`✅ PASS: [Scenario ${tc.id}] ${tc.name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: [Scenario ${tc.id}] ${tc.name}`);
    console.log(`   Expected isValid=${tc.expectedValid}, got ${result.isValid}`);
    if (result.discrepancies.length > 0) {
      console.log('   Discrepancies:', result.discrepancies.map(d => `${d.formulaType}: ${d.reason}`));
    }
    if (result.warnings.length > 0) {
      console.log('   Warnings:', result.warnings);
    }
    failed++;
  }
}

console.log(`\n===========================================================`);
console.log(`Financial Reasoning Verification: Passed: ${passed}, Failed: ${failed}`);
console.log(`===========================================================`);

if (failed > 0) {
  process.exit(1);
}