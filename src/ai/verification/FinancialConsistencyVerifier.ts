/**
 * FinancialConsistencyVerifier — Deterministic Financial Consistency & Attribution Integrity Layer (§AI-2.3)
 *
 * Validates semantic attribution, directional financial status, and entity-specific consistency
 * between financial claims in AI answers and authoritative context.
 *
 * Operates purely deterministically without any external network or LLM calls.
 *
 * Supported Validations:
 * 1. Category-specific spending vs budget limit attribution (prevents limit/spent confusion)
 * 2. Cross-category attribution (prevents attributing Category A numbers to Category B)
 * 3. Budget directional status integrity (over budget vs under budget consistency)
 * 4. Core KPI attribution (income vs expense vs net savings entity consistency)
 * 5. Cash flow status integrity (surplus vs deficit consistency)
 * 6. Goal attribution & completion status integrity (target vs current saved, funded status)
 * 7. Unrelated metric collision detection (preventing random KPI matches from validating claims)
 * 8. Historical trend direction consistency (spending increase vs decrease claims)
 * 9. Multi-claim sentence isolation (validating compound claims independently)
 * 10. Deduplication with AI-2.1 and AI-2.2 warnings and penalties
 */

export interface ConsistencyDiscrepancy {
  readonly claimType:
    | 'category_spent_mismatch'
    | 'category_limit_mismatch'
    | 'category_attribute_inversion'
    | 'category_cross_attribution'
    | 'budget_status_inversion'
    | 'kpi_income_mismatch'
    | 'kpi_expense_mismatch'
    | 'kpi_savings_mismatch'
    | 'cashflow_status_inversion'
    | 'goal_amount_mismatch'
    | 'goal_status_inversion'
    | 'trend_direction_inversion'
    | 'unrelated_metric_collision';
  readonly claimText: string;
  readonly claimedValue?: number | string;
  readonly expectedValue?: number | string;
  readonly entityName?: string;
  readonly sentenceContext: string;
  readonly reason: string;
}

export interface FinancialConsistencyResult {
  readonly isValid: boolean;
  readonly discrepancies: readonly ConsistencyDiscrepancy[];
  readonly warnings: readonly string[];
  readonly reasoning: readonly string[];
  readonly adjustedConfidence?: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
}

export interface ConsistencyVerificationOptions {
  readonly existingWarnings?: readonly string[];
  readonly existingReasoning?: readonly string[];
}

interface BudgetEntry {
  readonly category: string;
  readonly limit: number;
  readonly spent: number;
  readonly remaining: number;
  readonly overage: number;
  readonly isOverBudget: boolean;
  readonly currency: string;
}

interface GoalEntry {
  readonly goalName: string;
  readonly target: number;
  readonly current: number;
  readonly remaining: number;
  readonly progressPct: number;
  readonly isCompleted: boolean;
  readonly currency: string;
}

interface AuthoritativeConsistencyStore {
  readonly kpis: {
    readonly totalIncome: number | null;
    readonly totalExpense: number | null;
    readonly netSavings: number | null;
    readonly currentSavings: number | null;
    readonly savingsRate: number | null;
    readonly runwayMonths: number | null;
    readonly healthScore: number | null;
  };
  readonly budgets: Map<string, BudgetEntry>;
  readonly goals: Map<string, GoalEntry>;
  readonly trends: {
    readonly spendingDirection: 'increased' | 'decreased' | 'flat' | null;
    readonly priorSpending: number | null;
    readonly currentSpending: number | null;
  };
  readonly queryNumbers: Set<number>;
  readonly allMetricValues: Map<number, string[]>;
}

export class FinancialConsistencyVerifier {
  private static readonly CATEGORY_SYNONYMS: Record<string, string[]> = {
    food: ['food', 'dining', 'groceries', 'eating', 'restaurants', 'meals', 'supermarket'],
    housing: ['housing', 'rent', 'mortgage', 'lease', 'home'],
    utilities: ['utilities', 'bills', 'electricity', 'water', 'internet', 'power', 'gas'],
    transportation: ['transportation', 'transport', 'commute', 'gas', 'transit', 'car', 'fuel', 'auto'],
    entertainment: ['entertainment', 'leisure', 'fun', 'movies', 'recreation', 'outings'],
    shopping: ['shopping', 'clothes', 'clothing', 'retail', 'goods', 'purchases'],
    healthcare: ['healthcare', 'health', 'medical', 'medicine', 'doctor', 'fitness', 'wellness'],
    travel: ['travel', 'vacation', 'holiday', 'trip', 'flights', 'hotel'],
    personal: ['personal', 'selfcare', 'grooming'],
    education: ['education', 'tuition', 'courses', 'books']
  };

  /**
   * Main verification entry point.
   */
  static verify(
    query: string,
    answerText: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    currentConfidence?: { level: 'High' | 'Medium' | 'Low'; score: number },
    options?: ConsistencyVerificationOptions
  ): FinancialConsistencyResult {
    const store = this.buildAuthoritativeStore(query, context, toolOutputs);
    const sentences = answerText.split(/(?<=[.?!])\s+/);
    const existingWarns = options?.existingWarnings || [];

    const discrepancies: ConsistencyDiscrepancy[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    for (const sentence of sentences) {
      // 1. Skip educational frameworks & general benchmarks
      if (this.isEducationalOrBenchmark(sentence)) {
        continue;
      }

      // 2. Skip purely hypothetical / advisory recommendations
      if (this.isHypotheticalOrAdvisory(sentence)) {
        continue;
      }

      // 3. Category Spent, Limit & Cross-Attribution checks
      this.verifyCategoryAttribution(sentence, store, discrepancies);

      // 4. Budget Directional Status (Over vs Under budget claims)
      this.verifyBudgetStatus(sentence, store, discrepancies);

      // 5. Core Financial KPIs (Income, Expense, Net Savings, Surplus vs Deficit)
      this.verifyKpiClaims(sentence, store, discrepancies);

      // 6. Savings Goals (Current saved, Target, Completion status)
      this.verifyGoalClaims(sentence, store, discrepancies);

      // 7. Spending Trends (Directional increase / decrease)
      this.verifyTrendDirection(sentence, store, discrepancies);
    }

    // Filter out discrepancies that duplicate existing warnings from AI-2.1 or AI-2.2
    const unflaggedDiscrepancies: ConsistencyDiscrepancy[] = [];

    for (const disc of discrepancies) {
      const isAlreadyFlagged = existingWarns.some(w => {
        const wLower = w.toLowerCase();
        if (disc.claimedValue !== undefined && w.includes(String(disc.claimedValue))) {
          return true;
        }
        if (disc.entityName && wLower.includes(disc.entityName.toLowerCase()) && disc.claimedValue !== undefined && w.includes(String(disc.claimedValue))) {
          return true;
        }
        return false;
      });

      if (!isAlreadyFlagged) {
        unflaggedDiscrepancies.push(disc);
        warnings.push(`⚠️ Consistency Note: ${disc.reason}`);
        reasoning.push(`Consistency Integrity: Flagged ${disc.claimType.replace(/_/g, ' ')}: ${disc.reason}`);
      }
    }

    if (unflaggedDiscrepancies.length === 0) {
      return {
        isValid: true,
        discrepancies: [],
        warnings: [],
        reasoning: [],
        adjustedConfidence: currentConfidence
      };
    }

    // Adjust confidence for newly detected consistency discrepancies
    const baseScore = currentConfidence ? currentConfidence.score : 0.75;
    const penalty = Math.min(0.25 * unflaggedDiscrepancies.length, 0.50);
    const newScore = Math.max(0.10, Number((baseScore - penalty).toFixed(2)));
    let newLevel: 'High' | 'Medium' | 'Low' = 'High';
    if (newScore < 0.50) {
      newLevel = 'Low';
    } else if (newScore < 0.80) {
      newLevel = 'Medium';
    }

    return {
      isValid: false,
      discrepancies: unflaggedDiscrepancies,
      warnings,
      reasoning,
      adjustedConfidence: {
        level: newLevel,
        score: newScore
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Check 1: Category Spent & Limit Attribution Verification
  // ---------------------------------------------------------------------------

  private static verifyCategoryAttribution(
    sentence: string,
    store: AuthoritativeConsistencyStore,
    discrepancies: ConsistencyDiscrepancy[]
  ): void {
    if (store.budgets.size === 0) return;

    // Pattern A: "spent $X on [Category]" / "[Category] spending was $X" / "$X spent on [Category]"
    const spentPatterns = [
      /(?:spent|spending|used|expenses?|costs?|paid)\s+(?:about\s+|approx\w*\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?\s+(?:on|for|towards?|in)\s+([a-zA-Z\s]{3,25})/gi,
      /(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?\s+(?:was\s+|is\s+)?(?:spent|used|paid)\s+(?:on|for|towards?|in)\s+([a-zA-Z\s]{3,25})/gi,
      /\b([a-zA-Z\s]{3,25})\s+(?:spending|expenses?|costs?)\s+(?:was|is|reached|totaled|totalled|came to)\s+(?:about\s+|approx\w*\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?/gi
    ];

    for (const pattern of spentPatterns) {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(sentence)) !== null) {
        let rawVal: string;
        let mult: string;
        let catText: string;

        if (pattern === spentPatterns[2]) {
          catText = m[1].trim();
          rawVal = m[2];
          mult = m[3] || '';
        } else {
          rawVal = m[1];
          mult = m[2] || '';
          catText = m[3].trim();
        }

        const claimedVal = this.parseAmount(rawVal + mult);
        const resolvedKey = this.resolveCategoryKey(catText, store.budgets);
        if (claimedVal === null || !resolvedKey) continue;

        // Ignore query numbers
        if (store.queryNumbers.has(claimedVal) || this.isClose(claimedVal, Array.from(store.queryNumbers)[0] || -999, 0.01)) {
          continue;
        }

        // Ignore non-financial counts or dates
        if (claimedVal >= 2020 && claimedVal <= 2035) continue;

        const budget = store.budgets.get(resolvedKey)!;

        // 1. Is it the correct spent amount?
        if (this.isClose(claimedVal, budget.spent, 0.01)) {
          continue; // Valid
        }

        // 2. Is it the budget limit claimed as spending? (Attribute Inversion)
        if (this.isClose(claimedVal, budget.limit, 0.01)) {
          discrepancies.push({
            claimType: 'category_attribute_inversion',
            claimText: m[0].trim(),
            claimedValue: claimedVal,
            expectedValue: budget.spent,
            entityName: budget.category,
            sentenceContext: sentence,
            reason: `Reported $${claimedVal.toLocaleString()} spent on ${budget.category}, but $${claimedVal.toLocaleString()} is your budget limit (actual spending is $${budget.spent.toLocaleString()}).`
          });
          continue;
        }

        // 3. Does it match spending for another category? (Cross-Category Attribution)
        let crossCat: BudgetEntry | null = null;
        for (const other of store.budgets.values()) {
          if (other.category !== budget.category && this.isClose(claimedVal, other.spent, 0.01)) {
            crossCat = other;
            break;
          }
        }
        if (crossCat) {
          discrepancies.push({
            claimType: 'category_cross_attribution',
            claimText: m[0].trim(),
            claimedValue: claimedVal,
            expectedValue: budget.spent,
            entityName: budget.category,
            sentenceContext: sentence,
            reason: `Reported $${claimedVal.toLocaleString()} spent on ${budget.category}, but $${claimedVal.toLocaleString()} matches spending for ${crossCat.category} (actual ${budget.category} spending is $${budget.spent.toLocaleString()}).`
          });
          continue;
        }

        // 4. Does it match an unrelated KPI? (Unrelated Metric Collision)
        const collidingKpis = store.allMetricValues.get(claimedVal);
        if (collidingKpis && collidingKpis.length > 0) {
          discrepancies.push({
            claimType: 'unrelated_metric_collision',
            claimText: m[0].trim(),
            claimedValue: claimedVal,
            expectedValue: budget.spent,
            entityName: budget.category,
            sentenceContext: sentence,
            reason: `Reported $${claimedVal.toLocaleString()} spent on ${budget.category}, which collides with ${collidingKpis[0]} (actual ${budget.category} spending is $${budget.spent.toLocaleString()}).`
          });
          continue;
        }

        // 5. General mismatch
        discrepancies.push({
          claimType: 'category_spent_mismatch',
          claimText: m[0].trim(),
          claimedValue: claimedVal,
          expectedValue: budget.spent,
          entityName: budget.category,
          sentenceContext: sentence,
          reason: `Reported $${claimedVal.toLocaleString()} spent on ${budget.category}, but authoritative records show ${budget.category} spending is $${budget.spent.toLocaleString()}.`
        });
      }
    }

    // Pattern B: "[Category] budget is $X" / "budget limit of $X for [Category]"
    const limitPatterns = [
      /\b([a-zA-Z\s]{3,25})\s+budget\s+(?:limit\s+)?(?:is|of)\s+(?:about\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?/gi,
      /budget\s+(?:limit\s+)?(?:of|for)\s+([a-zA-Z\s]{3,25})\s+(?:is|at|set\s+at)\s+(?:about\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?/gi
    ];

    for (const pattern of limitPatterns) {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(sentence)) !== null) {
        const catText = m[1].trim();
        const rawVal = m[2];
        const mult = m[3] || '';
        const claimedVal = this.parseAmount(rawVal + mult);
        const resolvedKey = this.resolveCategoryKey(catText, store.budgets);
        if (claimedVal === null || !resolvedKey) continue;

        if (store.queryNumbers.has(claimedVal)) continue;

        const budget = store.budgets.get(resolvedKey)!;

        // Is it the correct budget limit?
        if (this.isClose(claimedVal, budget.limit, 0.01)) {
          continue; // Valid
        }

        // Is it the spent amount claimed as budget limit?
        if (this.isClose(claimedVal, budget.spent, 0.01)) {
          discrepancies.push({
            claimType: 'category_attribute_inversion',
            claimText: m[0].trim(),
            claimedValue: claimedVal,
            expectedValue: budget.limit,
            entityName: budget.category,
            sentenceContext: sentence,
            reason: `Reported ${budget.category} budget limit as $${claimedVal.toLocaleString()}, but $${claimedVal.toLocaleString()} is your actual spending (budget limit is $${budget.limit.toLocaleString()}).`
          });
          continue;
        }

        // Limit mismatch
        discrepancies.push({
          claimType: 'category_limit_mismatch',
          claimText: m[0].trim(),
          claimedValue: claimedVal,
          expectedValue: budget.limit,
          entityName: budget.category,
          sentenceContext: sentence,
          reason: `Reported ${budget.category} budget limit as $${claimedVal.toLocaleString()}, but authoritative records show limit is $${budget.limit.toLocaleString()}.`
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 2: Budget Directional Status Integrity (Over vs Under Budget)
  // ---------------------------------------------------------------------------

  private static verifyBudgetStatus(
    sentence: string,
    store: AuthoritativeConsistencyStore,
    discrepancies: ConsistencyDiscrepancy[]
  ): void {
    if (store.budgets.size === 0) return;
    const sLower = sentence.toLowerCase();

    for (const [key, budget] of store.budgets.entries()) {
      const reg = new RegExp(`\\b${key}\\b`, 'i');
      if (!reg.test(sentence)) continue;

      // Over budget claims
      const isClaimedOver =
        sLower.includes('over budget') ||
        sLower.includes('exceeded your budget') ||
        sLower.includes('exceeded the budget') ||
        sLower.includes('over the budget') ||
        sLower.includes('budget overage');

      if (isClaimedOver && !budget.isOverBudget) {
        discrepancies.push({
          claimType: 'budget_status_inversion',
          claimText: `Claimed ${budget.category} is over budget`,
          claimedValue: 'over budget',
          expectedValue: 'within budget',
          entityName: budget.category,
          sentenceContext: sentence,
          reason: `Claimed ${budget.category} is over budget, but spending ($${budget.spent.toLocaleString()}) is within the budget limit of $${budget.limit.toLocaleString()}.`
        });
        continue;
      }

      // Under budget / within budget claims
      const isClaimedUnder =
        sLower.includes('under budget') ||
        sLower.includes('within budget') ||
        sLower.includes('within your budget') ||
        sLower.includes('under your budget') ||
        sLower.includes('stayed within');

      if (isClaimedUnder && budget.isOverBudget) {
        discrepancies.push({
          claimType: 'budget_status_inversion',
          claimText: `Claimed ${budget.category} is within budget`,
          claimedValue: 'within budget',
          expectedValue: 'over budget',
          entityName: budget.category,
          sentenceContext: sentence,
          reason: `Claimed ${budget.category} is within budget, but spending ($${budget.spent.toLocaleString()}) has exceeded the budget limit of $${budget.limit.toLocaleString()} by $${budget.overage.toLocaleString()}.`
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 3: Core Financial KPIs & Cash Flow Integrity
  // ---------------------------------------------------------------------------

  private static verifyKpiClaims(
    sentence: string,
    store: AuthoritativeConsistencyStore,
    discrepancies: ConsistencyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // 1. Total Income
    if (store.kpis.totalIncome !== null) {
      const incPatterns = [
        /(?:total\s+)?income\s+(?:was|is|totaled|of)\s+(?:about\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?/gi,
        /(?:earned|brought\s+in|received)\s+(?:a\s+total\s+of\s+)?(?:about\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?/gi
      ];
      for (const pattern of incPatterns) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(sentence)) !== null) {
          const claimedVal = this.parseAmount(m[1] + (m[2] || ''));
          if (claimedVal === null || store.queryNumbers.has(claimedVal)) continue;

          if (this.isClose(claimedVal, store.kpis.totalIncome, 0.01)) {
            continue; // Valid
          }

          if (store.kpis.totalExpense !== null && this.isClose(claimedVal, store.kpis.totalExpense, 0.01)) {
            discrepancies.push({
              claimType: 'kpi_income_mismatch',
              claimText: m[0].trim(),
              claimedValue: claimedVal,
              expectedValue: store.kpis.totalIncome,
              entityName: 'Total Income',
              sentenceContext: sentence,
              reason: `Stated total income is $${claimedVal.toLocaleString()}, which conflates income with total expenses (authoritative income is $${store.kpis.totalIncome.toLocaleString()}).`
            });
            continue;
          }

          discrepancies.push({
            claimType: 'kpi_income_mismatch',
            claimText: m[0].trim(),
            claimedValue: claimedVal,
            expectedValue: store.kpis.totalIncome,
            entityName: 'Total Income',
            sentenceContext: sentence,
            reason: `Stated total income is $${claimedVal.toLocaleString()}, but authoritative income is $${store.kpis.totalIncome.toLocaleString()}.`
          });
        }
      }
    }

    // 2. Total Expenses
    if (store.kpis.totalExpense !== null) {
      const expPatterns = [
        /(?:total\s+)?(?:expenses?|spending)\s+(?:was|is|totaled|of)\s+(?:about\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?/gi,
        /spent\s+a\s+total\s+of\s+(?:about\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?/gi
      ];
      for (const pattern of expPatterns) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(sentence)) !== null) {
          const claimedVal = this.parseAmount(m[1] + (m[2] || ''));
          if (claimedVal === null || store.queryNumbers.has(claimedVal)) continue;

          // Guard against category-specific expenses like "Housing expense of $1,500"
          const prefix = sentence.slice(0, m.index).trim().toLowerCase();
          if (Array.from(store.budgets.values()).some(b => prefix.endsWith(b.category.toLowerCase()) || prefix.includes(b.category.toLowerCase()))) {
            continue;
          }

          if (this.isClose(claimedVal, store.kpis.totalExpense, 0.01)) {
            continue; // Valid
          }

          if (store.kpis.totalIncome !== null && this.isClose(claimedVal, store.kpis.totalIncome, 0.01)) {
            discrepancies.push({
              claimType: 'kpi_expense_mismatch',
              claimText: m[0].trim(),
              claimedValue: claimedVal,
              expectedValue: store.kpis.totalExpense,
              entityName: 'Total Expenses',
              sentenceContext: sentence,
              reason: `Stated total expenses as $${claimedVal.toLocaleString()}, which conflates expenses with income (authoritative expenses are $${store.kpis.totalExpense.toLocaleString()}).`
            });
            continue;
          }

          discrepancies.push({
            claimType: 'kpi_expense_mismatch',
            claimText: m[0].trim(),
            claimedValue: claimedVal,
            expectedValue: store.kpis.totalExpense,
            entityName: 'Total Expenses',
            sentenceContext: sentence,
            reason: `Stated total expenses as $${claimedVal.toLocaleString()}, but authoritative expenses are $${store.kpis.totalExpense.toLocaleString()}.`
          });
        }
      }
    }

    // 3. Cash Flow Directional Status (Deficit vs Surplus)
    if (store.kpis.netSavings !== null) {
      const isClaimedDeficit =
        sLower.includes('deficit') ||
        sLower.includes('negative cash flow') ||
        sLower.includes('negative savings') ||
        sLower.includes('spending more than you earn') ||
        sLower.includes('operating at a loss');

      if (isClaimedDeficit && store.kpis.netSavings > 0) {
        discrepancies.push({
          claimType: 'cashflow_status_inversion',
          claimText: 'Claimed financial deficit',
          claimedValue: 'deficit',
          expectedValue: 'surplus',
          entityName: 'Net Cash Flow',
          sentenceContext: sentence,
          reason: `Asserted a financial deficit or negative savings, but net cash flow is positive (+$${store.kpis.netSavings.toLocaleString()}).`
        });
      }

      const isClaimedSurplus =
        sLower.includes('surplus') ||
        sLower.includes('positive cash flow') ||
        sLower.includes('net positive');

      if (isClaimedSurplus && store.kpis.netSavings < 0) {
        discrepancies.push({
          claimType: 'cashflow_status_inversion',
          claimText: 'Claimed financial surplus',
          claimedValue: 'surplus',
          expectedValue: 'deficit',
          entityName: 'Net Cash Flow',
          sentenceContext: sentence,
          reason: `Asserted a financial surplus, but net cash flow is in deficit (-$${Math.abs(store.kpis.netSavings).toLocaleString()}).`
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 4: Savings Goals Attribution & Status Integrity
  // ---------------------------------------------------------------------------

  private static verifyGoalClaims(
    sentence: string,
    store: AuthoritativeConsistencyStore,
    discrepancies: ConsistencyDiscrepancy[]
  ): void {
    if (store.goals.size === 0) return;
    const sLower = sentence.toLowerCase();

    for (const goal of store.goals.values()) {
      const goalRegex = new RegExp(`\\b${this.escapeRegex(goal.goalName)}\\b`, 'i');
      if (!goalRegex.test(sentence)) continue;

      // 1. Goal Completion Status
      const isClaimedComplete =
        sLower.includes('fully funded') ||
        sLower.includes('completed') ||
        sLower.includes('achieved your goal') ||
        sLower.includes('reached your goal') ||
        sLower.includes('goal has been reached');

      if (isClaimedComplete && !goal.isCompleted) {
        discrepancies.push({
          claimType: 'goal_status_inversion',
          claimText: `Claimed ${goal.goalName} goal is completed`,
          claimedValue: 'completed',
          expectedValue: 'in progress',
          entityName: goal.goalName,
          sentenceContext: sentence,
          reason: `Claimed ${goal.goalName} goal is completed, but current savings ($${goal.current.toLocaleString()}) is below the target ($${goal.target.toLocaleString()}).`
        });
        continue;
      }

      // 2. Goal Saved Amount: "saved $X toward(s) [Goal]"
      const curPattern = /(?:saved|accumulated|have)\s+(?:about\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?\s+(?:in|for|toward|towards)\s+(?:the\s+|your\s+)?/gi;
      let curMatch: RegExpExecArray | null;
      while ((curMatch = curPattern.exec(sentence)) !== null) {
        const claimedVal = this.parseAmount(curMatch[1] + (curMatch[2] || ''));
        if (claimedVal === null || store.queryNumbers.has(claimedVal)) continue;

        if (this.isClose(claimedVal, goal.current, 0.01)) {
          continue; // Valid
        }

        // Did it confuse target with current?
        if (this.isClose(claimedVal, goal.target, 0.01)) {
          discrepancies.push({
            claimType: 'goal_amount_mismatch',
            claimText: curMatch[0].trim(),
            claimedValue: claimedVal,
            expectedValue: goal.current,
            entityName: goal.goalName,
            sentenceContext: sentence,
            reason: `Reported $${claimedVal.toLocaleString()} saved for ${goal.goalName}, but $${claimedVal.toLocaleString()} is the target amount (currently saved is $${goal.current.toLocaleString()}).`
          });
          continue;
        }

        // Did it match another goal's current amount?
        let otherGoal: GoalEntry | null = null;
        for (const og of store.goals.values()) {
          if (og.goalName !== goal.goalName && this.isClose(claimedVal, og.current, 0.01)) {
            otherGoal = og;
            break;
          }
        }
        if (otherGoal) {
          discrepancies.push({
            claimType: 'goal_amount_mismatch',
            claimText: curMatch[0].trim(),
            claimedValue: claimedVal,
            expectedValue: goal.current,
            entityName: goal.goalName,
            sentenceContext: sentence,
            reason: `Reported $${claimedVal.toLocaleString()} saved for ${goal.goalName}, which belongs to another goal (${otherGoal.goalName}; actual saved is $${goal.current.toLocaleString()}).`
          });
          continue;
        }

        discrepancies.push({
          claimType: 'goal_amount_mismatch',
          claimText: curMatch[0].trim(),
          claimedValue: claimedVal,
          expectedValue: goal.current,
          entityName: goal.goalName,
          sentenceContext: sentence,
          reason: `Reported $${claimedVal.toLocaleString()} saved for ${goal.goalName}, but authoritative current savings is $${goal.current.toLocaleString()}.`
        });
      }

      // 3. Goal Target Amount: "[Goal] target is $X"
      const tarPattern = /target\s+(?:is|of)\s+(?:about\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?/gi;
      let tarMatch: RegExpExecArray | null;
      while ((tarMatch = tarPattern.exec(sentence)) !== null) {
        const claimedVal = this.parseAmount(tarMatch[1] + (tarMatch[2] || ''));
        if (claimedVal === null || store.queryNumbers.has(claimedVal)) continue;

        if (this.isClose(claimedVal, goal.target, 0.01)) {
          continue; // Valid
        }

        if (this.isClose(claimedVal, goal.current, 0.01)) {
          discrepancies.push({
            claimType: 'goal_amount_mismatch',
            claimText: tarMatch[0].trim(),
            claimedValue: claimedVal,
            expectedValue: goal.target,
            entityName: goal.goalName,
            sentenceContext: sentence,
            reason: `Reported ${goal.goalName} target as $${claimedVal.toLocaleString()}, but $${claimedVal.toLocaleString()} is the currently saved amount (target is $${goal.target.toLocaleString()}).`
          });
          continue;
        }

        discrepancies.push({
          claimType: 'goal_amount_mismatch',
          claimText: tarMatch[0].trim(),
          claimedValue: claimedVal,
          expectedValue: goal.target,
          entityName: goal.goalName,
          sentenceContext: sentence,
          reason: `Reported ${goal.goalName} target as $${claimedVal.toLocaleString()}, but authoritative target is $${goal.target.toLocaleString()}.`
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 5: Historical Trend Direction Consistency
  // ---------------------------------------------------------------------------

  private static verifyTrendDirection(
    sentence: string,
    store: AuthoritativeConsistencyStore,
    discrepancies: ConsistencyDiscrepancy[]
  ): void {
    if (!store.trends.spendingDirection) return;
    const sLower = sentence.toLowerCase();

    // Spending increased claims
    const isClaimedIncrease =
      sLower.includes('spending increased') ||
      sLower.includes('spending rose') ||
      sLower.includes('spending went up') ||
      sLower.includes('expenses increased');

    if (isClaimedIncrease && store.trends.spendingDirection === 'decreased') {
      discrepancies.push({
        claimType: 'trend_direction_inversion',
        claimText: 'Claimed spending increased',
        claimedValue: 'increase',
        expectedValue: 'decrease',
        entityName: 'Spending Trend',
        sentenceContext: sentence,
        reason: 'Claimed spending increased, but authoritative historical records indicate spending decreased.'
      });
      return;
    }

    // Spending decreased claims
    const isClaimedDecrease =
      sLower.includes('spending decreased') ||
      sLower.includes('spending dropped') ||
      sLower.includes('spending fell') ||
      sLower.includes('expenses decreased');

    if (isClaimedDecrease && store.trends.spendingDirection === 'increased') {
      discrepancies.push({
        claimType: 'trend_direction_inversion',
        claimText: 'Claimed spending decreased',
        claimedValue: 'decrease',
        expectedValue: 'increase',
        entityName: 'Spending Trend',
        sentenceContext: sentence,
        reason: 'Claimed spending decreased, but authoritative historical records indicate spending increased.'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Store Builder & Utilities
  // ---------------------------------------------------------------------------

  private static buildAuthoritativeStore(
    query: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>
  ): AuthoritativeConsistencyStore {
    const kpisRaw = context?.kpis || toolOutputs?.analytics?.kpis || toolOutputs?.health || {};
    const budgetList: any[] = toolOutputs?.budget?.budgets || context?.budgets || [];
    const goalList: any[] = toolOutputs?.goal?.savings || context?.savings || [];
    const trendsRaw = toolOutputs?.trends || context?.trends || {};

    const budgets = new Map<string, BudgetEntry>();
    const goals = new Map<string, GoalEntry>();
    const allMetricValues = new Map<number, string[]>();
    const queryNumbers = new Set<number>();

    // Extract query numbers
    const qMatches = query.match(/(?:[\$€£₹]|USD)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*([kKmMbB])?/g);
    if (qMatches) {
      for (const q of qMatches) {
        const val = this.parseAmount(q);
        if (val !== null) queryNumbers.add(val);
      }
    }

    const registerMetric = (val: number | null, label: string) => {
      if (val === null || isNaN(val)) return;
      const list = allMetricValues.get(val) || [];
      list.push(label);
      allMetricValues.set(val, list);
    };

    // KPIs
    const totalIncome = this.parseAmount(kpisRaw.totalIncome);
    const totalExpense = this.parseAmount(kpisRaw.totalExpense);
    const netSavings = this.parseAmount(kpisRaw.netSavings);
    const currentSavings = this.parseAmount(kpisRaw.currentSavings);
    const savingsRate = kpisRaw.savingsRate !== undefined ? Number(kpisRaw.savingsRate) : null;
    const runwayMonths = kpisRaw.runwayMonths !== undefined ? Number(kpisRaw.runwayMonths) : null;
    const healthScore = kpisRaw.overallHealthScore !== undefined ? Number(kpisRaw.overallHealthScore) : null;

    registerMetric(totalIncome, 'Total Income');
    registerMetric(totalExpense, 'Total Expenses');
    registerMetric(netSavings, 'Net Savings');
    registerMetric(currentSavings, 'Total Savings');

    // Budgets
    if (Array.isArray(budgetList)) {
      for (const b of budgetList) {
        const cat = String(b.category || b.cat || 'general').trim();
        const catKey = cat.toLowerCase();
        const limit = this.parseAmount(b.limit !== undefined ? b.limit : b.lim) || 0;
        const spent = this.parseAmount(b.spent) || 0;
        const remaining = Math.max(0, limit - spent);
        const overage = Math.max(0, spent - limit);
        const isOverBudget = spent > limit;
        const currency = b.currency || 'USD';

        budgets.set(catKey, {
          category: cat,
          limit,
          spent,
          remaining,
          overage,
          isOverBudget,
          currency
        });

        registerMetric(spent, `${cat} Spent`);
        registerMetric(limit, `${cat} Budget Limit`);
      }
    }

    // Goals
    if (Array.isArray(goalList)) {
      for (const g of goalList) {
        const name = String(g.goalName || g.name || 'goal').trim();
        const nameKey = name.toLowerCase();
        const target = this.parseAmount(g.targetAmount || g.tar) || 0;
        const current = this.parseAmount(g.currentAmount || g.cur) || 0;
        const remaining = Math.max(0, target - current);
        const progressPct = target > 0 ? (current / target) * 100 : 0;
        const isCompleted = current >= target && target > 0;
        const currency = g.currency || 'USD';

        goals.set(nameKey, {
          goalName: name,
          target,
          current,
          remaining,
          progressPct,
          isCompleted,
          currency
        });

        registerMetric(current, `${name} Current Saved`);
        registerMetric(target, `${name} Target`);
      }
    }

    // Trends
    let spendingDirection: 'increased' | 'decreased' | 'flat' | null = null;
    const priorSpending = this.parseAmount(trendsRaw.priorSpending || trendsRaw.lastMonthSpending);
    const currentSpending = this.parseAmount(trendsRaw.currentSpending || kpisRaw.totalExpense);

    if (priorSpending !== null && currentSpending !== null) {
      if (currentSpending > priorSpending * 1.01) spendingDirection = 'increased';
      else if (currentSpending < priorSpending * 0.99) spendingDirection = 'decreased';
      else spendingDirection = 'flat';
    } else if (trendsRaw.direction) {
      const d = String(trendsRaw.direction).toLowerCase();
      if (d.includes('increase') || d.includes('up')) spendingDirection = 'increased';
      else if (d.includes('decrease') || d.includes('down')) spendingDirection = 'decreased';
      else spendingDirection = 'flat';
    }

    return {
      kpis: {
        totalIncome,
        totalExpense,
        netSavings,
        currentSavings,
        savingsRate,
        runwayMonths,
        healthScore
      },
      budgets,
      goals,
      trends: {
        spendingDirection,
        priorSpending,
        currentSpending
      },
      queryNumbers,
      allMetricValues
    };
  }

  private static resolveCategoryKey(rawText: string, budgets: Map<string, BudgetEntry>): string | null {
    const textLower = rawText.toLowerCase().trim();

    // 1. Direct match
    if (budgets.has(textLower)) return textLower;

    // 2. Substring match against known budget keys
    for (const key of budgets.keys()) {
      if (textLower.includes(key) || key.includes(textLower)) return key;
    }

    // 3. Synonym matching
    for (const [canonical, synonyms] of Object.entries(this.CATEGORY_SYNONYMS)) {
      if (synonyms.some(s => textLower.includes(s))) {
        if (budgets.has(canonical)) return canonical;
        for (const key of budgets.keys()) {
          if (synonyms.some(s => key.includes(s))) return key;
        }
      }
    }

    return null;
  }

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

  private static isHypotheticalOrAdvisory(sentence: string): boolean {
    const sLower = sentence.toLowerCase();
    return (
      sLower.includes('could save') ||
      sLower.includes('would save') ||
      sLower.includes('might save') ||
      sLower.includes('could reduce') ||
      sLower.includes('aim to') ||
      sLower.includes('try to keep') ||
      sLower.includes('consider setting aside') ||
      sLower.includes('if you cut') ||
      sLower.includes('if you allocate') ||
      sLower.includes('suggested target') ||
      sLower.includes('hypothetically') ||
      sLower.includes('for example, if')
    );
  }

  private static parseAmount(raw: any): number | null {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'number') return isNaN(raw) ? null : raw;

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

  private static isClose(a: number, b: number, tolerance: number): boolean {
    if (a === b) return true;
    const diff = Math.abs(a - b);
    if (diff <= 1.0) return true; // Dollar rounding tolerance
    const maxVal = Math.max(Math.abs(a), Math.abs(b), 1);
    return diff / maxVal <= tolerance;
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
