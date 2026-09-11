/**
 * FinancialFeasibilityVerifier — Deterministic Financial Feasibility & Advisory Constraint Layer (§AI-2.4)
 *
 * Validates forward-looking feasibility, advisory constraints, affordability decisions,
 * and temporal cadence consistency in AI-generated answers against authoritative context.
 *
 * Operates purely deterministically without any external network or LLM calls.
 *
 * Supported Validations:
 * 1. Purchase Affordability & Insolvency (purchase cost > liquid savings)
 * 2. Emergency Runway Depletion (post-purchase runway < 3.0 safe months threshold)
 * 3. False Unaffordable Claims (claiming an easily affordable item is unaffordable)
 * 4. Recurring Savings Recommendation Feasibility (recommended monthly savings > net disposable surplus)
 * 5. Deficit Savings/Investment Warning (advising new investments while user has negative net cash flow)
 * 6. Excessive Category Budget Reduction (recommending cuts > 100% of actual category spending)
 * 7. Cadence & Annualization Inversion (conflating monthly with annual figures without 12x factor)
 * 8. Infeasible 1-Year Savings Projection (12 * monthly savings != projected 1-year total)
 * 9. Insolvent Debt Payoff from Savings (advising paying debt in full from savings when savings < debt)
 * 10. Deduplication with AI-2.1, AI-2.2, and AI-2.3 warnings and penalties
 */

export interface FeasibilityDiscrepancy {
  readonly claimType:
    | 'unaffordable_purchase_claim'
    | 'false_unaffordable_claim'
    | 'excessive_savings_recommendation'
    | 'deficit_investment_recommendation'
    | 'excessive_budget_reduction_claim'
    | 'cadence_annualization_inversion'
    | 'infeasible_savings_projection'
    | 'insolvent_debt_payoff_claim';
  readonly claimText: string;
  readonly claimedValue?: number | string;
  readonly constraintValue?: number | string;
  readonly entityName?: string;
  readonly sentenceContext: string;
  readonly reason: string;
}

export interface FinancialFeasibilityResult {
  readonly isValid: boolean;
  readonly discrepancies: readonly FeasibilityDiscrepancy[];
  readonly warnings: readonly string[];
  readonly reasoning: readonly string[];
  readonly adjustedConfidence?: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
}

export interface FeasibilityVerificationOptions {
  readonly existingWarnings?: readonly string[];
  readonly existingReasoning?: readonly string[];
}

interface BudgetEntry {
  readonly category: string;
  readonly limit: number;
  readonly spent: number;
}

interface AuthoritativeFeasibilityStore {
  readonly currentSavings: number;
  readonly monthlyExpenses: number;
  readonly monthlyIncome: number;
  readonly netSavings: number;
  readonly currentRunway: number;
  readonly safeRunwayThreshold: number;
  readonly budgets: Map<string, BudgetEntry>;
  readonly queryNumbers: Set<number>;
  readonly queryText: string;
}

export class FinancialFeasibilityVerifier {
  private static readonly SAFE_RUNWAY_MONTHS = 3.0;

  /**
   * Main verification entry point.
   */
  static verify(
    query: string,
    answerText: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    currentConfidence?: { level: 'High' | 'Medium' | 'Low'; score: number },
    options?: FeasibilityVerificationOptions
  ): FinancialFeasibilityResult {
    const store = this.buildAuthoritativeStore(query, context, toolOutputs);
    const sentences = answerText.split(/(?<=[.?!])\s+/);
    const existingWarns = options?.existingWarnings || [];

    const discrepancies: FeasibilityDiscrepancy[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    for (const sentence of sentences) {
      // 1. Skip educational frameworks & benchmark rules of thumb
      if (this.isEducationalOrBenchmark(sentence)) {
        continue;
      }

      // 2. Skip conditional hypotheticals ("If your income doubles", "If you receive a bonus")
      if (this.isConditionalHypothetical(sentence)) {
        continue;
      }

      // 3. Validate Purchase Affordability & Liquidity Constraints
      this.validateAffordability(sentence, store, discrepancies);

      // 4. Validate Recurring Savings & Investment Recommendations against Surplus
      this.validateRecurringRecommendations(sentence, store, discrepancies);

      // 5. Validate Category Budget Reduction Feasibility
      this.validateBudgetReductionFeasibility(sentence, store, discrepancies);

      // 6. Validate Cadence & Annualization Consistency (Monthly vs Annual)
      this.validateCadenceAndProjections(sentence, store, discrepancies);

      // 7. Validate Debt Payoff from Savings Insolvency
      this.validateDebtPayoffFromSavings(sentence, store, discrepancies);
    }

    // Filter out discrepancies that duplicate existing warnings from earlier tiers
    const unflaggedDiscrepancies: FeasibilityDiscrepancy[] = [];

    for (const disc of discrepancies) {
      const isAlreadyFlagged = existingWarns.some(w => {
        const cleanW = w.replace(/,/g, '');
        if (disc.claimedValue !== undefined && cleanW.includes(String(disc.claimedValue))) {
          return true;
        }
        if (disc.entityName && w.toLowerCase().includes(disc.entityName.toLowerCase()) && disc.claimedValue !== undefined && cleanW.includes(String(disc.claimedValue))) {
          return true;
        }
        return false;
      });

      if (!isAlreadyFlagged) {
        unflaggedDiscrepancies.push(disc);
        warnings.push(`⚠️ Feasibility Note: ${disc.reason}`);
        reasoning.push(`Feasibility Integrity: Flagged ${disc.claimType.replace(/_/g, ' ')}: ${disc.reason}`);
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

    // Adjust confidence for newly detected feasibility discrepancies
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
  // Check 1: Purchase Affordability & Liquidity Constraints
  // ---------------------------------------------------------------------------

  private static validateAffordability(
    sentence: string,
    store: AuthoritativeFeasibilityStore,
    discrepancies: FeasibilityDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Check if sentence makes an affordability claim
    const isAffordableClaim =
      (sLower.includes('can afford') ||
        sLower.includes('is affordable') ||
        sLower.includes('safe to buy') ||
        sLower.includes('go ahead and buy') ||
        sLower.includes('yes, you can buy') ||
        sLower.includes('easily afford')) &&
      !sLower.includes('cannot afford') &&
      !sLower.includes('can not afford') &&
      !sLower.includes("can't afford");

    const isUnaffordableClaim =
      sLower.includes('cannot afford') ||
      sLower.includes('can not afford') ||
      sLower.includes("can't afford") ||
      sLower.includes('is unaffordable') ||
      sLower.includes('not recommended right now') ||
      sLower.includes('not affordable');

    if (!isAffordableClaim && !isUnaffordableClaim) return;

    // Determine target purchase amount: look in sentence, else look in query
    let purchaseAmount = this.extractPurchaseAmount(sentence);
    if (purchaseAmount === null) {
      purchaseAmount = this.extractPurchaseAmount(store.queryText);
    }
    if (purchaseAmount === null || purchaseAmount <= 0) return;

    // Ignore calendar years
    if (purchaseAmount >= 2020 && purchaseAmount <= 2035) return;

    const remainingSavings = store.currentSavings - purchaseAmount;
    const postRunway = store.monthlyExpenses > 0 ? remainingSavings / store.monthlyExpenses : 0;
    const trulyAffordable = remainingSavings >= 0 && postRunway >= store.safeRunwayThreshold;

    if (isAffordableClaim && !trulyAffordable) {
      if (remainingSavings < 0) {
        discrepancies.push({
          claimType: 'unaffordable_purchase_claim',
          claimText: sentence.trim(),
          claimedValue: purchaseAmount,
          constraintValue: store.currentSavings,
          entityName: 'Purchase Affordability',
          sentenceContext: sentence,
          reason: `Asserted the purchase of $${purchaseAmount.toLocaleString()} is affordable, but current liquid savings ($${store.currentSavings.toLocaleString()}) is insufficient to cover the cost.`
        });
      } else {
        discrepancies.push({
          claimType: 'unaffordable_purchase_claim',
          claimText: sentence.trim(),
          claimedValue: purchaseAmount,
          constraintValue: Number(postRunway.toFixed(2)),
          entityName: 'Runway Depletion',
          sentenceContext: sentence,
          reason: `Asserted the purchase of $${purchaseAmount.toLocaleString()} is affordable, but it reduces emergency runway to ${postRunway.toFixed(1)} months, falling below the safe ${store.safeRunwayThreshold}-month reserve threshold.`
        });
      }
    } else if (isUnaffordableClaim && trulyAffordable) {
      // Flag false negative where AI claims a completely affordable purchase is impossible
      discrepancies.push({
        claimType: 'false_unaffordable_claim',
        claimText: sentence.trim(),
        claimedValue: purchaseAmount,
        constraintValue: Number(postRunway.toFixed(2)),
        entityName: 'Purchase Affordability',
        sentenceContext: sentence,
        reason: `Claimed the purchase of $${purchaseAmount.toLocaleString()} is unaffordable, but remaining savings ($${remainingSavings.toLocaleString()}) maintains a safe emergency runway of ${postRunway.toFixed(1)} months (>= ${store.safeRunwayThreshold} months).`
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 2: Recurring Savings Recommendations vs Disposable Surplus
  // ---------------------------------------------------------------------------

  private static validateRecurringRecommendations(
    sentence: string,
    store: AuthoritativeFeasibilityStore,
    discrepancies: FeasibilityDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Look for recurring savings recommendation patterns:
    // "save an extra/additional $X per month" / "contribute $X monthly" / "set aside $X a month"
    const recPatterns = [
      /(?:save|contribute|set\s+aside|allocate|invest)\s+(?:an\s+(?:extra|additional)\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?\s*(?:per\s+month|each\s+month|every\s+month|monthly|a\s+month)/gi,
      /(?:monthly\s+savings|monthly\s+contribution|monthly\s+deposit)\s+(?:of|at)\s+(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?/gi
    ];

    for (const pattern of recPatterns) {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(sentence)) !== null) {
        const amt = this.parseAmount(m[1] + (m[2] || ''));
        if (amt === null || amt <= 0) continue;

        // Skip if this number was in the user query, UNLESS the AI is affirmatively advising/recommending saving this amount
        if (store.queryNumbers.has(amt)) {
          const isAffirmative = /(?:you\s+should|you\s+can|recommend|advise|suggest|encouraged\s+to|feasible|yes,)/i.test(sentence);
          if (!isAffirmative) continue;
        }

        // Ignore non-financial counts or dates
        if (amt >= 2020 && amt <= 2035) continue;

        // 1. User is running a net monthly deficit:
        if (store.netSavings < 0) {
          discrepancies.push({
            claimType: 'deficit_investment_recommendation',
            claimText: m[0].trim(),
            claimedValue: amt,
            constraintValue: store.netSavings,
            entityName: 'Monthly Surplus',
            sentenceContext: sentence,
            reason: `Recommended recurring savings of $${amt.toLocaleString()}/month, but the user is operating at a monthly cash flow deficit (-$${Math.abs(store.netSavings).toLocaleString()}/month).`
          });
          continue;
        }

        // 2. Recommendation exceeds monthly disposable surplus:
        if (store.netSavings > 0 && amt > store.netSavings * 1.05) {
          discrepancies.push({
            claimType: 'excessive_savings_recommendation',
            claimText: m[0].trim(),
            claimedValue: amt,
            constraintValue: store.netSavings,
            entityName: 'Monthly Surplus',
            sentenceContext: sentence,
            reason: `Recommended recurring savings of $${amt.toLocaleString()}/month, which exceeds the user's available monthly net surplus of $${store.netSavings.toLocaleString()}/month.`
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 3: Category Budget Reduction Feasibility
  // ---------------------------------------------------------------------------

  private static validateBudgetReductionFeasibility(
    sentence: string,
    store: AuthoritativeFeasibilityStore,
    discrepancies: FeasibilityDiscrepancy[]
  ): void {
    if (store.budgets.size === 0) return;

    // Pattern: "cut/reduce your [Category] spending by $X" or "reduce [Category] by $X"
    const cutPatterns = [
      /(?:cut|reduce|trim|decrease|lower)\s+(?:your\s+)?([a-zA-Z\s]{3,20}?)\s+(?:spending|expenses?|budget)?\s+by\s+(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)(?:\s*([kKmMbB])(?![a-zA-Z]))?/gi,
      /(?:save|shave\s+off)\s+(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)(?:\s*([kKmMbB])(?![a-zA-Z]))?\s+(?:from|on|by\s+cutting)\s+(?:your\s+)?([a-zA-Z\s]{3,20}?)/gi
    ];

    for (const pattern of cutPatterns) {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(sentence)) !== null) {
        let catText: string;
        let rawAmt: string;
        let mult: string;

        if (pattern === cutPatterns[0]) {
          catText = m[1].trim();
          rawAmt = m[2];
          mult = m[3] || '';
        } else {
          rawAmt = m[1];
          mult = m[2] || '';
          catText = m[3].trim();
        }

        const cutAmt = this.parseAmount(rawAmt + mult);
        const resolvedKey = this.resolveCategoryKey(catText, store.budgets);
        if (cutAmt === null || !resolvedKey) continue;

        const budget = store.budgets.get(resolvedKey)!;

        // If cut amount exceeds 100% of actual category spending:
        if (budget.spent > 0 && cutAmt > budget.spent * 1.05) {
          discrepancies.push({
            claimType: 'excessive_budget_reduction_claim',
            claimText: m[0].trim(),
            claimedValue: cutAmt,
            constraintValue: budget.spent,
            entityName: budget.category,
            sentenceContext: sentence,
            reason: `Recommended reducing ${budget.category} spending by $${cutAmt.toLocaleString()}, but actual ${budget.category} spending is only $${budget.spent.toLocaleString()}. A reduction cannot exceed total spending.`
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 4: Cadence & Annualization Consistency
  // ---------------------------------------------------------------------------

  private static validateCadenceAndProjections(
    sentence: string,
    store: AuthoritativeFeasibilityStore,
    discrepancies: FeasibilityDiscrepancy[]
  ): void {
    // 1. Conflating monthly income with annual income:
    if (store.monthlyIncome > 0) {
      const annualIncPattern = /(?:annual\s+income|yearly\s+income|earn\s+annually|earn\s+a\s+year)\s+(?:is|are|of|totaling)?\s*(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)(?:\s*([kKmMbB])(?![a-zA-Z]))?/gi;
      let m: RegExpExecArray | null;
      while ((m = annualIncPattern.exec(sentence)) !== null) {
        const val = this.parseAmount(m[1] + (m[2] || ''));
        if (val === null) continue;

        // If claimed annual income equals monthly income without 12x factor:
        if (this.isClose(val, store.monthlyIncome, 0.01)) {
          const expectedAnnual = store.monthlyIncome * 12;
          discrepancies.push({
            claimType: 'cadence_annualization_inversion',
            claimText: m[0].trim(),
            claimedValue: val,
            constraintValue: expectedAnnual,
            entityName: 'Annual Income',
            sentenceContext: sentence,
            reason: `Stated annual income as $${val.toLocaleString()}, which conflates monthly income ($${store.monthlyIncome.toLocaleString()}) with annual income ($${expectedAnnual.toLocaleString()}).`
          });
        }
      }
    }

    // 2. Conflating monthly expenses with annual expenses:
    if (store.monthlyExpenses > 0) {
      const annualExpPattern = /(?:annual\s+expenses?|yearly\s+expenses?|annual\s+spending|spend\s+annually|spend\s+a\s+year)\s+(?:is|are|of|totaling)?\s*(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)(?:\s*([kKmMbB])(?![a-zA-Z]))?/gi;
      let m: RegExpExecArray | null;
      while ((m = annualExpPattern.exec(sentence)) !== null) {
        const val = this.parseAmount(m[1] + (m[2] || ''));
        if (val === null) continue;

        if (this.isClose(val, store.monthlyExpenses, 0.01)) {
          const expectedAnnual = store.monthlyExpenses * 12;
          discrepancies.push({
            claimType: 'cadence_annualization_inversion',
            claimText: m[0].trim(),
            claimedValue: val,
            constraintValue: expectedAnnual,
            entityName: 'Annual Expenses',
            sentenceContext: sentence,
            reason: `Stated annual expenses as $${val.toLocaleString()}, which conflates monthly expenses ($${store.monthlyExpenses.toLocaleString()}) with annual expenses ($${expectedAnnual.toLocaleString()}).`
          });
        }
      }
    }

    // 3. Infeasible 1-year savings projections: "saving $X per month will yield/give $Y in a year"
    const projPattern = /(?:saving|setting\s+aside)\s+(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)(?:\s*([kKmMbB])(?![a-zA-Z]))?\s*(?:per\s+month|a\s+month|monthly)\s+(?:will|would)\s+(?:yield|give|total|result\s+in|accumulate)\s+(?:you\s+)?(?:about\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)(?:\s*([kKmMbB])(?![a-zA-Z]))?\s*(?:in\s+a\s+year|after\s+one\s+year|in\s+12\s+months|annually)/gi;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = projPattern.exec(sentence)) !== null) {
      const monthlyAmt = this.parseAmount(pMatch[1] + (pMatch[2] || ''));
      const annualAmt = this.parseAmount(pMatch[3] + (pMatch[4] || ''));

      if (monthlyAmt !== null && annualAmt !== null && monthlyAmt > 0) {
        const expectedAnnual = monthlyAmt * 12;
        if (!this.isClose(annualAmt, expectedAnnual, 0.02)) {
          discrepancies.push({
            claimType: 'infeasible_savings_projection',
            claimText: pMatch[0].trim(),
            claimedValue: annualAmt,
            constraintValue: expectedAnnual,
            entityName: '1-Year Savings Projection',
            sentenceContext: sentence,
            reason: `Projected saving $${monthlyAmt.toLocaleString()}/month will yield $${annualAmt.toLocaleString()} in one year, but 12 months at $${monthlyAmt.toLocaleString()}/month equals $${expectedAnnual.toLocaleString()}.`
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 5: Debt Payoff from Savings Insolvency
  // ---------------------------------------------------------------------------

  private static validateDebtPayoffFromSavings(
    sentence: string,
    store: AuthoritativeFeasibilityStore,
    discrepancies: FeasibilityDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Pattern: "pay off your $X debt/loan immediately from savings"
    const debtPattern = /(?:pay\s+off|clear|wipe\s+out|settle)\s+(?:your\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?\s+(?:debt|loan|balance)\s+(?:immediately\s+|completely\s+)?(?:from|using|out\s+of)\s+(?:your\s+)?(?:savings|emergency\s+fund)/gi;
    let m: RegExpExecArray | null;
    while ((m = debtPattern.exec(sentence)) !== null) {
      const debtAmt = this.parseAmount(m[1] + (m[2] || ''));
      if (debtAmt === null || debtAmt <= 0) continue;

      if (debtAmt > store.currentSavings) {
        discrepancies.push({
          claimType: 'insolvent_debt_payoff_claim',
          claimText: m[0].trim(),
          claimedValue: debtAmt,
          constraintValue: store.currentSavings,
          entityName: 'Debt Payoff Feasibility',
          sentenceContext: sentence,
          reason: `Advised paying off $${debtAmt.toLocaleString()} in debt from savings, but total available savings is only $${store.currentSavings.toLocaleString()}.`
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Store Builder & Utilities
  // ---------------------------------------------------------------------------

  private static buildAuthoritativeStore(
    query: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>
  ): AuthoritativeFeasibilityStore {
    const kpisRaw = context?.kpis || toolOutputs?.analytics?.kpis || toolOutputs?.health || {};
    const budgetList: any[] = toolOutputs?.budget?.budgets || context?.budgets || [];

    const currentSavings = this.parseAmount(kpisRaw.currentSavings) || 0;
    const monthlyExpenses = this.parseAmount(kpisRaw.totalExpense) || 0;
    const monthlyIncome = this.parseAmount(kpisRaw.totalIncome) || 0;
    const netSavings = this.parseAmount(kpisRaw.netSavings) || (monthlyIncome - monthlyExpenses);
    const currentRunway = kpisRaw.runwayMonths !== undefined ? Number(kpisRaw.runwayMonths) : (monthlyExpenses > 0 ? currentSavings / monthlyExpenses : 0);

    const budgets = new Map<string, BudgetEntry>();
    if (Array.isArray(budgetList)) {
      for (const b of budgetList) {
        const cat = String(b.category || b.cat || 'general').trim();
        const limit = this.parseAmount(b.limit !== undefined ? b.limit : b.lim) || 0;
        const spent = this.parseAmount(b.spent) || 0;
        budgets.set(cat.toLowerCase(), { category: cat, limit, spent });
      }
    }

    const queryNumbers = new Set<number>();
    const qMatches = query.match(/(?:[\$€£₹]|USD)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*([kKmMbB])?/g);
    if (qMatches) {
      for (const q of qMatches) {
        const val = this.parseAmount(q);
        if (val !== null) queryNumbers.add(val);
      }
    }

    return {
      currentSavings,
      monthlyExpenses,
      monthlyIncome,
      netSavings,
      currentRunway,
      safeRunwayThreshold: this.SAFE_RUNWAY_MONTHS,
      budgets,
      queryNumbers,
      queryText: query
    };
  }

  private static extractPurchaseAmount(text: string): number | null {
    // Looks for purchase amounts: "$3,000 laptop", "buy a $3,000", "purchase of $3,000", "cost of $3,000"
    const patterns = [
      /(?:buy|purchase|afford|get)\s+(?:a\s+|an\s+|the\s+)?(?:[a-zA-Z\s]{2,15}\s+)?(?:for\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?/i,
      /(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?\s+(?:laptop|macbook|car|sofa|phone|item|purchase|vacation|watch|tv|computer)/i,
      /(?:purchase|item|cost)\s+(?:of\s+)?(?:[\$€£₹]|USD\s*)?([0-9,]+(?:\.[0-9]+)?)\s*([kKmMbB])?/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const val = this.parseAmount(match[1] + (match[2] || ''));
        if (val !== null && val > 0) return val;
      }
    }

    return null;
  }

  private static resolveCategoryKey(rawText: string, budgets: Map<string, BudgetEntry>): string | null {
    const textLower = rawText.toLowerCase().trim();
    if (budgets.has(textLower)) return textLower;
    for (const key of budgets.keys()) {
      if (textLower.includes(key) || key.includes(textLower)) return key;
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

  private static isConditionalHypothetical(sentence: string): boolean {
    const sLower = sentence.toLowerCase();
    return (
      sLower.includes('if your income') ||
      sLower.includes('if you earned an extra') ||
      sLower.includes('if you receive a bonus') ||
      sLower.includes('if you take out a loan') ||
      sLower.includes('hypothetically speaking') ||
      sLower.includes('in a scenario where') ||
      sLower.includes('financed over') ||
      sLower.includes('on an installment plan')
    );
  }

  private static parseAmount(raw: any): number | null {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'number') return isNaN(raw) ? null : raw;

    const str = String(raw).trim();
    const match = str.match(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)(?:\s*([kKmMbB])(?![a-zA-Z]))?/);
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
    if (diff <= 1.0) return true;
    const maxVal = Math.max(Math.abs(a), Math.abs(b), 1);
    return diff / maxVal <= tolerance;
  }
}
