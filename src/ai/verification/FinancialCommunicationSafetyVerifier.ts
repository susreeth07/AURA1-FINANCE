/**
 * FinancialCommunicationSafetyVerifier — Deterministic Communication Safety, Actionability & User-Protection Layer (§AI-2.9)
 *
 * Evaluates AI-generated responses to ensure that:
 * 1. Action-seeking user queries receive concrete, actionable next steps rather than passive observations.
 * 2. Unsafe, high-impact actions (taking loans, draining emergency funds, liquidation, refinancing) are not urged without context.
 * 3. Imperative commands for high-stakes financial moves include prudent caution, conditions, or trade-off evaluation.
 * 4. Complex or legally fraught situations (bankruptcy, major tax structuring, legal debt relief) advise consulting certified professionals (CPA, CFP, attorney).
 * 5. Material actions include disclosure of inherent risks or potential downsides.
 * 6. Financial deficits or diagnosed problems are translated into actionable remedies (bridging the actionability gap).
 * 7. Ambiguous platitudes ("be smarter with money") are flagged or refined into concrete guidance.
 * 8. Conflicting advice or inconsistent action priorities are eliminated.
 * 9. Premature actions (aggressive wealth generation while high-interest debt/zero runway exists) are prioritized safely.
 * 10. Irreversible actions (closing old credit card accounts, early retirement withdrawals) warn of credit/tax penalties.
 * 11. Overreaching, one-size-fits-all product prescriptions without complete risk profiling are flagged.
 * 12. Cautious, qualified guidance ("consider reviewing", "if your fund allows", "explore") is strictly protected from false positives.
 *
 * Operates purely deterministically and locally with ZERO external network or LLM calls.
 */

export interface CommunicationSafetyDiscrepancy {
  readonly issueType:
    | 'missing_actionable_next_step'
    | 'unsafe_action_without_context'
    | 'high_impact_action_missing_caution'
    | 'financial_professional_escalation_missing'
    | 'missing_risk_disclosure_for_material_action'
    | 'actionability_gap'
    | 'ambiguous_recommendation'
    | 'conflicting_action_priority'
    | 'premature_action_recommendation'
    | 'irreversible_action_without_confirmation'
    | 'personalized_advice_overreach'
    | 'unbalanced_financial_urgency';
  readonly claimText: string;
  readonly severity: 'minor' | 'significant' | 'severe';
  readonly sentenceContext: string;
  readonly reason: string;
}

export interface FinancialCommunicationSafetyResult {
  readonly isValid: boolean;
  readonly discrepancies: readonly CommunicationSafetyDiscrepancy[];
  readonly warnings: readonly string[];
  readonly reasoning: readonly string[];
  readonly adjustedConfidence?: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
}

export interface CommunicationSafetyOptions {
  readonly existingWarnings?: readonly string[];
  readonly existingReasoning?: readonly string[];
}

interface SafetyAuthoritativeStore {
  readonly currentSavings: number | null;
  readonly totalIncome: number | null;
  readonly totalExpense: number | null;
  readonly netSavings: number | null;
  readonly runwayMonths: number | null;
  readonly highInterestDebts: readonly { name: string; balance: number; rate: number }[];
  readonly currentConfidence: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
}

export class FinancialCommunicationSafetyVerifier {
  /**
   * Main verification entry point.
   */
  public static verify(
    query: string,
    answer: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any> = {},
    currentConfidence?: { level: 'High' | 'Medium' | 'Low'; score: number },
    options?: CommunicationSafetyOptions
  ): FinancialCommunicationSafetyResult {
    const store = this.extractAuthoritativeStore(context, toolOutputs, currentConfidence);
    const existingWarns = options?.existingWarnings || [];
    const existingReasons = options?.existingReasoning || [];

    const sentences = this.splitIntoSentences(answer);
    const discrepancies: CommunicationSafetyDiscrepancy[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    const isActionSeekingQuery = this.isActionSeekingPrompt(query);
    const isEducationalOrHypotheticalOverall = this.isOverallEducationalOrHypothetical(query, answer);

    // Sentence-level evaluations
    for (const sentence of sentences) {
      // Guard against educational definitions, hypothetical statements, or quoted bad advice
      if (this.isExemptSentence(sentence)) {
        continue;
      }

      // Rule 2: Unsafe Action Without Context
      this.checkUnsafeActionWithoutContext(sentence, store, discrepancies);

      // Rule 3: High-Impact Action Missing Caution / Imperative Commands
      this.checkHighImpactActionMissingCaution(sentence, store, discrepancies);

      // Rule 4: Financial Professional Escalation Missing
      this.checkFinancialProfessionalEscalation(sentence, discrepancies);

      // Rule 5: Missing Risk Disclosure For Material Action
      this.checkMissingRiskDisclosure(sentence, answer, discrepancies);

      // Rule 7: Ambiguous Recommendation / Platitudes
      this.checkAmbiguousRecommendation(sentence, discrepancies);

      // Rule 9: Premature Action Recommendation (e.g. risky investing with low runway/high debt)
      this.checkPrematureActionRecommendation(sentence, store, discrepancies);

      // Rule 10: Irreversible Action Without Confirmation / Caution
      this.checkIrreversibleAction(sentence, discrepancies);

      // Rule 11: Personalized Advice Overreach / Absolute Prescription
      this.checkPersonalizedAdviceOverreach(sentence, discrepancies);
    }

    // If query or context is purely educational/factual, certain actionability rules do not apply
    if (!isEducationalOrHypotheticalOverall) {
      // Rule 1 & Rule 6: Missing Actionable Next Step / Actionability Gap
      // (Only check if not already flagged for ambiguous recommendation to avoid double penalties)
      if (isActionSeekingQuery && !discrepancies.some(d => d.issueType === 'ambiguous_recommendation')) {
        this.checkMissingActionableNextStep(answer, sentences, store, discrepancies);
      }

      // Rule 8: Conflicting Action Priorities across the answer
      this.checkConflictingActionPriorities(answer, sentences, store, discrepancies);
    }

    // Filter out discrepancies that duplicate existing warnings from earlier tiers
    const unflaggedDiscrepancies: CommunicationSafetyDiscrepancy[] = [];

    for (const disc of discrepancies) {
      const isAlreadyFlagged = existingWarns.some(w => {
        const wLower = w.toLowerCase();
        return (
          wLower.includes(disc.issueType.replace(/_/g, ' ')) ||
          wLower.includes(disc.reason.toLowerCase()) ||
          (disc.issueType === 'conflicting_action_priority' && wLower.includes('conflict')) ||
          (disc.issueType === 'premature_action_recommendation' &&
            (wLower.includes('investing') || wLower.includes('premature') || wLower.includes('debt payoff') || wLower.includes('priority')))
        );
      });

      if (!isAlreadyFlagged) {
        unflaggedDiscrepancies.push(disc);
        warnings.push(`⚠️ Communication Safety: ${disc.reason}`);
        reasoning.push(
          `Communication Safety Layer: Flagged ${disc.issueType.replace(/_/g, ' ')} (${disc.severity}): ${disc.reason}`
        );
      }
    }

    if (unflaggedDiscrepancies.length === 0) {
      return {
        isValid: true,
        discrepancies: [],
        warnings: [],
        reasoning: ['Communication Safety & Actionability: Response provides safe, qualified, and responsible guidance.'],
        adjustedConfidence: currentConfidence
      };
    }

    // Calculate graduated confidence penalties
    let totalPenalty = 0;
    for (const disc of unflaggedDiscrepancies) {
      if (disc.severity === 'severe') totalPenalty += 0.30;
      else if (disc.severity === 'significant') totalPenalty += 0.20;
      else totalPenalty += 0.10;
    }
    const cappedPenalty = Math.min(totalPenalty, 0.40);

    const baseScore = currentConfidence ? currentConfidence.score : 0.75;
    const newScore = Math.max(0.20, Number((baseScore - cappedPenalty).toFixed(2)));
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
  // Check 1: Missing Actionable Next Step & Actionability Gap
  // ---------------------------------------------------------------------------
  private static checkMissingActionableNextStep(
    fullAnswer: string,
    sentences: string[],
    store: SafetyAuthoritativeStore,
    discrepancies: CommunicationSafetyDiscrepancy[]
  ): void {
    const aLower = fullAnswer.toLowerCase();

    // Check if the answer contains any actionable keywords or directives
    const actionKeywords = [
      'you can', 'you should', 'consider', 'try', 'recommend', 'review',
      'reduce', 'cut', 'allocate', 'start by', 'next step', 'set up',
      'explore', 'aim to', 'focus on', 'action plan', 'first step', 'to save',
      'to reach', 'to reduce', 'look into', 'prioritize', 'create a budget',
      'set a budget', 'adjust budget', 'rebalance budget', 'stick to a budget'
    ];

    const hasActionableGuidance = actionKeywords.some(kw => aLower.includes(kw));

    // Also check if it merely describes a deficit without proposing action
    const diagnosesDeficitOrOverspending =
      aLower.includes('over budget') ||
      aLower.includes('overspent') ||
      aLower.includes('deficit of') ||
      aLower.includes('spending exceeds');

    if (!hasActionableGuidance) {
      if (diagnosesDeficitOrOverspending) {
        discrepancies.push({
          issueType: 'actionability_gap',
          claimText: fullAnswer.slice(0, 100) + '...',
          severity: 'significant',
          sentenceContext: fullAnswer.slice(0, 150),
          reason: 'Diagnosed an overspending deficit or financial gap but stopped without providing actionable steps to remedy it.'
        });
      } else {
        discrepancies.push({
          issueType: 'missing_actionable_next_step',
          claimText: fullAnswer.slice(0, 100) + '...',
          severity: 'minor',
          sentenceContext: fullAnswer.slice(0, 150),
          reason: 'User asked an action-seeking financial question, but the response provides only passive observations without concrete next steps.'
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 2: Unsafe Action Without Context
  // ---------------------------------------------------------------------------
  private static checkUnsafeActionWithoutContext(
    sentence: string,
    store: SafetyAuthoritativeStore,
    discrepancies: CommunicationSafetyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Recommending taking out personal loans, draining emergency funds, liquidating 401k/investments without qualification
    const unsafeActions = [
      {
        pattern: /\b(?:take\s+out\s+a\s+personal\s+loan|borrow\s+money\s+from\s+a\s+lender|get\s+a\s+payday\s+loan)\b/i,
        reason: 'Recommends taking out personal borrowing/loans without assessing interest rates, terms, or repayment capability.'
      },
      {
        pattern: /\b(?:liquidate|drain|use|empty)\s+(?:all\s+)?(?:of\s+)?your\s+(?:entire\s+)?(?:emergency\s+fund|safety\s+net)\b/i,
        reason: 'Recommends consuming or draining the emergency fund without preserving essential runway.'
      },
      {
        pattern: /\b(?:liquidate|sell\s+off)\s+(?:all\s+)?(?:your\s+)?(?:investments|stocks|portfolio)\b/i,
        reason: 'Recommends wholesale liquidation of investments without evaluating market timing, tax consequences, or long-term goals.'
      }
    ];

    for (const item of unsafeActions) {
      if (item.pattern.test(sLower)) {
        // Check if there is caution or context in the same sentence
        const hasContextOrCaution =
          sLower.includes('if you have no other option') ||
          sLower.includes('as a last resort') ||
          sLower.includes('after evaluating') ||
          sLower.includes('carefully weigh') ||
          sLower.includes('only if');

        if (!hasContextOrCaution) {
          discrepancies.push({
            issueType: 'unsafe_action_without_context',
            claimText: sentence.trim(),
            severity: 'severe',
            sentenceContext: sentence,
            reason: item.reason
          });
          return;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 3: High-Impact Action Missing Caution / Imperative Commands
  // ---------------------------------------------------------------------------
  private static checkHighImpactActionMissingCaution(
    sentence: string,
    store: SafetyAuthoritativeStore,
    discrepancies: CommunicationSafetyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Direct unconditional commands on high-stakes actions
    const highImpactImperatives = [
      {
        pattern: /^(?:you\s+must|immediately|go\s+ahead\s+and|make\s+sure\s+to\s+now)\s+(?:refinance\s+your\s+(?:home|entire|30-year)?|take\s+out\s+a\s+loan|liquidate|quit\s+your\s+job)\b/i,
        reason: 'Uses imperative command for a high-impact financial action without required caution, eligibility prerequisites, or trade-off evaluation.'
      },
      {
        pattern: /\brefinance\s+your\s+(?:home|entire|30-year|mortgage).*(?:immediately|this\s+week)\b/i,
        reason: 'Urges immediate mortgage refinancing without qualifying for interest rates, closing costs, or personal break-even timelines.'
      },
      {
        pattern: /\b(?:put|invest)\s+all\s+(?:of\s+)?your\s+money\s+into\b/i,
        reason: 'Directs user to concentrate all capital into a single asset without caution regarding diversification or risk.'
      }
    ];

    for (const item of highImpactImperatives) {
      if (item.pattern.test(sLower)) {
        discrepancies.push({
          issueType: 'high_impact_action_missing_caution',
          claimText: sentence.trim(),
          severity: 'severe',
          sentenceContext: sentence,
          reason: item.reason
        });
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 4: Financial Professional Escalation Missing
  // ---------------------------------------------------------------------------
  private static checkFinancialProfessionalEscalation(
    sentence: string,
    discrepancies: CommunicationSafetyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Specific complex high-stakes scenarios: bankruptcy declaration, legal debt settlement, intricate tax avoidance
    const complexTopics = [
      {
        pattern: /\b(?:you\s+should|declare|file\s+for)\s+(?:chapter\s+(?:7|11|13)\s+)?bankruptcy\b/i,
        topic: 'bankruptcy'
      },
      {
        pattern: /\b(?:set\s+up|create|transfer\s+your\s+assets\s+into)\s+(?:an?\s+)?(?:cook\s+islands\s+)?offshore\s+(?:trust|tax\s+haven)\b/i,
        topic: 'offshore tax structuring'
      },
      {
        pattern: /\b(?:stop\s+paying\s+your\s+creditors|ignore\s+collection\s+calls|hire\s+debt\s+settlement)\b/i,
        topic: 'debt default/settlement'
      }
    ];

    for (const item of complexTopics) {
      if (item.pattern.test(sLower)) {
        // Must advise consulting a qualified professional (CPA, CFP, bankruptcy attorney)
        const hasProfessionalAdvisory =
          sLower.includes('consult a bankruptcy attorney') ||
          sLower.includes('consult an attorney') ||
          sLower.includes('licensed financial advisor') ||
          sLower.includes('certified financial planner') ||
          sLower.includes('cpa') ||
          sLower.includes('qualified professional') ||
          sLower.includes('legal counsel');

        if (!hasProfessionalAdvisory) {
          discrepancies.push({
            issueType: 'financial_professional_escalation_missing',
            claimText: sentence.trim(),
            severity: 'severe',
            sentenceContext: sentence,
            reason: `Recommends or addresses complex legal/financial procedures (${item.topic}) without directing the user to consult a certified professional (CFP, CPA, or attorney).`
          });
          return;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 5: Missing Risk Disclosure For Material Action
  // ---------------------------------------------------------------------------
  private static checkMissingRiskDisclosure(
    sentence: string,
    fullAnswer: string,
    discrepancies: CommunicationSafetyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();
    const aLower = fullAnswer.toLowerCase();

    // Material actions: trading options, margin trading, high-yield crypto, speculative individual equities
    const materialRiskActions = [
      /\b(?:trade|trading|invest\s+in)\s+(?:leveraged\s+)?(?:call\s+options|put\s+options|stock\s+options|options|crypto(?:currency)?|margin|leveraged\s+etfs?)\b/i,
      /\b(?:borrow\s+against\s+your\s+portfolio|trade\s+on\s+margin)\b/i
    ];

    for (const pattern of materialRiskActions) {
      if (pattern.test(sLower)) {
        // The answer must contain some risk disclosure
        const hasRiskDisclosure =
          aLower.includes('risk') ||
          aLower.includes('volatility') ||
          aLower.includes('loss of capital') ||
          aLower.includes('may fluctuate') ||
          aLower.includes('speculative') ||
          aLower.includes('downside');

        if (!hasRiskDisclosure) {
          discrepancies.push({
            issueType: 'missing_risk_disclosure_for_material_action',
            claimText: sentence.trim(),
            severity: 'significant',
            sentenceContext: sentence,
            reason: 'Recommends speculative or leveraged financial instruments without disclosing inherent risk of loss or volatility.'
          });
          return;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 7: Ambiguous Recommendations / Platitudes
  // ---------------------------------------------------------------------------
  private static checkAmbiguousRecommendation(
    sentence: string,
    discrepancies: CommunicationSafetyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    const platitudePatterns = [
      /\b(?:just|simply)\s+(?:be\s+smarter\s+with\s+(?:your\s+)?money|manage\s+your\s+money\s+better)\b/i,
      /\b(?:just|simply)\s+spend\s+less\s+and\s+earn\s+more\b/i,
      /\byou\s+just\s+need\s+to\s+have\s+more\s+discipline\b/i,
      /\bmake\s+better\s+financial\s+choices\b/i
    ];

    for (const pattern of platitudePatterns) {
      if (pattern.test(sLower)) {
        discrepancies.push({
          issueType: 'ambiguous_recommendation',
          claimText: sentence.trim(),
          severity: 'minor',
          sentenceContext: sentence,
          reason: 'Provides vague, ambiguous platitudes rather than concrete, actionable financial guidance.'
        });
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 8: Conflicting Action Priorities
  // ---------------------------------------------------------------------------
  private static checkConflictingActionPriorities(
    fullAnswer: string,
    sentences: string[],
    store: SafetyAuthoritativeStore,
    discrepancies: CommunicationSafetyDiscrepancy[]
  ): void {
    const aLower = fullAnswer.toLowerCase();

    // Contradiction A: Tells user to cut spending drastically in one sentence, but to treat themselves / spend freely in another
    const saysCutStrictly = aLower.includes('cut all discretionary') || aLower.includes('freeze all spending') || aLower.includes('strict austerity');
    const saysSpendFreely = aLower.includes('spend freely on entertainment') || aLower.includes('feel free to splurge') || aLower.includes('treat yourself to luxury');

    if (saysCutStrictly && saysSpendFreely) {
      discrepancies.push({
        issueType: 'conflicting_action_priority',
        claimText: 'Contradictory spending advice',
        severity: 'significant',
        sentenceContext: fullAnswer.slice(0, 150),
        reason: 'Answer provides conflicting spending instructions (recommending a strict spending freeze while simultaneously encouraging discretionary splurging).'
      });
      return;
    }

    // Contradiction B: Directs user to pay off debt first and invest first in the same response without ordering
    const investFirst = aLower.includes('first step is to invest') || aLower.includes('prioritize investing over everything');
    const debtFirst = aLower.includes('first priority must be debt') || aLower.includes('pay off debt before anything else');

    if (investFirst && debtFirst) {
      discrepancies.push({
        issueType: 'conflicting_action_priority',
        claimText: 'Contradictory financial priorities',
        severity: 'significant',
        sentenceContext: fullAnswer.slice(0, 150),
        reason: 'Answer gives contradictory top-priority directives (both investing and debt payoff are claimed as the exclusive first step).'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 9: Premature Action Recommendations
  // ---------------------------------------------------------------------------
  private static checkPrematureActionRecommendation(
    sentence: string,
    store: SafetyAuthoritativeStore,
    discrepancies: CommunicationSafetyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Recommending aggressive stock investing or crypto when user has high-interest debt (>18%) or low runway (<1 month)
    const urgesAggressiveInvesting =
      /\b(?:aggressively\s+invest|maximize\s+your\s+stock\s+purchases|put\s+(?:your\s+savings|all\s+surplus)\s+into\s+equities)\b/i.test(sLower) ||
      /\b(?:start\s+trading\s+stocks|buy\s+individual\s+stocks\s+now)\b/i.test(sLower);

    if (urgesAggressiveInvesting) {
      // Check if user has high interest debt
      const totalHighDebt = store.highInterestDebts.reduce((sum, d) => sum + d.balance, 0);
      const isLowRunway = store.runwayMonths !== null && store.runwayMonths < 1.0;

      if (totalHighDebt > 1000 || isLowRunway) {
        // If not qualified with debt/runway caveat
        const hasPrerequisiteCaveat =
          sLower.includes('after paying down your high-interest') ||
          sLower.includes('once your debt is addressed') ||
          sLower.includes('if your emergency fund');

        if (!hasPrerequisiteCaveat) {
          discrepancies.push({
            issueType: 'premature_action_recommendation',
            claimText: sentence.trim(),
            severity: 'significant',
            sentenceContext: sentence,
            reason: 'Recommends aggressive equity investing prematurely before addressing urgent high-interest debt or dangerously low liquidity reserves.'
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 10: Irreversible Action Without Confirmation / Caution
  // ---------------------------------------------------------------------------
  private static checkIrreversibleAction(
    sentence: string,
    discrepancies: CommunicationSafetyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Action A: Closing oldest credit cards (harms average credit age and credit score)
    if (/\b(?:close|cancel)\s+(?:your\s+)?(?:oldest|first)\s+credit\s+card\b/i.test(sLower)) {
      const warnsCreditScore =
        sLower.includes('credit score') ||
        sLower.includes('credit history') ||
        sLower.includes('impact your credit') ||
        sLower.includes('average age of accounts');

      if (!warnsCreditScore) {
        discrepancies.push({
          issueType: 'irreversible_action_without_confirmation',
          claimText: sentence.trim(),
          severity: 'significant',
          sentenceContext: sentence,
          reason: 'Recommends closing oldest credit card accounts without cautioning that doing so may shorten credit history and harm credit score.'
        });
        return;
      }
    }

    // Action B: Early 401(k) / retirement withdrawal
    if (/\b(?:withdraw|cash\s+out)\s+(?:from\s+)?(?:your\s+)?(?:401k|401\(k\)|ira|retirement\s+account)\b/i.test(sLower)) {
      const warnsPenalties =
        sLower.includes('penalty') ||
        sLower.includes('tax') ||
        sLower.includes('penalties') ||
        sLower.includes('early withdrawal') ||
        sLower.includes('taxable');

      if (!warnsPenalties) {
        discrepancies.push({
          issueType: 'irreversible_action_without_confirmation',
          claimText: sentence.trim(),
          severity: 'severe',
          sentenceContext: sentence,
          reason: 'Recommends early retirement account withdrawal without warning of potential early-withdrawal tax penalties and loss of compound growth.'
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 11: Personalized Advice Overreach / Absolute Prescription
  // ---------------------------------------------------------------------------
  private static checkPersonalizedAdviceOverreach(
    sentence: string,
    discrepancies: CommunicationSafetyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Absolute claims that a specific financial product is guaranteed to be ideal for the user
    const absoluteProductClaims = [
      /\b(?:this\s+specific\s+policy|this\s+annuity|this\s+loan)\s+is\s+(?:the\s+best|perfect|guaranteed\s+best)\s+for\s+you\b/i,
      /\byou\s+definitely\s+need\s+to\s+buy\s+whole\s+life\s+insurance\b/i,
      /\bthis\s+fund\s+is\s+guaranteed\s+to\s+solve\s+your\s+problems\b/i
    ];

    for (const pattern of absoluteProductClaims) {
      if (pattern.test(sLower)) {
        discrepancies.push({
          issueType: 'personalized_advice_overreach',
          claimText: sentence.trim(),
          severity: 'significant',
          sentenceContext: sentence,
          reason: 'Asserts absolute product suitability without having full underwriting, tax, and risk tolerance documentation.'
        });
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private static isActionSeekingPrompt(query: string): boolean {
    const qLower = query.toLowerCase();
    const actionQueryPatterns = [
      'what should i do',
      'how can i',
      'how do i',
      'what can i do',
      'how should i',
      'recommend',
      'give me advice',
      'how to save',
      'how to reduce',
      'help me reach',
      'what action',
      'next step',
      'where should i cut',
      'how do i cut',
      'how do i fix',
      'how can i fix',
      'fix my',
      'how to fix',
      'how do i balance',
      'how to balance'
    ];

    return actionQueryPatterns.some(pat => qLower.includes(pat));
  }

  private static isOverallEducationalOrHypothetical(query: string, answer: string): boolean {
    const qLower = query.toLowerCase();
    const aLower = answer.toLowerCase();

    // Informational questions: "What is my net savings?", "How much did I spend?", "What is a 401k?"
    const informationalPatterns = [
      'what is my',
      'how much did i',
      'what are my',
      'show me my',
      'what was my',
      'what does',
      'what is a',
      'explain',
      'define'
    ];

    if (informationalPatterns.some(p => qLower.startsWith(p)) && !this.isActionSeekingPrompt(query)) {
      return true;
    }

    if (aLower.includes('educational overview') || aLower.includes('for illustrative purposes')) {
      return true;
    }

    return false;
  }

  private static isExemptSentence(sentence: string): boolean {
    const sLower = sentence.toLowerCase();

    // 1. Quoted text / scam warnings: "Beware of advice saying '...'"
    if (
      (sLower.includes('beware of') || sLower.includes('avoid') || sLower.includes('do not follow advice')) &&
      (sLower.includes("'") || sLower.includes('"'))
    ) {
      return true;
    }

    // 2. Hypothetical scenarios
    if (
      sLower.startsWith('if someone') ||
      sLower.startsWith('hypothetically') ||
      sLower.startsWith('for example, if') ||
      sLower.includes('assuming an investor')
    ) {
      return true;
    }

    // 3. Pure educational definitions
    if (
      sLower.includes('refinancing is defined as') ||
      sLower.includes('a 401(k) allows individuals to') ||
      sLower.includes('the 50/30/20 rule is an educational framework')
    ) {
      return true;
    }

    return false;
  }

  private static splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.?!])\s+(?=[A-Z0-9"'$])/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private static extractAuthoritativeStore(
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    currentConfidence?: { level: 'High' | 'Medium' | 'Low'; score: number }
  ): SafetyAuthoritativeStore {
    const kpisRaw = context?.kpis || toolOutputs?.analytics?.kpis || {};
    const debtsRaw = context?.debts || toolOutputs?.analytics?.debts || [];

    const currentSavings = this.parseAmount(kpisRaw.currentSavings);
    const totalIncome = this.parseAmount(kpisRaw.totalIncome);
    const totalExpense = this.parseAmount(kpisRaw.totalExpense);
    const netSavings = this.parseAmount(kpisRaw.netSavings);
    const runwayMonths = kpisRaw.runwayMonths !== undefined ? Number(kpisRaw.runwayMonths) : null;

    const highInterestDebts: { name: string; balance: number; rate: number }[] = [];
    if (Array.isArray(debtsRaw)) {
      for (const d of debtsRaw) {
        const rate = Number(d.interestRate || d.rate || 0);
        const balance = Number(d.balance || 0);
        if (rate >= 15.0) {
          highInterestDebts.push({
            name: String(d.name || 'Debt'),
            balance,
            rate
          });
        }
      }
    }

    const confLevel = currentConfidence?.level || 'High';
    const confScore = currentConfidence?.score !== undefined ? currentConfidence.score : 0.75;

    return {
      currentSavings,
      totalIncome,
      totalExpense,
      netSavings,
      runwayMonths,
      highInterestDebts,
      currentConfidence: {
        level: confLevel,
        score: confScore
      }
    };
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
}
