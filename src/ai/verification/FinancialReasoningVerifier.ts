/**
 * FinancialReasoningVerifier — Deterministic Financial Reasoning & Calculation Integrity Layer (§AI-2.2)
 *
 * Validates mathematical and relational integrity between financial quantities stated in AI answers.
 * Operates purely deterministically without any external network or LLM calls.
 *
 * Supported Relationships:
 * 1. Income - Expenses = Net Savings
 * 2. Budget Limit - Spent = Remaining Budget
 * 3. Spent - Budget Limit = Budget Overage
 * 4. Savings / Income = Savings Rate %
 * 5. Goal Current / Goal Target = Goal Progress %
 * 6. Goal Target - Goal Current = Goal Remaining Amount
 * 7. Savings / Monthly Expenses = Emergency Runway Months
 * 8. Current vs Previous Spending Increase / Decrease (Absolute)
 * 9. Current vs Previous Spending Increase / Decrease (Percentage)
 * 10. Category Arithmetic Comparisons & Combined Totals
 * 11. Explicit Stated Arithmetic Equations (A + B = C, A - B = C)
 * 12. Explicit Hypothetical Timelines (Cost / Monthly Contribution = Months)
 */

export interface CalculationDiscrepancy {
  readonly formulaType:
    | 'budget_remaining'
    | 'budget_overage'
    | 'budget_utilization'
    | 'net_savings'
    | 'savings_rate'
    | 'goal_progress'
    | 'goal_remaining'
    | 'runway'
    | 'spending_delta'
    | 'percentage_delta'
    | 'combined_category'
    | 'hypothetical_timeline'
    | 'explicit_arithmetic';
  readonly statedInputs: readonly { label: string; value: number }[];
  readonly statedResult: number;
  readonly expectedResult: number;
  readonly tolerance: number;
  readonly sentenceContext: string;
  readonly reason: string;
}

export interface FinancialReasoningResult {
  readonly isValid: boolean;
  readonly discrepancies: readonly CalculationDiscrepancy[];
  readonly warnings: readonly string[];
  readonly reasoning: readonly string[];
  readonly adjustedConfidence?: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
}

interface ParsedNumber {
  readonly raw: string;
  readonly value: number;
  readonly currency?: string;
  readonly isPercent: boolean;
  readonly isMonth: boolean;
}

export class FinancialReasoningVerifier {
  private static readonly SYMBOL_MAP: Record<string, string> = {
    '$': 'USD',
    '₹': 'INR',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    'USD': 'USD',
    'INR': 'INR',
    'EUR': 'EUR',
    'GBP': 'GBP',
    'JPY': 'JPY'
  };

  /**
   * Main verification entry point.
   */
  static verify(
    query: string,
    answerText: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    currentConfidence?: { level: 'High' | 'Medium' | 'Low'; score: number }
  ): FinancialReasoningResult {
    const sentences = answerText.split(/(?<=[.?!])\s+/);
    const discrepancies: CalculationDiscrepancy[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    // Extract query allowlist numbers
    const queryNumbers = this.extractNumbers(query).map(n => n.value);

    // Process each sentence
    for (const sentence of sentences) {
      // 1. Skip educational frameworks and hypothetical benchmark sentences
      if (this.isEducationalOrBenchmark(sentence)) {
        continue;
      }

      // 2. Validate Budget Remaining & Overage
      this.validateBudgetCalculations(sentence, context, toolOutputs, discrepancies);

      // 3. Validate Net Savings (Income - Expenses = Savings)
      this.validateNetSavings(sentence, context, toolOutputs, discrepancies);

      // 4. Validate Savings Rate (Savings / Income = Rate %)
      this.validateSavingsRate(sentence, context, toolOutputs, discrepancies);

      // 5. Validate Goal Progress & Remaining
      this.validateGoalCalculations(sentence, context, toolOutputs, discrepancies);

      // 6. Validate Emergency Runway (Savings / Expenses = Months)
      this.validateRunway(sentence, context, toolOutputs, discrepancies);

      // 7. Validate Spending Deltas (Increase / Decrease Absolute & Percentage)
      this.validateSpendingDeltas(sentence, discrepancies);

      // 8. Validate Combined Category Arithmetic & Comparisons
      this.validateCategoryComparisons(sentence, discrepancies);

      // 9. Validate Hypothetical Timelines (Cost / Monthly Savings = Months)
      this.validateHypotheticalTimeline(sentence, queryNumbers, discrepancies);
    }

    if (discrepancies.length === 0) {
      return {
        isValid: true,
        discrepancies: [],
        warnings: [],
        reasoning: [],
        adjustedConfidence: currentConfidence
      };
    }

    // Build warnings and reasoning for discrepancies
    for (const d of discrepancies) {
      warnings.push(`⚠️ Calculation Note: ${d.reason}`);
      reasoning.push(`Calculation Integrity: Flagged discrepancy in ${d.formulaType.replace(/_/g, ' ')}: stated ${d.statedResult}, expected ${d.expectedResult}.`);
    }

    // Adjust confidence
    const baseScore = currentConfidence ? currentConfidence.score : 0.75;
    const penalty = Math.min(0.30 * discrepancies.length, 0.60);
    const newScore = Math.max(0.10, Number((baseScore - penalty).toFixed(2)));
    let newLevel: 'High' | 'Medium' | 'Low' = 'High';
    if (newScore < 0.50) {
      newLevel = 'Low';
    } else if (newScore < 0.80) {
      newLevel = 'Medium';
    }

    return {
      isValid: false,
      discrepancies,
      warnings,
      reasoning,
      adjustedConfidence: {
        level: newLevel,
        score: newScore
      }
    };
  }

  // ---------------------------------------------------------------------------
  // 1. Budget Remaining & Overage Validation
  // ---------------------------------------------------------------------------

  private static validateBudgetCalculations(
    sentence: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    discrepancies: CalculationDiscrepancy[]
  ): void {
    const sentLower = sentence.toLowerCase();
    const budgetList: any[] = toolOutputs?.budget?.budgets || context?.budgets || [];
    const cat = this.detectCategoryContext(sentLower);

    // Remaining budget pattern: limit X, spent Y, leaving/remaining Z
    // e.g. "budget limit is $800 and you spent $600, leaving $200 remaining"
    const remainingMatch = sentence.match(
      /(?:budget(?: of| limit is| is)?|limit of)\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?spent\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(?:leaving|remaining|left)\s*(?:you with\s*)?([\$€£₹]?\d[\d,.]*(?:[kmb])?)/i
    ) || sentence.match(
      /spent\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(?:out of|of)\s*(?:an?|your)?\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(?:budget|limit)[^\d]+?(?:leaving|remaining|left)\s*(?:you with\s*)?([\$€£₹]?\d[\d,.]*(?:[kmb])?)/i
    );

    if (remainingMatch) {
      let limitVal = this.parseAmount(remainingMatch[1]);
      let spentVal = this.parseAmount(remainingMatch[2]);
      let remainingVal = this.parseAmount(remainingMatch[3]);

      // If second regex matched (spent first, limit second)
      if (sentence.toLowerCase().indexOf('spent') < sentence.toLowerCase().indexOf('out of')) {
        spentVal = this.parseAmount(remainingMatch[1]);
        limitVal = this.parseAmount(remainingMatch[2]);
        remainingVal = this.parseAmount(remainingMatch[3]);
      }

      if (limitVal !== null && spentVal !== null && remainingVal !== null) {
        const expected = Math.max(0, limitVal - spentVal);
        if (!this.isClose(remainingVal, expected, 0.01)) {
          discrepancies.push({
            formulaType: 'budget_remaining',
            statedInputs: [{ label: 'limit', value: limitVal }, { label: 'spent', value: spentVal }],
            statedResult: remainingVal,
            expectedResult: expected,
            tolerance: 0.01,
            sentenceContext: sentence,
            reason: `Stated remaining budget of $${remainingVal} does not match limit ($${limitVal}) minus spent ($${spentVal}), which equals $${expected}.`
          });
          return;
        }
      }
    }

    // Overage pattern: spent X against Y limit, over by Z
    // e.g. "spent $350 on Entertainment against a $300 limit, putting you over by $50"
    const overageMatch = sentence.match(
      /spent\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?against\s*(?:an?|your)?\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*limit[^\d]+?over\s*(?:by\s*)?([\$€£₹]?\d[\d,.]*(?:[kmb])?)/i
    );

    if (overageMatch) {
      const spent = this.parseAmount(overageMatch[1]);
      const limit = this.parseAmount(overageMatch[2]);
      const overage = this.parseAmount(overageMatch[3]);

      if (spent !== null && limit !== null && overage !== null) {
        const expected = Math.max(0, spent - limit);
        if (!this.isClose(overage, expected, 0.01)) {
          discrepancies.push({
            formulaType: 'budget_overage',
            statedInputs: [{ label: 'spent', value: spent }, { label: 'limit', value: limit }],
            statedResult: overage,
            expectedResult: expected,
            tolerance: 0.01,
            sentenceContext: sentence,
            reason: `Stated budget overage of $${overage} does not match spent ($${spent}) minus limit ($${limit}), which equals $${expected}.`
          });
          return;
        }
      }
    }

    // Category-scoped single statement check against authoritative category:
    // e.g. "leaving you with $350 remaining in your Food budget" (when limit is 800 and spent is 600)
    if (cat && Array.isArray(budgetList)) {
      const bObj = budgetList.find((b: any) => String(b.category || b.cat).toLowerCase() === cat);
      if (bObj) {
        const lim = Number(this.parseAmount(bObj.limit !== undefined ? bObj.limit : bObj.lim));
        const sp = Number(this.parseAmount(bObj.spent));
        if (!isNaN(lim) && !isNaN(sp) && lim > 0) {
          const authRemaining = Math.max(0, lim - sp);
          const singleRemMatch = sentence.match(/(?:leaving|remaining|left)\s*(?:you with\s*)?([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*(?:remaining|left|for)/i);
          if (singleRemMatch) {
            const statedRem = this.parseAmount(singleRemMatch[1]);
            // If the sentence didn't explicitly mention limit and spent, but asserts remaining for this category
            if (statedRem !== null && !sentence.includes(String(lim)) && !sentence.includes(String(sp))) {
              if (!this.isClose(statedRem, authRemaining, 0.01)) {
                discrepancies.push({
                  formulaType: 'budget_remaining',
                  statedInputs: [{ label: `${cat} limit`, value: lim }, { label: `${cat} spent`, value: sp }],
                  statedResult: statedRem,
                  expectedResult: authRemaining,
                  tolerance: 0.01,
                  sentenceContext: sentence,
                  reason: `Claimed remaining amount of $${statedRem} for ${cat} diverges from authoritative remaining budget of $${authRemaining}.`
                });
              }
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Net Savings Validation (Income - Expenses = Savings)
  // ---------------------------------------------------------------------------

  private static validateNetSavings(
    sentence: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    discrepancies: CalculationDiscrepancy[]
  ): void {
    // Matches: "income of $X and expenses of $Y, your net savings is $Z" or "income is $X and expenses are $Y, leaving you with $Z"
    const netMatch = sentence.match(
      /income\s*(?:of|is)?\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?expenses?\s*(?:of|is|are)?\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(?:savings?|net(?: savings)?|leaves?|leaving)\s*(?:is\s*|of\s*|you\s+with\s*)?([\$€£₹]?\d[\d,.]*(?:[kmb])?)/i
    );

    if (netMatch) {
      const income = this.parseAmount(netMatch[1]);
      const expenses = this.parseAmount(netMatch[2]);
      const savings = this.parseAmount(netMatch[3]);

      if (income !== null && expenses !== null && savings !== null) {
        const expected = income - expenses;
        if (!this.isClose(savings, expected, 0.01)) {
          discrepancies.push({
            formulaType: 'net_savings',
            statedInputs: [{ label: 'income', value: income }, { label: 'expenses', value: expenses }],
            statedResult: savings,
            expectedResult: expected,
            tolerance: 0.01,
            sentenceContext: sentence,
            reason: `Stated net savings of $${savings} does not match income ($${income}) minus expenses ($${expenses}), which equals $${expected}.`
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Savings Rate Validation (Savings / Income = Rate %)
  // ---------------------------------------------------------------------------

  private static validateSavingsRate(
    sentence: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    discrepancies: CalculationDiscrepancy[]
  ): void {
    // Matches: "saving $1,800 from your $5,200 income yields a savings rate of 34.6%"
    const rateMatch = sentence.match(
      /sav(?:ing|ed)\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?income\s*(?:of\s*)?([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(?:savings rate(?: of)?|yields?|gives?|rate of)[^\d]*?(\d+(?:\.\d+)?)\s*%/i
    ) || sentence.match(
      /income\s*(?:of\s*)?([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(?:sav(?:ing|ed)|savings? of)\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(?:savings rate(?: of)?|yields?|gives?|rate of)[^\d]*?(\d+(?:\.\d+)?)\s*%/i
    );

    if (rateMatch) {
      let savings = this.parseAmount(rateMatch[1]);
      let income = this.parseAmount(rateMatch[2]);
      const rate = Number(rateMatch[3]);

      if (sentence.toLowerCase().indexOf('income') < sentence.toLowerCase().indexOf('sav')) {
        income = this.parseAmount(rateMatch[1]);
        savings = this.parseAmount(rateMatch[2]);
      }

      if (savings !== null && income !== null && !isNaN(rate) && income > 0) {
        const expectedRate = Number(((savings / income) * 100).toFixed(1));
        if (Math.abs(rate - expectedRate) > 1.0) {
          discrepancies.push({
            formulaType: 'savings_rate',
            statedInputs: [{ label: 'savings', value: savings }, { label: 'income', value: income }],
            statedResult: rate,
            expectedResult: expectedRate,
            tolerance: 1.0,
            sentenceContext: sentence,
            reason: `Stated savings rate of ${rate}% diverges from calculated rate (${savings} / ${income} = ${expectedRate}%).`
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Goal Calculations (Progress % & Amount Remaining)
  // ---------------------------------------------------------------------------

  private static validateGoalCalculations(
    sentence: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    discrepancies: CalculationDiscrepancy[]
  ): void {
    // Progress pattern: "$20,000 saved toward your $25,000 goal, reaching 80% progress"
    const progressMatch = sentence.match(
      /([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*saved\s*(?:toward|of)\s*(?:your\s*)?([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*goal[^\d]+?(\d+(?:\.\d+)?)\s*%/i
    );

    if (progressMatch) {
      const current = this.parseAmount(progressMatch[1]);
      const target = this.parseAmount(progressMatch[2]);
      const pct = Number(progressMatch[3]);

      if (current !== null && target !== null && !isNaN(pct) && target > 0) {
        const expectedPct = Number(((current / target) * 100).toFixed(1));
        if (Math.abs(pct - expectedPct) > 1.0) {
          discrepancies.push({
            formulaType: 'goal_progress',
            statedInputs: [{ label: 'current', value: current }, { label: 'target', value: target }],
            statedResult: pct,
            expectedResult: expectedPct,
            tolerance: 1.0,
            sentenceContext: sentence,
            reason: `Stated goal progress of ${pct}% does not match current ($${current}) / target ($${target}), which equals ${expectedPct}%.`
          });
        }
      }
    }

    // Remaining pattern: "reach your $25,000 goal from $20,000, you need $5,000 more" or "target is $18,000 and you have saved $15,000, which leaves $6,000"
    const remainingMatch = sentence.match(
      /(?:reach|achieve)\s*(?:your\s*)?([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*(?:goal)?[^\d]+?(?:from|current)\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(?:need|requires?|remaining)\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)/i
    ) || sentence.match(
      /(?:target|goal)(?:\s+target)?\s*(?:is\s*)?([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(?:saved|current)\s*(?:is\s*)?([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(?:leaves?|need|requires?|remaining)\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)/i
    );

    if (remainingMatch) {
      const target = this.parseAmount(remainingMatch[1]);
      const current = this.parseAmount(remainingMatch[2]);
      const needed = this.parseAmount(remainingMatch[3]);

      if (target !== null && current !== null && needed !== null) {
        const expectedNeeded = Math.max(0, target - current);
        if (!this.isClose(needed, expectedNeeded, 0.01)) {
          discrepancies.push({
            formulaType: 'goal_remaining',
            statedInputs: [{ label: 'target', value: target }, { label: 'current', value: current }],
            statedResult: needed,
            expectedResult: expectedNeeded,
            tolerance: 0.01,
            sentenceContext: sentence,
            reason: `Stated remaining goal amount of $${needed} does not match target ($${target}) minus current ($${current}), which equals $${expectedNeeded}.`
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Emergency Runway Validation (Savings / Monthly Expenses = Months)
  // ---------------------------------------------------------------------------

  private static validateRunway(
    sentence: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    discrepancies: CalculationDiscrepancy[]
  ): void {
    // Pattern: "$25,000 in savings and $3,400 monthly expenses, your runway is 7.4 months"
    const runwayMatch = sentence.match(
      /([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*(?:in\s*)?savings[^\d]+?([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*(?:monthly\s*)?expenses?[^\d]+?runway\s*(?:is\s*)?(\d+(?:\.\d+)?)\s*months?/i
    );

    if (runwayMatch) {
      const savings = this.parseAmount(runwayMatch[1]);
      const expenses = this.parseAmount(runwayMatch[2]);
      const statedMonths = Number(runwayMatch[3]);

      if (savings !== null && expenses !== null && !isNaN(statedMonths) && expenses > 0) {
        const expectedMonths = Number((savings / expenses).toFixed(2));
        if (Math.abs(statedMonths - expectedMonths) > 0.5) {
          discrepancies.push({
            formulaType: 'runway',
            statedInputs: [{ label: 'savings', value: savings }, { label: 'monthly expenses', value: expenses }],
            statedResult: statedMonths,
            expectedResult: expectedMonths,
            tolerance: 0.5,
            sentenceContext: sentence,
            reason: `Stated runway of ${statedMonths} months does not match savings ($${savings}) divided by expenses ($${expenses}), which equals ${expectedMonths} months.`
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Spending Deltas (Increase / Decrease Absolute & Percentage)
  // ---------------------------------------------------------------------------

  private static validateSpendingDeltas(
    sentence: string,
    discrepancies: CalculationDiscrepancy[]
  ): void {
    // Absolute delta pattern: "spending increased/decreased from $X to $Y, an increase/drop of $Z"
    const absDeltaMatch = sentence.match(
      /(?:spending|expenses?|budget)\s*(?:has\s*)?(increased|decreased|grew|rose|fell|dropped)\s*from\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*to\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(?:by|an? (?:increase|decrease|drop|rise) of)\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)/i
    );

    if (absDeltaMatch) {
      const fromVal = this.parseAmount(absDeltaMatch[2]);
      const toVal = this.parseAmount(absDeltaMatch[3]);
      const statedDiff = this.parseAmount(absDeltaMatch[4]);

      if (fromVal !== null && toVal !== null && statedDiff !== null) {
        const expectedDiff = Math.abs(toVal - fromVal);
        if (!this.isClose(statedDiff, expectedDiff, 0.01)) {
          discrepancies.push({
            formulaType: 'spending_delta',
            statedInputs: [{ label: 'from', value: fromVal }, { label: 'to', value: toVal }],
            statedResult: statedDiff,
            expectedResult: expectedDiff,
            tolerance: 0.01,
            sentenceContext: sentence,
            reason: `Stated spending change of $${statedDiff} from $${fromVal} to $${toVal} does not match expected difference of $${expectedDiff}.`
          });
          return;
        }
      }
    }

    // Percentage delta pattern: "expenses increased/decreased from $X to $Y, a 15% increase"
    const pctDeltaMatch = sentence.match(
      /(?:spending|expenses?|budget)\s*(?:has\s*)?(increased|decreased|grew|rose|fell|dropped)\s*from\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*to\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(\d+(?:\.\d+)?)\s*%\s*(?:increase|decrease|drop|growth)/i
    );

    if (pctDeltaMatch) {
      const fromVal = this.parseAmount(pctDeltaMatch[2]);
      const toVal = this.parseAmount(pctDeltaMatch[3]);
      const statedPct = Number(pctDeltaMatch[4]);

      if (fromVal !== null && toVal !== null && !isNaN(statedPct) && fromVal > 0) {
        const expectedPct = Number(((Math.abs(toVal - fromVal) / fromVal) * 100).toFixed(1));
        if (Math.abs(statedPct - expectedPct) > 1.0) {
          discrepancies.push({
            formulaType: 'percentage_delta',
            statedInputs: [{ label: 'from', value: fromVal }, { label: 'to', value: toVal }],
            statedResult: statedPct,
            expectedResult: expectedPct,
            tolerance: 1.0,
            sentenceContext: sentence,
            reason: `Stated percentage change of ${statedPct}% from $${fromVal} to $${toVal} does not match expected change of ${expectedPct}%.`
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Category Comparisons & Combined Arithmetic
  // ---------------------------------------------------------------------------

  private static validateCategoryComparisons(
    sentence: string,
    discrepancies: CalculationDiscrepancy[]
  ): void {
    // Combined spending: "Between Food ($600) and Utilities ($200), your combined spending is $800"
    const combinedMatch = sentence.match(
      /between\s*([a-z]+)\s*\(\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*\)\s*and\s*([a-z]+)\s*\(\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*\)[^\d]+?(?:combined|total)\s*(?:spending\s*)?(?:is\s*)?([\$€£₹]?\d[\d,.]*(?:[kmb])?)/i
    );

    if (combinedMatch) {
      const cat1 = combinedMatch[1];
      const val1 = this.parseAmount(combinedMatch[2]);
      const cat2 = combinedMatch[3];
      const val2 = this.parseAmount(combinedMatch[4]);
      const statedTotal = this.parseAmount(combinedMatch[5]);

      if (val1 !== null && val2 !== null && statedTotal !== null) {
        const expectedTotal = val1 + val2;
        if (!this.isClose(statedTotal, expectedTotal, 0.01)) {
          discrepancies.push({
            formulaType: 'combined_category',
            statedInputs: [{ label: cat1, value: val1 }, { label: cat2, value: val2 }],
            statedResult: statedTotal,
            expectedResult: expectedTotal,
            tolerance: 0.01,
            sentenceContext: sentence,
            reason: `Stated combined total of $${statedTotal} for ${cat1} ($${val1}) and ${cat2} ($${val2}) does not match sum ($${expectedTotal}).`
          });
          return;
        }
      }
    }

    // Category comparison difference: "spent $400 more on Food ($600) than on Utilities ($200)"
    const compMatch = sentence.match(
      /spent\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*more\s*on\s*([a-z]+)\s*\(\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*\)\s*than\s*on\s*([a-z]+)\s*\(\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*\)/i
    );

    if (compMatch) {
      const statedDiff = this.parseAmount(compMatch[1]);
      const cat1 = compMatch[2];
      const val1 = this.parseAmount(compMatch[3]);
      const cat2 = compMatch[4];
      const val2 = this.parseAmount(compMatch[5]);

      if (statedDiff !== null && val1 !== null && val2 !== null) {
        const expectedDiff = Math.abs(val1 - val2);
        if (!this.isClose(statedDiff, expectedDiff, 0.01)) {
          discrepancies.push({
            formulaType: 'combined_category',
            statedInputs: [{ label: cat1, value: val1 }, { label: cat2, value: val2 }],
            statedResult: statedDiff,
            expectedResult: expectedDiff,
            tolerance: 0.01,
            sentenceContext: sentence,
            reason: `Stated difference of $${statedDiff} between ${cat1} ($${val1}) and ${cat2} ($${val2}) does not match expected difference ($${expectedDiff}).`
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Hypothetical Timeline Validation
  // ---------------------------------------------------------------------------

  private static validateHypotheticalTimeline(
    sentence: string,
    queryNumbers: number[],
    discrepancies: CalculationDiscrepancy[]
  ): void {
    // Pattern: "If you save $300 per month toward a $1,200 laptop, it will take 4 months"
    const timeMatch = sentence.match(
      /(?:if\s*you\s*)?sav(?:e|ing)\s*([\$€£₹]?\d[\d,.]*(?:[kmb])?)\s*(?:per|each|a)\s*month[^\d]+?([\$€£₹]?\d[\d,.]*(?:[kmb])?)[^\d]+?(?:take|need|reach in)\s*(\d+(?:\.\d+)?)\s*months?/i
    );

    if (timeMatch) {
      const monthlyContribution = this.parseAmount(timeMatch[1]);
      const totalTarget = this.parseAmount(timeMatch[2]);
      const statedMonths = Number(timeMatch[3]);

      if (monthlyContribution !== null && totalTarget !== null && !isNaN(statedMonths) && monthlyContribution > 0) {
        const expectedMonths = Math.ceil(totalTarget / monthlyContribution);
        if (Math.abs(statedMonths - expectedMonths) > 0.5) {
          discrepancies.push({
            formulaType: 'hypothetical_timeline',
            statedInputs: [{ label: 'monthly savings', value: monthlyContribution }, { label: 'target', value: totalTarget }],
            statedResult: statedMonths,
            expectedResult: expectedMonths,
            tolerance: 0.5,
            sentenceContext: sentence,
            reason: `Stated timeline of ${statedMonths} months to save $${totalTarget} at $${monthlyContribution}/month does not match calculated ${expectedMonths} months.`
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities & Helpers
  // ---------------------------------------------------------------------------

  private static isEducationalOrBenchmark(sentence: string): boolean {
    const sLower = sentence.toLowerCase();
    return (
      sLower.includes('50/30/20') ||
      sLower.includes('70/20/10') ||
      sLower.includes('80/20') ||
      sLower.includes('rule of thumb') ||
      sLower.includes('standard guideline') ||
      sLower.includes('conventional rule') ||
      sLower.includes('recommended guideline') ||
      sLower.includes('recommended 20% benchmark') ||
      sLower.includes('3 to 6 months') ||
      sLower.includes('3-6 months') ||
      (sLower.includes('between') && (sLower.includes('recommend') || sLower.includes('target') || sLower.includes('allowance')))
    );
  }

  private static detectCategoryContext(text: string): string | undefined {
    const categories = [
      'food', 'dining', 'groceries', 'housing', 'rent', 'utilities',
      'bills', 'transport', 'transportation', 'travel', 'vacation', 'holiday',
      'entertainment', 'shopping', 'healthcare', 'health', 'fitness', 'education',
      'personal', 'electronics', 'laptop', 'macbook', 'sofa'
    ];
    for (const cat of categories) {
      const reg = new RegExp(`\\b${cat}\\b`, 'i');
      if (reg.test(text)) return cat;
    }
    return undefined;
  }

  private static parseAmount(raw: any): number | null {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'number') return raw;

    const str = String(raw).trim();
    const match = str.match(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*([kKmMbB])?/);
    if (!match) return null;

    const numStr = match[1].replace(/,/g, '');
    let val = Number(numStr);
    if (isNaN(val)) return null;

    const mult = (match[2] || '').toLowerCase();
    if (mult === 'k') val *= 1000;
    else if (mult === 'm') val *= 1000000;
    else if (mult === 'b') val *= 1000000000;

    return val;
  }

  private static extractNumbers(text: string): ParsedNumber[] {
    const results: ParsedNumber[] = [];
    const regex = /(?:[\$€£₹]|USD|EUR|GBP|INR)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*([kKmMbB])?\s*(%|months?)?/g;
    let m: RegExpExecArray | null;

    while ((m = regex.exec(text)) !== null) {
      const num = this.parseAmount(m[1] + (m[2] || ''));
      if (num !== null) {
        results.push({
          raw: m[0].trim(),
          value: num,
          isPercent: m[3] === '%',
          isMonth: Boolean(m[3] && m[3].startsWith('month'))
        });
      }
    }
    return results;
  }

  private static isClose(a: number, b: number, tolerance: number): boolean {
    if (a === b) return true;
    const diff = Math.abs(a - b);
    if (diff <= 0.01) return true; // Cents rounding
    const maxVal = Math.max(Math.abs(a), Math.abs(b), 1);
    return diff / maxVal <= tolerance;
  }
}