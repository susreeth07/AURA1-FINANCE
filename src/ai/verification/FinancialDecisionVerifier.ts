/**
 * FinancialDecisionVerifier — Deterministic Decision Safety & Recommendation Integrity Layer (§AI-2.5)
 *
 * Evaluates whether an AI-generated financial recommendation is directionally safe,
 * fiduciarily responsible, and aligned with the user's financial priorities and constraints.
 *
 * Operates purely deterministically without any external network or LLM calls.
 * Does NOT predict markets or classify individual securities.
 *
 * Supported Decision Safety Validations:
 * 1. Emergency Fund Priority (flags investing/spending when runway < 3.0 safe months)
 * 2. High-Interest Debt Priority (flags aggressive investing while high-interest debt remains unaddressed)
 * 3. Short-Term Goal Protection (flags diverting near-term goal funds into volatile/long-term assets)
 * 4. Stated Goal Alignment (flags recommendations that directly contradict user's stated objective)
 * 5. Liquidity Drain Prevention (flags consuming substantial portion of fragile liquid reserves)
 * 6. Risk-Mismatch Detection (flags volatile/speculative investments using emergency reserves)
 * 7. Extreme All-In Recommendations (flags "all your savings", "entire emergency fund", "drain savings")
 * 8. Priority Order Integrity (flags "invest first" when user is in monthly deficit or low reserves)
 * 9. Internal Recommendation Contradictions (flags mutually conflicting advice in same response)
 * 10. Multi-tier Deduplication & Conditional Educational Protection
 */

export interface DecisionSafetyDiscrepancy {
  readonly ruleType:
    | 'emergency_fund_deprioritized'
    | 'debt_payoff_deprioritized'
    | 'short_term_goal_misallocation'
    | 'stated_goal_contradiction'
    | 'liquidity_drain_risk'
    | 'risk_mismatch_recommendation'
    | 'extreme_all_in_recommendation'
    | 'priority_order_inversion'
    | 'internal_recommendation_conflict';
  readonly claimText: string;
  readonly severity: 'minor' | 'significant' | 'severe';
  readonly sentenceContext: string;
  readonly reason: string;
}

export interface FinancialDecisionResult {
  readonly isValid: boolean;
  readonly discrepancies: readonly DecisionSafetyDiscrepancy[];
  readonly warnings: readonly string[];
  readonly reasoning: readonly string[];
  readonly adjustedConfidence?: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
}

export interface DecisionVerificationOptions {
  readonly existingWarnings?: readonly string[];
  readonly existingReasoning?: readonly string[];
}

interface GoalInfo {
  readonly name: string;
  readonly target: number;
  readonly current: number;
  readonly isShortTerm: boolean;
}

interface AuthoritativeDecisionStore {
  readonly currentSavings: number;
  readonly monthlyExpenses: number;
  readonly monthlyIncome: number;
  readonly netSavings: number;
  readonly runwayMonths: number;
  readonly hasLowRunway: boolean;
  readonly hasNegativeCashFlow: boolean;
  readonly hasHighInterestDebt: boolean;
  readonly highInterestDebtAmount: number;
  readonly goals: GoalInfo[];
  readonly queryText: string;
}

export class FinancialDecisionVerifier {
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
    options?: DecisionVerificationOptions
  ): FinancialDecisionResult {
    const store = this.buildAuthoritativeStore(query, context, toolOutputs);
    const sentences = answerText.split(/(?<=[.?!])\s+/);
    const existingWarns = options?.existingWarnings || [];

    const discrepancies: DecisionSafetyDiscrepancy[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    // 1. Check for Internal Recommendation Conflicts across the full answer
    this.validateInternalConflicts(answerText, sentences, discrepancies);

    for (const sentence of sentences) {
      // Skip educational frameworks, benchmark explanations, and generic disclosures
      if (this.isEducationalOrGenericGuideline(sentence)) {
        continue;
      }

      // Skip conditional advice ("If your emergency fund is fully funded, you could consider...")
      if (this.isConditionalGuidance(sentence)) {
        continue;
      }

      // Skip sentences without actionable recommendation intent
      if (!this.hasActionableRecommendationLanguage(sentence)) {
        continue;
      }

      // 2. Extreme / All-In Recommendations
      this.validateExtremeAllIn(sentence, discrepancies);

      // 3. Risk-Mismatch with Emergency Reserves
      this.validateRiskMismatch(sentence, store, discrepancies);

      // 4. Emergency Fund Priority
      this.validateEmergencyFundPriority(sentence, store, discrepancies);

      // 5. High-Interest Debt Priority
      this.validateDebtPayoffPriority(sentence, store, discrepancies);

      // 6. Short-Term Goal Protection
      this.validateShortTermGoalAllocation(sentence, store, discrepancies);

      // 7. Stated Goal Alignment
      this.validateStatedGoalAlignment(sentence, store, discrepancies);

      // 8. Liquidity Drain Prevention
      this.validateLiquidityDrain(sentence, store, discrepancies);

      // 9. Priority Order Integrity
      this.validatePriorityOrder(sentence, store, discrepancies);
    }

    // Deduplicate against existing warnings from earlier tiers
    const unflaggedDiscrepancies: DecisionSafetyDiscrepancy[] = [];

    for (const disc of discrepancies) {
      const isAlreadyFlagged = existingWarns.some(w => {
        const wLower = w.toLowerCase();
        if (disc.ruleType === 'emergency_fund_deprioritized' && (wLower.includes('emergency') || wLower.includes('runway'))) {
          return true;
        }
        if (wLower.includes(disc.ruleType.replace(/_/g, ' '))) {
          return true;
        }
        return false;
      });

      if (!isAlreadyFlagged) {
        unflaggedDiscrepancies.push(disc);
        warnings.push(`⚠️ Decision Safety: ${disc.reason}`);
        reasoning.push(`Decision Safety: Flagged ${disc.ruleType.replace(/_/g, ' ')} (${disc.severity}): ${disc.reason}`);
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

    // Calculate penalty based on severity
    let totalPenalty = 0;
    for (const disc of unflaggedDiscrepancies) {
      if (disc.severity === 'severe') totalPenalty += 0.35;
      else if (disc.severity === 'significant') totalPenalty += 0.25;
      else totalPenalty += 0.15;
    }
    const cappedPenalty = Math.min(totalPenalty, 0.50);

    const baseScore = currentConfidence ? currentConfidence.score : 0.75;
    const newScore = Math.max(0.10, Number((baseScore - cappedPenalty).toFixed(2)));
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
  // Check 1: Extreme All-In Recommendations
  // ---------------------------------------------------------------------------

  private static validateExtremeAllIn(
    sentence: string,
    discrepancies: DecisionSafetyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    const extremePhrases = [
      'all your savings',
      'entire emergency fund',
      'everything into',
      'put all your money into',
      'drain your savings',
      'empty your accounts',
      'liquidate your emergency fund',
      'use your emergency fund to invest',
      'use your emergency savings for crypto',
      'put your entire emergency fund'
    ];

    for (const phrase of extremePhrases) {
      if (sLower.includes(phrase)) {
        discrepancies.push({
          ruleType: 'extreme_all_in_recommendation',
          claimText: phrase,
          severity: 'severe',
          sentenceContext: sentence,
          reason: 'Extreme all-in financial action detected: advising the user to risk or deplete all liquid reserves.'
        });
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 2: Risk-Mismatch with Emergency Reserves
  // ---------------------------------------------------------------------------

  private static validateRiskMismatch(
    sentence: string,
    store: AuthoritativeDecisionStore,
    discrepancies: DecisionSafetyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Recommending stocks/crypto/options with emergency savings
    const mentionsEmergency = sLower.includes('emergency') || sLower.includes('safety net') || sLower.includes('reserve');
    const mentionsVolatile = sLower.includes('stock') || sLower.includes('crypto') || sLower.includes('equities') || sLower.includes('bitcoin') || sLower.includes('shares') || sLower.includes('options');

    if (mentionsEmergency && mentionsVolatile) {
      const isActionable =
        sLower.includes('invest') ||
        sLower.includes('put') ||
        sLower.includes('allocate') ||
        sLower.includes('move') ||
        sLower.includes('use');

      if (isActionable && !this.isConditionalGuidance(sentence)) {
        discrepancies.push({
          ruleType: 'risk_mismatch_recommendation',
          claimText: sentence.trim(),
          severity: 'severe',
          sentenceContext: sentence,
          reason: 'High-risk action recommended for funds required for near-term safety and liquidity.'
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 3: Emergency Fund Priority
  // ---------------------------------------------------------------------------

  private static validateEmergencyFundPriority(
    sentence: string,
    store: AuthoritativeDecisionStore,
    discrepancies: DecisionSafetyDiscrepancy[]
  ): void {
    if (!store.hasLowRunway) return;
    const sLower = sentence.toLowerCase();

    // Check if sentence is actually advising building/prioritizing emergency reserves first
    const isPrioritizingReservesOverInvesting =
      sLower.includes('before starting to invest') ||
      sLower.includes('before investing') ||
      sLower.includes('prioritize building your emergency fund') ||
      sLower.includes('prioritize your emergency fund') ||
      sLower.includes('focus on building your emergency fund');

    if (isPrioritizingReservesOverInvesting) {
      return;
    }

    // If user has thin runway (< 3.0 months), AI should not advise aggressive investing
    const isInvestingRecommendation =
      sLower.includes('invest') ||
      sLower.includes('buy stocks') ||
      sLower.includes('put money into stocks') ||
      sLower.includes('allocate to investments') ||
      sLower.includes('contribute to stocks') ||
      sLower.includes('start investing') ||
      sLower.includes('increase your stock');

    if (isInvestingRecommendation && !this.isConditionalGuidance(sentence)) {
      discrepancies.push({
        ruleType: 'emergency_fund_deprioritized',
        claimText: sentence.trim(),
        severity: 'significant',
        sentenceContext: sentence,
        reason: `This recommendation conflicts with the user's current emergency-fund position (${store.runwayMonths.toFixed(1)} months vs safe 3.0-month threshold). Liquidity preservation must take precedence over investing.`
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 4: High-Interest Debt Priority
  // ---------------------------------------------------------------------------

  private static validateDebtPayoffPriority(
    sentence: string,
    store: AuthoritativeDecisionStore,
    discrepancies: DecisionSafetyDiscrepancy[]
  ): void {
    if (!store.hasHighInterestDebt) return;
    const sLower = sentence.toLowerCase();

    // Recommending investing ahead of debt payoff
    const isInvestingRecommendation =
      (sLower.includes('you should invest') ||
       sLower.includes('you can invest') ||
       sLower.includes('start investing') ||
       sLower.includes('invest now') ||
       sLower.includes('invest in') ||
       sLower.includes('buy stocks') ||
       sLower.includes('put money into stocks') ||
       sLower.includes('allocate to stocks') ||
       sLower.includes('mutual funds') ||
       sLower.includes('crypto') ||
       sLower.includes('cryptocurrency') ||
       sLower.includes('bitcoin')) &&
      !sLower.includes('no investment') &&
      !sLower.includes('avoid investing');

    // Check if sentence promotes investing before or instead of debt
    const prioritizesInvestingOverDebt =
      sLower.includes('instead of paying off') ||
      sLower.includes('before paying off') ||
      sLower.includes('rather than clearing') ||
      sLower.includes('bypass paying') ||
      sLower.includes('bypassing paying') ||
      sLower.includes('prioritize investing') ||
      sLower.includes('focus on investing') ||
      sLower.includes('into cryptocurrency instead') ||
      sLower.includes('into crypto instead') ||
      (isInvestingRecommendation && !sLower.includes('debt') && !this.isConditionalGuidance(sentence) && !sLower.includes('risk-free') && !sLower.includes('risk tolerance'));

    if (prioritizesInvestingOverDebt) {
      discrepancies.push({
        ruleType: 'debt_payoff_deprioritized',
        claimText: sentence.trim(),
        severity: 'significant',
        sentenceContext: sentence,
        reason: 'This recommendation prioritizes investing while high-interest debt remains unresolved. Paying off high-interest debt provides a guaranteed risk-free return.'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 5: Short-Term Goal Protection
  // ---------------------------------------------------------------------------

  private static validateShortTermGoalAllocation(
    sentence: string,
    store: AuthoritativeDecisionStore,
    discrepancies: DecisionSafetyDiscrepancy[]
  ): void {
    if (store.goals.length === 0) return;
    const sLower = sentence.toLowerCase();

    for (const goal of store.goals) {
      if (!goal.isShortTerm) continue;

      const goalRegex = new RegExp(`\\b${this.escapeRegex(goal.name)}\\b`, 'i');
      if (!goalRegex.test(sentence)) continue;

      // Check if recommendation moves funds away from short term goal into long-term/risky assets
      const movesAway =
        sLower.includes('move') ||
        sLower.includes('transfer') ||
        sLower.includes('divert') ||
        sLower.includes('shift') ||
        sLower.includes('reallocate') ||
        sLower.includes('take');

      const toRiskOrLongTerm =
        sLower.includes('stock') ||
        sLower.includes('crypto') ||
        sLower.includes('equities') ||
        sLower.includes('long-term') ||
        sLower.includes('market');

      if (movesAway && toRiskOrLongTerm) {
        discrepancies.push({
          ruleType: 'short_term_goal_misallocation',
          claimText: sentence.trim(),
          severity: 'significant',
          sentenceContext: sentence,
          reason: `This recommendation conflicts with the user's near-term goal allocation (${goal.name}). Funds needed in the near term should not be exposed to capital risk or long-term lockup.`
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 6: Stated Goal Contradiction
  // ---------------------------------------------------------------------------

  private static validateStatedGoalAlignment(
    sentence: string,
    store: AuthoritativeDecisionStore,
    discrepancies: DecisionSafetyDiscrepancy[]
  ): void {
    const qLower = store.queryText.toLowerCase();
    const sLower = sentence.toLowerCase();

    // Check if user specifically asked how to reach a savings goal faster
    const isAskingToSaveOrReachGoal =
      (qLower.includes('reach') || qLower.includes('save') || qLower.includes('accelerate') || qLower.includes('faster') || qLower.includes('fund')) &&
      (qLower.includes('goal') || qLower.includes('vacation') || qLower.includes('emergency') || qLower.includes('house') || qLower.includes('wedding'));

    if (isAskingToSaveOrReachGoal) {
      // Contradiction: advising spending money on discretionary purchases or delaying goal
      const advisesSpendingOrDelay =
        sLower.includes('spend the money on') ||
        sLower.includes('use the money to buy') ||
        sLower.includes('upgrade your wardrobe') ||
        sLower.includes('buy a new gaming') ||
        sLower.includes('postpone your goal to buy') ||
        sLower.includes('delay your goal to purchase');

      if (advisesSpendingOrDelay) {
        discrepancies.push({
          ruleType: 'stated_goal_contradiction',
          claimText: sentence.trim(),
          severity: 'significant',
          sentenceContext: sentence,
          reason: "This recommendation conflicts with the user's stated savings goal by encouraging discretionary consumption instead of goal attainment."
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 7: Liquidity Drain Risk
  // ---------------------------------------------------------------------------

  private static validateLiquidityDrain(
    sentence: string,
    store: AuthoritativeDecisionStore,
    discrepancies: DecisionSafetyDiscrepancy[]
  ): void {
    if (!store.hasLowRunway && store.currentSavings >= 10000) return;
    const sLower = sentence.toLowerCase();

    // Detect recommendations that advocate spending or locking up substantial capital when liquidity is thin
    const drainLanguage =
      sLower.includes('spend most of your savings') ||
      sLower.includes('use half your savings') ||
      sLower.includes('commit most of your cash') ||
      sLower.includes('lock up your cash');

    if (drainLanguage) {
      discrepancies.push({
        ruleType: 'liquidity_drain_risk',
        claimText: sentence.trim(),
        severity: 'significant',
        sentenceContext: sentence,
        reason: 'The recommendation would consume funds needed for near-term liquidity and solvency.'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 8: Priority Order Integrity
  // ---------------------------------------------------------------------------

  private static validatePriorityOrder(
    sentence: string,
    store: AuthoritativeDecisionStore,
    discrepancies: DecisionSafetyDiscrepancy[]
  ): void {
    if (!store.hasNegativeCashFlow && !store.hasLowRunway) return;
    const sLower = sentence.toLowerCase();

    // Check if AI advises prioritizing investing first
    const prioritizesInvestingFirst =
      sLower.includes('increase stock investments first') ||
      sLower.includes('investing first') ||
      sLower.includes('invest in stocks first') ||
      sLower.includes('prioritize investing over your emergency fund') ||
      sLower.includes('focus on investing before fixing cash flow');

    if (prioritizesInvestingFirst) {
      discrepancies.push({
        ruleType: 'priority_order_inversion',
        claimText: sentence.trim(),
        severity: 'significant',
        sentenceContext: sentence,
        reason: 'Recommended priority order contradicts core financial safety principles: cash flow stabilization and emergency reserves must precede discretionary investing.'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 9: Internal Recommendation Conflicts
  // ---------------------------------------------------------------------------

  private static validateInternalConflicts(
    answerText: string,
    sentences: string[],
    discrepancies: DecisionSafetyDiscrepancy[]
  ): void {
    const textLower = answerText.toLowerCase();

    // Conflict A: "Keep emergency fund" vs "Invest entire emergency fund"
    const advisesKeepingReserves =
      textLower.includes('keep your emergency fund') ||
      textLower.includes('maintain your emergency fund') ||
      textLower.includes('preserve your emergency savings') ||
      textLower.includes('keep $');

    const advisesDrainingReserves =
      textLower.includes('invest your entire emergency fund') ||
      textLower.includes('invest all your emergency savings') ||
      textLower.includes('use your emergency fund to invest');

    if (advisesKeepingReserves && advisesDrainingReserves) {
      discrepancies.push({
        ruleType: 'internal_recommendation_conflict',
        claimText: 'Contradictory emergency fund guidance',
        severity: 'significant',
        sentenceContext: answerText.slice(0, 150),
        reason: 'The response contains conflicting financial recommendations: simultaneously advising to preserve and deplete emergency reserves.'
      });
      return;
    }

    // Conflict B: "Avoid debt" vs "Take out a loan to invest"
    const advisesAvoidingDebt =
      textLower.includes('avoid taking on debt') ||
      textLower.includes('do not take on more debt') ||
      textLower.includes('stay away from loans');

    const advisesTakingLoanToInvest =
      textLower.includes('take out a loan to invest') ||
      textLower.includes('borrow money to buy stocks');

    if (advisesAvoidingDebt && advisesTakingLoanToInvest) {
      discrepancies.push({
        ruleType: 'internal_recommendation_conflict',
        claimText: 'Contradictory debt recommendations',
        severity: 'significant',
        sentenceContext: answerText.slice(0, 150),
        reason: 'The response contains conflicting financial recommendations: simultaneously advising to avoid debt and take out loans for speculative investing.'
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
  ): AuthoritativeDecisionStore {
    const kpisRaw = context?.kpis || toolOutputs?.analytics?.kpis || toolOutputs?.health || {};
    const goalList: any[] = toolOutputs?.goal?.savings || context?.savings || [];
    const debtList: any[] = toolOutputs?.debt?.debts || context?.debts || [];

    const currentSavings = this.parseAmount(kpisRaw.currentSavings) || 0;
    const monthlyExpenses = this.parseAmount(kpisRaw.totalExpense) || 0;
    const monthlyIncome = this.parseAmount(kpisRaw.totalIncome) || 0;
    const netSavings = this.parseAmount(kpisRaw.netSavings) || (monthlyIncome - monthlyExpenses);
    const runwayMonths = kpisRaw.runwayMonths !== undefined ? Number(kpisRaw.runwayMonths) : (monthlyExpenses > 0 ? currentSavings / monthlyExpenses : 0);

    const hasLowRunway = runwayMonths < this.SAFE_RUNWAY_MONTHS;
    const hasNegativeCashFlow = netSavings < 0;

    // Detect High-Interest Debt
    let hasHighInterestDebt = false;
    let highInterestDebtAmount = 0;

    if (kpisRaw.highInterestDebt || kpisRaw.creditCardDebt) {
      const d = this.parseAmount(kpisRaw.highInterestDebt || kpisRaw.creditCardDebt) || 0;
      if (d > 0) {
        hasHighInterestDebt = true;
        highInterestDebtAmount = d;
      }
    }

    if (Array.isArray(debtList)) {
      for (const debt of debtList) {
        const bal = this.parseAmount(debt.balance || debt.amount) || 0;
        const rate = Number(debt.interestRate || debt.apr || 0);
        // High interest: APR >= 10% or explicitly labeled creditCard / highInterest
        if (bal > 0 && (rate >= 10 || debt.isHighInterest || String(debt.type || '').toLowerCase().includes('credit'))) {
          hasHighInterestDebt = true;
          highInterestDebtAmount += bal;
        }
      }
    }

    // Process Goals
    const goals: GoalInfo[] = [];
    const shortTermKeywords = ['vacation', 'holiday', 'trip', 'tax', 'moving', 'laptop', 'macbook', 'phone', 'emergency'];

    if (Array.isArray(goalList)) {
      for (const g of goalList) {
        const name = String(g.goalName || g.name || 'Goal').trim();
        const target = this.parseAmount(g.targetAmount || g.tar) || 0;
        const current = this.parseAmount(g.currentAmount || g.cur) || 0;
        const remainingMonths = g.remainingMonths !== undefined ? Number(g.remainingMonths) : 12;

        const isShortTerm =
          remainingMonths <= 12 ||
          shortTermKeywords.some(kw => name.toLowerCase().includes(kw));

        goals.push({
          name,
          target,
          current,
          isShortTerm
        });
      }
    }

    return {
      currentSavings,
      monthlyExpenses,
      monthlyIncome,
      netSavings,
      runwayMonths,
      hasLowRunway,
      hasNegativeCashFlow,
      hasHighInterestDebt,
      highInterestDebtAmount,
      goals,
      queryText: query
    };
  }

  private static hasActionableRecommendationLanguage(sentence: string): boolean {
    const sLower = sentence.toLowerCase();
    const actionWords = [
      'invest', 'buy', 'put', 'move', 'allocate', 'spend', 'drain', 'shift', 'transfer',
      'deploy', 'divert', 'dump', 'commit', 'prioritize', 'focus on', 'should save', 'recommend',
      'use', 'liquidate', 'empty'
    ];
    return actionWords.some(w => sLower.includes(w));
  }

  private static isEducationalOrGenericGuideline(sentence: string): boolean {
    const sLower = sentence.toLowerCase();
    return (
      sLower.includes('50/30/20') ||
      sLower.includes('70/20/10') ||
      sLower.includes('80/20') ||
      sLower.includes('rule of thumb') ||
      sLower.includes('standard guideline') ||
      sLower.includes('conventional wisdom') ||
      sLower.includes('financial experts often') ||
      sLower.includes('investing is a way to') ||
      sLower.includes('stocks carry risk') ||
      sLower.includes('past performance') ||
      sLower.includes('for long-term goals, diversified') ||
      sLower.includes('diversified investments may be')
    );
  }

  private static isConditionalGuidance(sentence: string): boolean {
    const sLower = sentence.toLowerCase();
    return (
      sLower.includes('once your emergency fund') ||
      sLower.includes('after your emergency fund') ||
      sLower.includes('if your emergency fund is') ||
      sLower.includes('after building') ||
      sLower.includes('when you reach') ||
      sLower.includes('assuming you have') ||
      sLower.includes('provided that') ||
      sLower.includes('in an ideal scenario') ||
      sLower.includes('hypothetically')
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

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
