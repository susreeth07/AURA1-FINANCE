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
  name: string;
  query: string;
  answer: string;
  expectedValid: boolean;
  notes?: string;
}

const testCases: TestCase[] = [
  // 1. Calculations & remaining balances
  {
    name: 'Arithmetic remaining budget calculation',
    query: 'How much do I have left in Food?',
    answer: 'You have spent $600 out of your $800 Food budget, leaving you with $200 for the rest of the month.',
    expectedValid: true
  },
  {
    name: 'Combined category totals calculation',
    query: 'How much did I spend on Food and Utilities?',
    answer: 'Between Food ($600) and Utilities ($200), your combined spending is $800.',
    expectedValid: true
  },

  // 2. Ranges
  {
    name: 'Range in advice',
    query: 'How much should I spend on dining?',
    answer: 'A reasonable target for dining out is between $150 and $250 per month based on your profile.',
    expectedValid: true
  },
  {
    name: 'Emergency fund benchmark range (3-6 months)',
    query: 'Is my emergency fund sufficient?',
    answer: 'Your current emergency fund runway is 7.4 months, which exceeds the recommended guideline of 3 to 6 months of living expenses.',
    expectedValid: true
  },

  // 3. Increases / Decreases / Diffs
  {
    name: 'Category comparison difference',
    query: 'Compare Food and Utilities spending',
    answer: 'You spent $400 more on Food ($600) than on Utilities ($200).',
    expectedValid: true
  },
  {
    name: 'Percentage increase/decrease in advice',
    query: 'How can I save more?',
    answer: 'If you reduce your entertainment spending by 15%, you could save an additional $50 per month.',
    expectedValid: true
  },

  // 4. Standard financial guidelines and percentage rules
  {
    name: 'The 50/30/20 rule recommendation',
    query: 'What budgeting method do you recommend?',
    answer: 'A popular strategy is the 50/30/20 rule, which suggests allocating 50% of income to needs, 30% to wants, and 20% to savings.',
    expectedValid: true
  },
  {
    name: 'Target savings rate recommendation',
    query: 'Am I saving enough?',
    answer: 'Your current savings rate is 35%, which is well above the commonly recommended 20% benchmark.',
    expectedValid: true
  },

  // 5. Hypothetical purchases & scenarios
  {
    name: 'Hypothetical purchase evaluation',
    query: 'Can I afford a new sofa for $1,200?',
    answer: 'With your current monthly net savings of $1,800, purchasing a $1,200 sofa is manageable without depleting your emergency reserves.',
    expectedValid: true
  },
  {
    name: 'Hypothetical savings projection in advice',
    query: 'How to reach my vacation goal faster?',
    answer: 'Consider setting aside $150 each paycheck into your Vacation fund to reach your $5,000 goal sooner.',
    expectedValid: true
  },

  // 6. Category comparison
  {
    name: 'Over-budget category comparison',
    query: 'Where am I over budget?',
    answer: 'Your Entertainment budget is over by $50, having reached $350 against a $300 limit (117% utilized).',
    expectedValid: true
  },

  // 7. Hallucination checks (MUST STILL FAIL)
  {
    name: 'Hallucinated balance claim',
    query: 'What is my current savings?',
    answer: 'Your current savings balance is $95,000, which is fantastic.',
    expectedValid: false
  },
  {
    name: 'Hallucinated runway claim',
    query: 'What is my runway?',
    answer: 'Your runway is currently 24 months.',
    expectedValid: false
  },
  {
    name: 'Hallucinated Food budget spent claim',
    query: 'How much did I spend on Food?',
    answer: 'You have spent $1,450 on Food this month.',
    expectedValid: false
  }
];

console.log('Running False Positive and Edge Case Test Suite...\n');
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = FinancialVerifier.verify(
    tc.query,
    tc.answer,
    sampleContext,
    sampleToolOutputs,
    defaultConfidence
  );

  const isSuccess = result.isValid === tc.expectedValid;
  if (isSuccess) {
    console.log(`PASS: [${tc.name}]`);
    passed++;
  } else {
    console.log(`FAIL: [${tc.name}] Expected isValid=${tc.expectedValid}, got ${result.isValid}`);
    console.log('   Discrepancies: ', result.discrepancies.map(d => `${d.claimText} (${d.reason})`));
    failed++;
  }
}

console.log(`\nSummary: ${passed} passed, ${failed} failed out of ${testCases.length} test cases.`);