export type IntentType =
  | 'Budget'
  | 'Expense'
  | 'Income'
  | 'Goal'
  | 'Forecast'
  | 'Recommendation'
  | 'Investment'
  | 'Savings'
  | 'Cash Flow'
  | 'Automation'
  | 'General Finance'
  | 'Greeting'
  | 'Unknown';

export const EXPENSE_KEYWORDS = [
  'expenditure',
  'expenditures',
  'expense',
  'expenses',
  'spend',
  'spending',
  'spent',
  'purchase',
  'purchases',
  'merchant',
  'buy',
  'bought'
] as const;

export const SAVINGS_KEYWORDS = [
  'savings rate',
  'saving rate',
  'savings ratio',
  'emergency reserve',
  'emergency fund',
  'savings',
  'saving',
  'saved'
] as const;

function findFirstKeywordIndex(text: string, keywords: readonly string[]): number {
  let minIndex = -1;
  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx !== -1 && (minIndex === -1 || idx < minIndex)) {
      minIndex = idx;
    }
  }
  return minIndex;
}

export class IntentClassifier {
  static classify(prompt: string): IntentType {
    const text = prompt.toLowerCase().trim();

    if (text.length === 0) {
      return 'Unknown';
    }

    if (text.includes('hello') || text.includes('hi ') || text.startsWith('hi') || text.includes('hey') || text.includes('greetings')) {
      return 'Greeting';
    }

    if (text.includes('forecast') || text.includes('predict') || text.includes('projection') || text.includes('future')) {
      return 'Forecast';
    }

    if (text.includes('budget') || text.includes('limit') || text.includes('overspent') || text.includes('spending limit')) {
      return 'Budget';
    }

    // Check Expense and Savings keywords
    const hasExpense = EXPENSE_KEYWORDS.some(kw => text.includes(kw));
    const hasSavings = SAVINGS_KEYWORDS.some(kw => text.includes(kw));

    // Handle combined query: resolve based on which concept appears first in the prompt
    if (hasExpense && hasSavings) {
      const expIdx = findFirstKeywordIndex(text, EXPENSE_KEYWORDS);
      const savIdx = findFirstKeywordIndex(text, SAVINGS_KEYWORDS);
      return expIdx <= savIdx ? 'Expense' : 'Savings';
    }

    if (hasExpense) {
      return 'Expense';
    }

    if (text.includes('income') || text.includes('salary') || text.includes('deposit') || text.includes('earn')) {
      return 'Income';
    }

    if (text.includes('goal') || text.includes('target') || text.includes('milestone') || text.includes('save for')) {
      return 'Goal';
    }

    if (text.includes('recommend') || text.includes('advice') || text.includes('suggest') || text.includes('tip')) {
      return 'Recommendation';
    }

    if (text.includes('invest') || text.includes('stock') || text.includes('mutual fund') || text.includes('equity') || text.includes('portfolio')) {
      return 'Investment';
    }

    if (hasSavings) {
      return 'Savings';
    }

    if (text.includes('cash flow') || text.includes('inflow') || text.includes('outflow') || text.includes('burn rate') || text.includes('net flow')) {
      return 'Cash Flow';
    }

    if (text.includes('automation') || text.includes('rule') || text.includes('scheduler') || text.includes('reminder') || text.includes('alert') || text.includes('notification')) {
      return 'Automation';
    }

    if (text.includes('finance') || text.includes('money') || text.includes('wealth') || text.includes('interest')) {
      return 'General Finance';
    }

    return 'Unknown';
  }
}
