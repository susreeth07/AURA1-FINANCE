/**
 * FinancialUncertaintyVerifier — Deterministic Financial Uncertainty, Claim Scope & Confidence Integrity Layer (§AI-2.6)
 *
 * Evaluates AI-generated responses to ensure that:
 * 1. Uncertain financial outcomes are not presented as guaranteed facts.
 * 2. Absolute financial language (risk-free, guaranteed, impossible to lose) is not asserted.
 * 3. Projections are clearly distinguished from verified present facts.
 * 4. False precision is not applied to future predictions.
 * 5. Unsupported causal guarantees are eliminated.
 * 6. AI certainty language is consistent with the verified confidence level.
 * 7. Single verified metrics are not expanded into unsupported broad behavioral judgments.
 * 8. Legitimate uncertainty, conditional advice, educational disclaimers, and mathematical derivations are protected.
 *
 * Operates purely deterministically and locally without any external network or LLM calls.
 */

export interface UncertaintyDiscrepancy {
  readonly issueType:
    | 'guaranteed_future_outcome'
    | 'risk_free_investment_claim'
    | 'absolute_financial_language'
    | 'projection_as_current_fact'
    | 'false_precision_future_prediction'
    | 'unsupported_causal_claim'
    | 'confidence_language_mismatch'
    | 'unsupported_scope_expansion'
    | 'unsupported_behavioral_judgment';
  readonly claimText: string;
  readonly severity: 'minor' | 'significant' | 'severe';
  readonly sentenceContext: string;
  readonly reason: string;
}

export interface FinancialUncertaintyResult {
  readonly isValid: boolean;
  readonly discrepancies: readonly UncertaintyDiscrepancy[];
  readonly warnings: readonly string[];
  readonly reasoning: readonly string[];
  readonly adjustedConfidence?: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
}

export interface UncertaintyVerificationOptions {
  readonly existingWarnings?: readonly string[];
  readonly existingReasoning?: readonly string[];
}

interface AuthoritativeStore {
  readonly currentSavings: number | null;
  readonly monthlyIncome: number | null;
  readonly monthlyExpense: number | null;
  readonly runwayMonths: number | null;
  readonly savingsRate: number | null;
  readonly currentConfidence: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
}

export class FinancialUncertaintyVerifier {
  /**
   * Main verification entry point.
   */
  static verify(
    query: string,
    answerText: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    currentConfidence?: { level: 'High' | 'Medium' | 'Low'; score: number },
    options?: UncertaintyVerificationOptions
  ): FinancialUncertaintyResult {
    const store = this.buildAuthoritativeStore(context, toolOutputs, currentConfidence);
    const sentences = answerText.split(/(?<=[.?!])\s+/);
    const existingWarns = options?.existingWarnings || [];

    const discrepancies: UncertaintyDiscrepancy[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    for (const sentence of sentences) {
      // 1. Check if sentence is an educational rule or explicit risk disclaimer
      if (this.isEducationalOrRiskDisclaimer(sentence)) {
        continue;
      }

      // 2. Rule 7 & Rule 2: Risk-Free Investment Claims & Absolute Zero-Risk Language
      this.checkRiskFreeClaims(sentence, discrepancies);

      // 3. Rule 1 & Rule 2: Guaranteed Outcomes & Absolute Promises
      this.checkGuaranteedOutcomes(sentence, discrepancies);

      // 4. Rule 3, 4, 5: False Precision & Projections Stated as Fixed Future Facts
      this.checkFalsePrecisionAndProjections(sentence, store, discrepancies);

      // 5. Rule 6: Unsupported Causal Guarantees
      this.checkUnsupportedCausalClaims(sentence, discrepancies);

      // 6. Rule 9: Confidence-Language Mismatch
      this.checkConfidenceLanguageMismatch(sentence, store, discrepancies);

      // 7. Rule 10 & Rule 11: Claim Scope Expansion & Broad Behavioral Judgments
      this.checkScopeExpansionAndJudgments(sentence, discrepancies);
    }

    // Filter out discrepancies that duplicate existing warnings from earlier tiers
    const unflaggedDiscrepancies: UncertaintyDiscrepancy[] = [];

    for (const disc of discrepancies) {
      const isAlreadyFlagged = existingWarns.some(w => {
        const wLower = w.toLowerCase();
        if (disc.issueType === 'guaranteed_future_outcome' && wLower.includes('guaranteed')) return true;
        if (disc.issueType === 'risk_free_investment_claim' && wLower.includes('risk-free')) return true;
        if (wLower.includes(disc.issueType.replace(/_/g, ' '))) return true;
        return false;
      });

      if (!isAlreadyFlagged) {
        unflaggedDiscrepancies.push(disc);
        warnings.push(`⚠️ Certainty Note: ${disc.reason}`);
        reasoning.push(`Uncertainty & Scope Integrity: Flagged ${disc.issueType.replace(/_/g, ' ')} (${disc.severity}): ${disc.reason}`);
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

    // Calculate graduated penalties
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
  // Check 1: Risk-Free Investment Claims
  // ---------------------------------------------------------------------------

  private static checkRiskFreeClaims(
    sentence: string,
    discrepancies: UncertaintyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Guard against negative educational disclaimers ("returns are not guaranteed", "is not risk-free", "not 100% safe")
    if (this.isEducationalOrRiskDisclaimer(sentence)) {
      return;
    }

    // Pattern A: "risk-free", "100% safe", "zero risk", "no risk" applied to investments or returns
    const riskFreeMatch =
      sLower.match(/\b(completely|totally|entirely)?\s*(risk-free|risk\s+free|100%\s+safe|zero\s+risk|no\s+risk)\b/i);

    if (riskFreeMatch) {
      // Ensure it's not negated in the immediate vicinity
      const idx = sLower.indexOf(riskFreeMatch[0]);
      const prefix = sLower.slice(Math.max(0, idx - 25), idx);
      if (!prefix.includes('not') && !prefix.includes('never') && !prefix.includes('no investment is')) {
        discrepancies.push({
          issueType: 'risk_free_investment_claim',
          claimText: riskFreeMatch[0].trim(),
          severity: 'severe',
          sentenceContext: sentence,
          reason: 'Financial assets, investments, and capital cannot be described as risk-free or 100% safe.'
        });
        return;
      }
    }

    // Pattern B: "crypto cannot lose value", "cannot lose money", "impossible to lose", "zero chance you can lose money"
    const cannotLoseMatch =
      sLower.match(/\b(cannot|can\s+not|impossible\s+to|zero\s+chance\s+(?:that\s+)?(?:you\s+)?(?:can\s+)?)\s*lose\s+(money|value)\b/i);

    if (cannotLoseMatch) {
      discrepancies.push({
        issueType: 'risk_free_investment_claim',
        claimText: cannotLoseMatch[0].trim(),
        severity: 'severe',
        sentenceContext: sentence,
        reason: 'Asset values fluctuate and it is impossible to guarantee that an investor cannot lose money.'
      });
      return;
    }

    // Pattern C: "this stock is guaranteed to increase", "guaranteed to make you money", "guaranteed to earn X%"
    const stockGuaranteedMatch =
      sLower.match(/\b(this\s+stock|crypto|investment|shares?|equities)\s+(is|are)\s+guaranteed\s+to\s+(increase|rise|make\s+money|gain)\b/i) ||
      sLower.match(/\bguaranteed\s+to\s+(?:earn|make|return)\s+[0-9]+%/i) ||
      sLower.match(/\bzero\s+downside\b/i);

    if (stockGuaranteedMatch) {
      discrepancies.push({
        issueType: 'risk_free_investment_claim',
        claimText: stockGuaranteedMatch[0].trim(),
        severity: 'severe',
        sentenceContext: sentence,
        reason: 'Investment growth and returns are never guaranteed, and zero downside cannot be promised.'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 2: Guaranteed Future Outcomes & Absolute Promises
  // ---------------------------------------------------------------------------

  private static checkGuaranteedOutcomes(
    sentence: string,
    discrepancies: UncertaintyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    if (this.isEducationalOrRiskDisclaimer(sentence)) {
      return;
    }

    // Pattern A: "you will definitely [save/reach/have/be debt-free/hit/double/make]" or "will certainly [double/make/reach]"
    const defMatch =
      sLower.match(/\b(?:you\s+|this\s+[\w\s]{1,20}\s+)?will\s+(?:definitely|certainly)\s+(save|reach|have|be\s+debt-free|hit|accumulate|be\s+financially|double|make|earn|gain)\b/i);
    if (defMatch) {
      discrepancies.push({
        issueType: 'guaranteed_future_outcome',
        claimText: defMatch[0].trim(),
        severity: 'severe',
        sentenceContext: sentence,
        reason: 'Future financial milestones depend on external conditions and cannot be stated with definite certainty.'
      });
      return;
    }

    // Pattern B: "guaranteed to reach your goal", "guaranteed to be debt-free"
    const guarGoalMatch = sLower.match(/\b(are|is)\s+guaranteed\s+to\s+(reach|be\s+debt-free|have|save|hit)\b/i);
    if (guarGoalMatch) {
      const idx = sLower.indexOf(guarGoalMatch[0]);
      const prefix = sLower.slice(Math.max(0, idx - 25), idx);
      if (!prefix.includes('not') && !prefix.includes('never')) {
        discrepancies.push({
          issueType: 'guaranteed_future_outcome',
          claimText: guarGoalMatch[0].trim(),
          severity: 'severe',
          sentenceContext: sentence,
          reason: 'This financial outcome cannot be guaranteed from the available information.'
        });
        return;
      }
    }

    // Pattern C: "ensures you will be completely debt-free", "guarantees you will earn"
    const ensuresDebtFreeMatch = sLower.match(/\bensures\s+(?:you\s+will\s+be\s+)?(?:completely\s+)?debt-free\b/i);
    if (ensuresDebtFreeMatch) {
      discrepancies.push({
        issueType: 'guaranteed_future_outcome',
        claimText: ensuresDebtFreeMatch[0].trim(),
        severity: 'severe',
        sentenceContext: sentence,
        reason: 'Debt elimination timelines cannot be guaranteed with absolute certainty.'
      });
      return;
    }

    const guaranteesEarnMatch = sLower.match(/\bguarantees\s+(?:that\s+)?you\s+will\s+(?:earn|make|save|have)\b/i);
    if (guaranteesEarnMatch) {
      discrepancies.push({
        issueType: 'guaranteed_future_outcome',
        claimText: guaranteesEarnMatch[0].trim(),
        severity: 'severe',
        sentenceContext: sentence,
        reason: 'Future income and earnings cannot be guaranteed.'
      });
      return;
    }

    // Pattern D: "100% certainty", "without any doubt whatsoever"
    const certaintyMatch = sLower.match(/\b(?:with\s+)?100%\s+certainty\b/i);
    if (certaintyMatch) {
      discrepancies.push({
        issueType: 'absolute_financial_language',
        claimText: certaintyMatch[0].trim(),
        severity: 'severe',
        sentenceContext: sentence,
        reason: 'Absolute 100% certainty language violates financial uncertainty principles.'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 3: False Precision & Projections Stated as Fixed Future Facts
  // ---------------------------------------------------------------------------

  private static checkFalsePrecisionAndProjections(
    sentence: string,
    store: AuthoritativeStore,
    discrepancies: UncertaintyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    const hasApproximationWord =
      sLower.includes('approximately') ||
      sLower.includes('around') ||
      sLower.includes('roughly') ||
      sLower.includes('about') ||
      sLower.includes('estimated') ||
      sLower.includes('could') ||
      sLower.includes('may') ||
      sLower.includes('might') ||
      sLower.includes('likely') ||
      sLower.includes('potentially');

    // Case 1: "will remain exactly X for the next year / 12 months"
    if (sLower.includes('will remain exactly') || (sLower.includes('remain exactly') && (sLower.includes('year') || sLower.includes('month')))) {
      discrepancies.push({
        issueType: 'false_precision_future_prediction',
        claimText: 'will remain exactly',
        severity: 'significant',
        sentenceContext: sentence,
        reason: 'Runway and reserve projections cannot be asserted to remain static over future time horizons.'
      });
      return;
    }

    // Case 2: Future date false precision with exact cents: "will be worth exactly $47,823.14 in 5 years"
    const futureExactCentsMatch = sLower.match(/will\s+(?:have|be(?:\s+worth)?)\s+(?:exactly\s+)?(?:[\$€£₹]|usd\s*)?([0-9,]+\.[0-9]{2})\s+(?:available\s+)?(?:on|by|in|next\s+year|in\s+[0-9]+\s+years?)/i);
    if (futureExactCentsMatch) {
      discrepancies.push({
        issueType: 'false_precision_future_prediction',
        claimText: futureExactCentsMatch[0].trim(),
        severity: 'significant',
        sentenceContext: sentence,
        reason: 'Future account balances cannot be predicted with exact cent-level precision.'
      });
      return;
    }

    // Case 3: Exact future payoff date with calendar day: "on exactly October 14, 2028"
    const exactDateMatch = sLower.match(/\bon\s+exactly\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+[0-9]{1,2}(?:st|nd|rd|th)?,?\s+[0-9]{4}\b/i);
    if (exactDateMatch) {
      discrepancies.push({
        issueType: 'false_precision_future_prediction',
        claimText: exactDateMatch[0].trim(),
        severity: 'significant',
        sentenceContext: sentence,
        reason: 'Debt payoff completion cannot be predicted to a precise calendar date years in advance.'
      });
      return;
    }

    // Case 4: Future definite balance without conditional assumptions or approximation: "will have $50,000 ... by next August"
    const futureDefiniteBal = sLower.match(/you\s+will\s+have\s+(?:[\$€£₹]|usd\s*)?([0-9,]+(?:\.[0-9]+)?)\s+(?:in\s+your\s+account\s+)?(?:[0-9]+\s+months?\s+from\s+now|next\s+year|by\s+next\s+[a-z]+)/i);
    if (futureDefiniteBal && !hasApproximationWord && !sLower.includes('assuming') && !sLower.includes('if you')) {
      discrepancies.push({
        issueType: 'projection_as_current_fact',
        claimText: futureDefiniteBal[0].trim(),
        severity: 'significant',
        sentenceContext: sentence,
        reason: 'Future savings balance asserted as an unconditioned factual outcome rather than a projection.'
      });
      return;
    }

    // Case 5: Stating future projection as already existing fact: "You already have $15,000 saved for retirement next year."
    const alreadySavedNextYear = sLower.match(/\balready\s+have\s+(?:[\$€£₹]|usd\s*)?([0-9,]+(?:\.[0-9]+)?)\s+saved\s+(?:for\s+[\w\s]{0,25})?(?:next\s+year|in\s+the\s+future)\b/i);
    if (alreadySavedNextYear) {
      discrepancies.push({
        issueType: 'projection_as_current_fact',
        claimText: alreadySavedNextYear[0].trim(),
        severity: 'significant',
        sentenceContext: sentence,
        reason: 'Future projected savings asserted as an already possessed present asset.'
      });
      return;
    }

    // Case 6: "You will reach your goal in exactly X months"
    const exactMonthsMatch = sLower.match(/\bwill\s+reach\s+(?:the|your)\s+goal\s+in\s+exactly\s+[0-9]+\s+months\b/i);
    if (exactMonthsMatch) {
      discrepancies.push({
        issueType: 'false_precision_future_prediction',
        claimText: exactMonthsMatch[0].trim(),
        severity: 'significant',
        sentenceContext: sentence,
        reason: 'Goal attainment timeline asserted with exact future precision without acknowledging variability.'
      });
      return;
    }

    // Case 7: "You will definitely have $5,000 next year."
    if (sLower.includes('will definitely have') && (sLower.includes('next year') || sLower.includes('in a year'))) {
      discrepancies.push({
        issueType: 'guaranteed_future_outcome',
        claimText: 'will definitely have',
        severity: 'severe',
        sentenceContext: sentence,
        reason: 'Future asset balances cannot be guaranteed.'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 4: Unsupported Causal Guarantees
  // ---------------------------------------------------------------------------

  private static checkUnsupportedCausalClaims(
    sentence: string,
    discrepancies: UncertaintyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Check for explicit mathematical derivations with assumptions stated:
    if (sLower.includes('assuming all other spending') || sLower.includes('assuming other spending remains unchanged') || sLower.includes('would increase your monthly surplus by')) {
      return;
    }

    // Negation guard: "obviously you won't become a millionaire"
    if (sLower.includes("won't") || sLower.includes('will not') || sLower.includes('cannot')) {
      return;
    }

    // Patterns asserting guaranteed causal outcomes:
    const causalPatterns = [
      /\bbuying\s+this\s+will\s+definitely\s+improve\b/i,
      /\bwill\s+definitely\s+make\s+you\s+financially\s+secure\b/i,
      /\bwill\s+make\s+you\s+financially\s+secure\b/i,
      /\bwill\s+guarantee\s+financial\s+independence\b/i,
      /\bguarantee\s+financial\s+independence\b/i,
      /\b(?:will\s+)?make\s+you\s+a\s+millionaire\b/i
    ];

    for (const pattern of causalPatterns) {
      if (pattern.test(sentence)) {
        discrepancies.push({
          issueType: 'unsupported_causal_claim',
          claimText: sentence.trim(),
          severity: 'significant',
          sentenceContext: sentence,
          reason: 'Individual financial actions cannot be causally guaranteed to produce overall wealth or financial independence.'
        });
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 5: Confidence-Language Mismatch & Absolute Epistemic Claims
  // ---------------------------------------------------------------------------

  private static checkConfidenceLanguageMismatch(
    sentence: string,
    store: AuthoritativeStore,
    discrepancies: UncertaintyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Extreme superlatives / universal certainty (regardless of confidence):
    if (sLower.includes('undeniably the single best') || sLower.includes('without any doubt whatsoever')) {
      discrepancies.push({
        issueType: 'absolute_financial_language',
        claimText: sentence.trim(),
        severity: 'severe',
        sentenceContext: sentence,
        reason: 'Universal superlatives asserting an undeniably single best financial choice violate objective advisory standards.'
      });
      return;
    }

    // If verified confidence is moderate or low (score < 0.80 or level !== 'High')
    const isModerateOrLowConfidence = store.currentConfidence.score < 0.80 || store.currentConfidence.level !== 'High';

    if (isModerateOrLowConfidence) {
      const overconfidentPhrases = [
        'i am completely certain',
        'there is absolutely no doubt',
        'without any doubt whatsoever',
        '100% sure',
        'beyond any doubt',
        'there is no doubt whatsoever'
      ];

      for (const phrase of overconfidentPhrases) {
        if (sLower.includes(phrase)) {
          discrepancies.push({
            issueType: 'confidence_language_mismatch',
            claimText: phrase,
            severity: 'minor',
            sentenceContext: sentence,
            reason: 'AI answer expresses absolute epistemic certainty that conflicts with the verified moderate/low confidence level.'
          });
          return;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 6: Scope Expansion & Broad Behavioral Judgments
  // ---------------------------------------------------------------------------

  private static checkScopeExpansionAndJudgments(
    sentence: string,
    discrepancies: UncertaintyDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Categorical behavioral judgments:
    const judgmentPatterns = [
      /\byou\s+are\s+financially\s+irresponsible\b/i,
      /\bpoor\s+financial\s+discipline\b/i,
      /\bproves\s+you\s+have\s+poor\s+(?:financial\s+)?discipline\b/i,
      /\bspending\s+habits\s+are\s+unhealthy\b/i,
      /\bguaranteed\s+to\s+become\s+financially\s+successful\b/i,
      /\bproving\s+you\s+are\s+finally\s+making\s+smart\s+financial\s+choices\b/i
    ];

    for (const pattern of judgmentPatterns) {
      if (pattern.test(sentence)) {
        discrepancies.push({
          issueType: 'unsupported_behavioral_judgment',
          claimText: sentence.trim(),
          severity: 'significant',
          sentenceContext: sentence,
          reason: 'Categorical behavioral judgments exceed the factual scope of verified financial metrics.'
        });
        return;
      }
    }

    // Catastrophic or unwarranted generalization: "your entire budget will collapse"
    if (sLower.includes('entire budget will collapse')) {
      discrepancies.push({
        issueType: 'unsupported_scope_expansion',
        claimText: 'entire budget will collapse',
        severity: 'significant',
        sentenceContext: sentence,
        reason: 'A localized spending variance does not justify catastrophic claims of entire budget collapse.'
      });
      return;
    }

    // Scope expansion from a single metric to overall health:
    if (sLower.includes('you are financially secure') && (sLower.includes('savings rate') || sLower.includes('because'))) {
      discrepancies.push({
        issueType: 'unsupported_scope_expansion',
        claimText: 'you are financially secure',
        severity: 'minor',
        sentenceContext: sentence,
        reason: 'A single verified financial metric does not establish a broad conclusion of overall financial security.'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Store Builder & Utilities
  // ---------------------------------------------------------------------------

  private static buildAuthoritativeStore(
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    currentConfidence?: { level: 'High' | 'Medium' | 'Low'; score: number }
  ): AuthoritativeStore {
    const kpisRaw = context?.kpis || toolOutputs?.analytics?.kpis || toolOutputs?.health || {};

    const currentSavings = this.parseAmount(kpisRaw.currentSavings);
    const monthlyIncome = this.parseAmount(kpisRaw.totalIncome);
    const monthlyExpense = this.parseAmount(kpisRaw.totalExpense);
    const runwayMonths = kpisRaw.runwayMonths !== undefined ? Number(kpisRaw.runwayMonths) : null;
    const savingsRate = kpisRaw.savingsRate !== undefined ? Number(kpisRaw.savingsRate) : null;

    const confLevel = currentConfidence?.level || 'High';
    const confScore = currentConfidence?.score !== undefined ? currentConfidence.score : 0.75;

    return {
      currentSavings,
      monthlyIncome,
      monthlyExpense,
      runwayMonths,
      savingsRate,
      currentConfidence: {
        level: confLevel,
        score: confScore
      }
    };
  }

  private static isEducationalOrRiskDisclaimer(sentence: string): boolean {
    const sLower = sentence.toLowerCase();

    // 1. Framework & Guideline definitions
    if (
      sLower.includes('50/30/20') ||
      sLower.includes('70/20/10') ||
      sLower.includes('80/20') ||
      sLower.includes('rule of thumb') ||
      sLower.includes('standard guideline') ||
      sLower.includes('conventional wisdom') ||
      sLower.includes('common rule') ||
      sLower.includes('generally recommended') ||
      sLower.includes('often recommend') ||
      sLower.includes('experts recommend') ||
      sLower.includes('common guideline') ||
      sLower.includes('mitigate single-stock volatility') ||
      sLower.includes('diversifying across') ||
      sLower.includes('historically, the s&p')
    ) {
      return true;
    }

    // 2. Explicit negative disclaimers & risk disclosures:
    if (
      sLower.includes('not guaranteed') ||
      sLower.includes('no guarantee') ||
      sLower.includes('cannot be guaranteed') ||
      sLower.includes('cannot guarantee') ||
      sLower.includes('is not risk-free') ||
      sLower.includes('not risk-free') ||
      sLower.includes('not 100% safe') ||
      sLower.includes('all investments carry risk') ||
      sLower.includes('stocks carry risk') ||
      sLower.includes('past performance does not guarantee') ||
      sLower.includes('past performance is no guarantee') ||
      sLower.includes('emergency funds are generally recommended before') ||
      sLower.match(/\bno\b[\w\s]{0,60}\brisk-free\b/i) ||
      sLower.includes('avoid anyone who') ||
      sLower.includes('beware of') ||
      sLower.includes('often called a guaranteed return') ||
      sLower.includes("won't become a billionaire") ||
      sLower.includes("won't become a millionaire")
    ) {
      return true;
    }

    return false;
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
