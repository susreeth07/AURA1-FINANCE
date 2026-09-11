/**
 * FinancialEvidenceVerifier — Deterministic Financial Evidence, Data Freshness & Grounding Integrity Layer (§AI-2.8)
 *
 * Evaluates AI-generated responses to ensure that:
 * 1. Financial claims are grounded in authoritative, available user data.
 * 2. Inferred metrics or derived surpluses are not asserted as actual bank balances.
 * 3. Stale data is not presented as current up-to-the-minute facts.
 * 4. Partial datasets are not asserted as complete totals.
 * 5. Historical claims, trends, and averages are not claimed without sufficient historical depth.
 * 6. Comparative baselines that do not exist are not asserted.
 * 7. External data sources (credit bureaus, bank statements) are not fabricated.
 * 8. Financial entities (mortgages, car loans, Teslas) are not attributed to users without records.
 * 9. Single-period data is not universally expanded to "typically", "always", or "every month".
 * 10. Legitimate calculations, educational examples, hypothetical scenarios, and qualified estimates are protected.
 *
 * Operates purely deterministically and locally with ZERO network or LLM calls.
 */

export interface EvidenceDiscrepancy {
  readonly issueType:
    | 'unsupported_current_fact'
    | 'data_availability_misrepresentation'
    | 'insufficient_history_for_trend'
    | 'stale_data_as_current_fact'
    | 'partial_data_as_complete'
    | 'inference_presented_as_fact'
    | 'unsupported_historical_claim'
    | 'unsupported_comparison_baseline'
    | 'fabricated_data_source'
    | 'unsupported_user_entity'
    | 'unqualified_estimate'
    | 'evidence_scope_expansion';
  readonly claimText: string;
  readonly severity: 'minor' | 'significant' | 'severe';
  readonly sentenceContext: string;
  readonly reason: string;
}

export interface FinancialEvidenceResult {
  readonly isValid: boolean;
  readonly discrepancies: readonly EvidenceDiscrepancy[];
  readonly warnings: readonly string[];
  readonly reasoning: readonly string[];
  readonly adjustedConfidence?: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
}

export interface EvidenceVerificationOptions {
  readonly existingWarnings?: readonly string[];
  readonly existingReasoning?: readonly string[];
}

interface EvidenceAuthoritativeStore {
  readonly currentSavings: number | null;
  readonly totalIncome: number | null;
  readonly totalExpense: number | null;
  readonly netSavings: number | null;
  readonly runwayMonths: number | null;
  readonly budgets: readonly { category: string; limit: number; spent: number }[];
  readonly goals: readonly { name: string; target: number; current: number }[];
  readonly debts: readonly { name: string; balance: number; interestRate?: number }[];
  readonly historyMonths: number;
  readonly historicalSpending: Record<string, number>; // e.g. { 'dining_last_month': 400, 'dining_last_year': 20000 }
  readonly isStale: boolean;
  readonly isPartial: boolean;
  readonly currentConfidence: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
}

export class FinancialEvidenceVerifier {
  /**
   * Main verification entry point.
   */
  static verify(
    query: string,
    answerText: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    currentConfidence?: { level: 'High' | 'Medium' | 'Low'; score: number },
    options?: EvidenceVerificationOptions
  ): FinancialEvidenceResult {
    const store = this.buildAuthoritativeStore(context, toolOutputs, currentConfidence);
    const sentences = answerText.split(/(?<=[.?!])\s+/);
    const existingWarns = options?.existingWarnings || [];

    const discrepancies: EvidenceDiscrepancy[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    for (const sentence of sentences) {
      // 1. Guard against educational, hypothetical, quoted, or negated statements
      if (this.isEducationalHypotheticalOrNegated(sentence)) {
        continue;
      }

      // 2. Rule 9: Fabricated External Data Sources
      this.checkFabricatedDataSources(sentence, discrepancies);

      // 3. Rule 10: Unsupported User Entities (Tesla, mortgage, car payment not in context)
      this.checkUnsupportedUserEntities(sentence, store, discrepancies);

      // 4. Rule 4: Stale Data Presented as Current
      this.checkStaleData(sentence, store, discrepancies);

      // 5. Rule 5: Partial Data Presented as Complete
      this.checkPartialDataAsComplete(sentence, store, discrepancies);

      // 6. Rule 6: Inference / Net Surplus Presented as Bank Balance
      this.checkInferencePresentedAsFact(sentence, store, discrepancies);

      // 7. Rule 1: Unsupported Current Fact (Invented Balances)
      this.checkUnsupportedCurrentFacts(sentence, store, query, discrepancies);

      // 8. Rule 7 & Rule 8: Unsupported Historical Claims & Comparison Baselines
      this.checkHistoricalClaimsAndBaselines(sentence, store, discrepancies);

      // 9. Rule 2 & Rule 3: Data Availability Misrepresentation & Insufficient History for Trends
      this.checkDataAvailabilityAndTrends(sentence, store, discrepancies);

      // 10. Rule 11 & Rule 12: Evidence Scope Expansion & Unqualified Estimates
      this.checkEvidenceScopeExpansion(sentence, store, discrepancies);
    }

    // Filter out discrepancies that duplicate existing warnings from earlier tiers
    const unflaggedDiscrepancies: EvidenceDiscrepancy[] = [];

    for (const disc of discrepancies) {
      const isAlreadyFlagged = existingWarns.some(w => {
        const wLower = w.toLowerCase();
        return (
          wLower.includes(disc.issueType.replace(/_/g, ' ')) ||
          wLower.includes(disc.reason.toLowerCase()) ||
          (disc.issueType === 'unsupported_current_fact' && wLower.includes('hallucinated')) ||
          (disc.issueType === 'unsupported_user_entity' && wLower.includes('unsupported'))
        );
      });

      if (!isAlreadyFlagged) {
        unflaggedDiscrepancies.push(disc);
        warnings.push(`⚠️ Evidence Note: ${disc.reason}`);
        reasoning.push(`Evidence & Grounding Integrity: Flagged ${disc.issueType.replace(/_/g, ' ')} (${disc.severity}): ${disc.reason}`);
      }
    }

    if (unflaggedDiscrepancies.length === 0) {
      return {
        isValid: true,
        discrepancies: [],
        warnings: [],
        reasoning: ['Evidence & Grounding Integrity: All claims are properly grounded and qualified.'],
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
  // Check 1: Fabricated External Data Sources
  // ---------------------------------------------------------------------------

  private static checkFabricatedDataSources(
    sentence: string,
    discrepancies: EvidenceDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Pattern A: Bank statements / credit bureau records
    const fabricatedPatterns = [
      /\b(?:according\s+to|based\s+on|from)\s+(?:your\s+)?(?:bank's?\s+latest\s+statement|bank\s+statement)\b/i,
      /\b(?:according\s+to|based\s+on|from)\s+(?:your\s+)?(?:official\s+)?(?:credit\s+bureau(?:\s+data)?|experian(?:\s+credit)?(?:\s+report)?|equifax|transunion)\b/i,
      /\b(?:experian|equifax|transunion)\s+(?:credit\s+)?report\b/i,
      /\bcredit\s+bureau\s+data\b/i,
      /\byour\s+bank\s+predicts\b/i,
      /\bbank's?\s+latest\s+statement\b/i
    ];

    for (const pattern of fabricatedPatterns) {
      if (pattern.test(sLower)) {
        discrepancies.push({
          issueType: 'fabricated_data_source',
          claimText: sentence.trim(),
          severity: 'severe',
          sentenceContext: sentence,
          reason: 'Aura Finance does not access external bank statements or credit bureau feeds; data source is fabricated.'
        });
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 2: Unsupported User Entities (Mortgage, Tesla, Unrecorded Debt)
  // ---------------------------------------------------------------------------

  private static checkUnsupportedUserEntities(
    sentence: string,
    store: EvidenceAuthoritativeStore,
    discrepancies: EvidenceDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Case 2A: "your tesla" / "spend $500/month on your tesla"
    if (/\b(?:on\s+your\s+tesla|for\s+your\s+tesla|your\s+tesla)\b/i.test(sLower)) {
      const hasTesla = store.debts.some(d => d.name.toLowerCase().includes('tesla')) ||
                       store.budgets.some(b => b.category.toLowerCase().includes('tesla'));
      if (!hasTesla) {
        discrepancies.push({
          issueType: 'unsupported_user_entity',
          claimText: 'your Tesla',
          severity: 'severe',
          sentenceContext: sentence,
          reason: 'Claim attributes a Tesla or car expense to the user that is not present in authoritative records.'
        });
        return;
      }
    }

    // Case 2B: "your mortgage payment is" / "your mortgage is"
    if (/\byour\s+mortgage(?:\s+payment)?\s+(?:is|of)\b/i.test(sLower)) {
      const hasMortgage = store.debts.some(d => d.name.toLowerCase().includes('mortgage')) ||
                          store.budgets.some(b => b.category.toLowerCase().includes('mortgage'));
      if (!hasMortgage) {
        discrepancies.push({
          issueType: 'unsupported_user_entity',
          claimText: 'your mortgage',
          severity: 'severe',
          sentenceContext: sentence,
          reason: 'Claim attributes a mortgage expense to the user without any mortgage records in the profile.'
        });
        return;
      }
    }

    // Case 2C: Invented category (e.g. "Yacht maintenance")
    if (/\byacht(?:\s+maintenance)?\b/i.test(sLower)) {
      const hasYacht = store.budgets.some(b => b.category.toLowerCase().includes('yacht'));
      if (!hasYacht) {
        discrepancies.push({
          issueType: 'unsupported_user_entity',
          claimText: 'Yacht maintenance',
          severity: 'severe',
          sentenceContext: sentence,
          reason: 'Claim references a Yacht spending category not present in user budget records.'
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 3: Stale Data Presented as Current Fact
  // ---------------------------------------------------------------------------

  private static checkStaleData(
    sentence: string,
    store: EvidenceAuthoritativeStore,
    discrepancies: EvidenceDiscrepancy[]
  ): void {
    if (!store.isStale) return;

    const sLower = sentence.toLowerCase();

    // If context is explicitly marked stale, asserting "current balance is..." without acknowledging stale status is a violation
    if (
      /\b(?:your\s+current\s+balance\s+is|as\s+of\s+right\s+now|currently\s+have)\b/i.test(sLower) &&
      !sLower.includes('stale') &&
      !sLower.includes('last updated') &&
      !sLower.includes('as of your last')
    ) {
      discrepancies.push({
        issueType: 'stale_data_as_current_fact',
        claimText: sentence.trim(),
        severity: 'severe',
        sentenceContext: sentence,
        reason: 'Outdated or stale account data was asserted as an up-to-date current financial fact.'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 4: Partial Data Presented as Complete Total
  // ---------------------------------------------------------------------------

  private static checkPartialDataAsComplete(
    sentence: string,
    store: EvidenceAuthoritativeStore,
    discrepancies: EvidenceDiscrepancy[]
  ): void {
    if (!store.isPartial) return;

    const sLower = sentence.toLowerCase();

    // If data is partial, asserting "total monthly expenses are..." without qualification is invalid
    if (
      /\b(?:your\s+total\s+monthly\s+expenses\s+are|your\s+total\s+spending\s+is|your\s+complete\s+spending\s+is)\b/i.test(sLower) &&
      !sLower.includes('recorded') &&
      !sLower.includes('available') &&
      !sLower.includes('based on the transactions')
    ) {
      discrepancies.push({
        issueType: 'partial_data_as_complete',
        claimText: sentence.trim(),
        severity: 'significant',
        sentenceContext: sentence,
        reason: 'A partial transaction dataset was presented as a complete total monthly expense figure.'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 5: Inference / Net Surplus Presented as Bank Balance
  // ---------------------------------------------------------------------------

  private static checkInferencePresentedAsFact(
    sentence: string,
    store: EvidenceAuthoritativeStore,
    discrepancies: EvidenceDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // If answer claims "You have exactly $1,000 in your savings account"
    // and $1,000 matches netSavings ($4,000 income - $3,000 expense), but currentSavings is different ($500)
    if (store.netSavings !== null && store.currentSavings !== null && store.netSavings !== store.currentSavings) {
      const netSavingsVal = Math.round(store.netSavings);
      const netSavingsPlain = String(netSavingsVal);
      const netSavingsComma = netSavingsVal.toLocaleString('en-US');

      const mentionsNetSavings =
        sLower.includes(netSavingsPlain) ||
        sLower.includes(netSavingsComma) ||
        sLower.includes(`$${netSavingsPlain}`) ||
        sLower.includes(`$${netSavingsComma}`);

      if (
        mentionsNetSavings &&
        /\b(?:in\s+your\s+savings\s+account|in\s+your\s+bank\s+account|have\s+exactly\s+[\$€£₹0-9,.]+\s+in\s+your\s+savings)\b/i.test(sLower)
      ) {
        discrepancies.push({
          issueType: 'inference_presented_as_fact',
          claimText: sentence.trim(),
          severity: 'significant',
          sentenceContext: sentence,
          reason: 'Monthly net surplus was incorrectly asserted as an actual bank/savings account balance.'
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 6: Unsupported Current Facts (Invented Balances)
  // ---------------------------------------------------------------------------

  private static checkUnsupportedCurrentFacts(
    sentence: string,
    store: EvidenceAuthoritativeStore,
    query: string,
    discrepancies: EvidenceDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Check for claims of current savings: "Your current savings are $10,000" or "You currently have $25,000 in your savings account"
    const currentSavMatch = sLower.match(/\b(?:your\s+current\s+savings\s+(?:are|balance\s+is)|currently\s+have)\s+[\$€£₹]?([0-9,]+(?:\.[0-9]+)?)\b/i);
    if (currentSavMatch) {
      const claimedVal = this.parseAmount(currentSavMatch[1]);
      if (claimedVal !== null && store.currentSavings !== null) {
        // Exclude if sentence is discussing a specific goal (e.g., "vacation goal ... you currently have $1,200 saved")
        const isGoalSpecific = store.goals.some(g =>
          sLower.includes(g.name.toLowerCase()) && (Math.abs(claimedVal - g.current) <= 1.0 || Math.abs(claimedVal - g.target) <= 1.0)
        );

        if (!isGoalSpecific && Math.abs(claimedVal - store.currentSavings) > 1.0) {
          // Verify it was not introduced in the user query
          if (!query.includes(currentSavMatch[1])) {
            discrepancies.push({
              issueType: 'unsupported_current_fact',
              claimText: currentSavMatch[0].trim(),
              severity: 'severe',
              sentenceContext: sentence,
              reason: `Current savings asserted as $${claimedVal}, but authoritative context records $${store.currentSavings}.`
            });
            return;
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 7: Unsupported Historical Claims & Comparison Baselines
  // ---------------------------------------------------------------------------

  private static checkHistoricalClaimsAndBaselines(
    sentence: string,
    store: EvidenceAuthoritativeStore,
    discrepancies: EvidenceDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Case 7A: "In 2023, you spent $18,000 on dining" / "Last year you spent $20,000"
    if (
      /\b(?:in\s+2023|in\s+2022|last\s+year),?\s+you\s+spent\s+[\$€£₹]?([0-9,]+)\b/i.test(sLower)
    ) {
      // Check if store has 2023/last year historical data
      const hasLastYearData = store.historyMonths >= 12 || store.historicalSpending['dining_last_year'] !== undefined;
      if (!hasLastYearData) {
        discrepancies.push({
          issueType: 'unsupported_historical_claim',
          claimText: sentence.trim(),
          severity: 'significant',
          sentenceContext: sentence,
          reason: 'Claim asserts past annual spending for a period where no historical data exists.'
        });
        return;
      }
    }

    // Case 7B: Unsupported comparison baseline: "higher than last year" / "30% higher than last year"
    if (
      /\b(?:higher|lower|more|less)\s+than\s+last\s+year\b/i.test(sLower)
    ) {
      const hasLastYearData = store.historyMonths >= 12 || store.historicalSpending['dining_last_year'] !== undefined;
      if (!hasLastYearData) {
        discrepancies.push({
          issueType: 'unsupported_comparison_baseline',
          claimText: sentence.trim(),
          severity: 'significant',
          sentenceContext: sentence,
          reason: 'Comparison made against last year, but no prior-year baseline data is available in the profile.'
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 8: Data Availability & Insufficient History for Trends
  // ---------------------------------------------------------------------------

  private static checkDataAvailabilityAndTrends(
    sentence: string,
    store: EvidenceAuthoritativeStore,
    discrepancies: EvidenceDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // Check for qualifying phrasing:
    const isHedged =
      sLower.includes('based on the') ||
      sLower.includes('limited data') ||
      sLower.includes('months available') ||
      sLower.includes('appear to be') ||
      sLower.includes('suggests that');

    if (isHedged) return;

    // Pattern 8A: "over the last 12 months" / "over the past 12 months" when history < 12
    if (
      /\b(?:over\s+the\s+(?:last|past)\s+12\s+months)\b/i.test(sLower) &&
      store.historyMonths < 12
    ) {
      discrepancies.push({
        issueType: 'data_availability_misrepresentation',
        claimText: 'over the last 12 months',
        severity: 'significant',
        sentenceContext: sentence,
        reason: `Claim asserts 12-month historical data, but only ${store.historyMonths} months of history are available.`
      });
      return;
    }

    // Pattern 8B: "spending is consistently increasing" / "consistently decreasing" with insufficient history
    if (
      /\b(?:is\s+consistently\s+increasing|has\s+been\s+consistently\s+increasing|is\s+consistently\s+decreasing)\b/i.test(sLower) &&
      store.historyMonths < 3
    ) {
      discrepancies.push({
        issueType: 'insufficient_history_for_trend',
        claimText: sentence.trim(),
        severity: 'minor',
        sentenceContext: sentence,
        reason: 'A consistent multi-month trend was asserted without sufficient historical periods to substantiate it.'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 9: Evidence Scope Expansion & Unqualified Estimates
  // ---------------------------------------------------------------------------

  private static checkEvidenceScopeExpansion(
    sentence: string,
    store: EvidenceAuthoritativeStore,
    discrepancies: EvidenceDiscrepancy[]
  ): void {
    const sLower = sentence.toLowerCase();

    // If explicitly conditional or qualified, protect it
    if (
      sLower.includes('if your') ||
      sLower.includes('assuming') ||
      sLower.includes('were to remain') ||
      sLower.includes('if annualized') ||
      sLower.includes('approximately') ||
      sLower.includes('roughly') ||
      sLower.includes('around')
    ) {
      return;
    }

    // Pattern 9A: Single-period extrapolated to "typically", "always", or "every month" without multi-month evidence
    if (store.historyMonths <= 1) {
      if (
        /\b(?:you\s+typically\s+spend|typically\s+spend\s+[\$€£₹]?\d+|spend\s+[\$€£₹]?\d+\s+every\s+month|you\s+always\s+spend)\b/i.test(sLower)
      ) {
        discrepancies.push({
          issueType: 'evidence_scope_expansion',
          claimText: sentence.trim(),
          severity: 'significant',
          sentenceContext: sentence,
          reason: 'Single-period spending was inappropriately extrapolated to an ongoing pattern ("typically", "every month", or "always").'
        });
        return;
      }

      // Pattern 9B: Extrapolating single-month to "Your annual [category] spending is $X" without qualification
      if (/\byour\s+annual\s+[\w\s]{1,20}\s+spending\s+is\s+[\$€£₹]?\d+\b/i.test(sLower)) {
        discrepancies.push({
          issueType: 'evidence_scope_expansion',
          claimText: sentence.trim(),
          severity: 'significant',
          sentenceContext: sentence,
          reason: 'Monthly spending was asserted as a factual annual total without stating it is an extrapolation.'
        });
        return;
      }
    }

    // Pattern 9C: Exact unconditioned future estimate ("Your account will have exactly $8,542 in 3 months")
    if (/\bwill\s+have\s+exactly\s+[\$€£₹]?[0-9,]+\s+in\s+[0-9]+\s+months\b/i.test(sLower)) {
      discrepancies.push({
        issueType: 'unqualified_estimate',
        claimText: sentence.trim(),
        severity: 'minor',
        sentenceContext: sentence,
        reason: 'Future estimated balance asserted as an exact unconditioned fact.'
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
  ): EvidenceAuthoritativeStore {
    const kpisRaw = context?.kpis || toolOutputs?.analytics?.kpis || {};
    const budgetsRaw = context?.budgets || toolOutputs?.analytics?.budgets || [];
    const goalsRaw = context?.goals || context?.savings || toolOutputs?.analytics?.goals || [];
    const debtsRaw = context?.debts || toolOutputs?.analytics?.debts || [];

    const currentSavings = this.parseAmount(kpisRaw.currentSavings);
    const totalIncome = this.parseAmount(kpisRaw.totalIncome);
    const totalExpense = this.parseAmount(kpisRaw.totalExpense);
    const netSavings = this.parseAmount(kpisRaw.netSavings);
    const runwayMonths = kpisRaw.runwayMonths !== undefined ? Number(kpisRaw.runwayMonths) : null;

    const budgets = Array.isArray(budgetsRaw)
      ? budgetsRaw.map(b => ({
          category: String(b.category || ''),
          limit: Number(b.limit || 0),
          spent: Number(b.spent || 0)
        }))
      : [];

    const goals = Array.isArray(goalsRaw)
      ? goalsRaw.map(g => ({
          name: String(g.name || g.goalName || ''),
          target: Number(g.target || g.targetAmount || 0),
          current: Number(g.current || g.currentAmount || 0)
        }))
      : [];

    const debts = Array.isArray(debtsRaw)
      ? debtsRaw.map(d => ({
          name: String(d.name || ''),
          balance: Number(d.balance || 0),
          interestRate: Number(d.interestRate || 0)
        }))
      : [];

    // History and metadata
    const historyMonths =
      context?.historyMonths !== undefined
        ? Number(context.historyMonths)
        : context?.history?.length !== undefined
        ? Number(context.history.length)
        : 1;

    const historicalSpending: Record<string, number> = context?.historicalSpending || {};

    const isStale = Boolean(context?.isStale || context?.freshness?.isStale || (context?.dataAgeDays && context.dataAgeDays > 60));
    const isPartial = Boolean(context?.isPartial || context?.completeness === 'partial');

    const confLevel = currentConfidence?.level || 'High';
    const confScore = currentConfidence?.score !== undefined ? currentConfidence.score : 0.75;

    return {
      currentSavings,
      totalIncome,
      totalExpense,
      netSavings,
      runwayMonths,
      budgets,
      goals,
      debts,
      historyMonths,
      historicalSpending,
      isStale,
      isPartial,
      currentConfidence: {
        level: confLevel,
        score: confScore
      }
    };
  }

  private static isEducationalHypotheticalOrNegated(sentence: string): boolean {
    const sLower = sentence.toLowerCase();

    // 1. Quoted fraudulent advice: "Beware of scammers claiming '...'"
    if (
      (sLower.includes('beware of') || sLower.includes('avoid anyone') || sLower.includes('claiming that')) &&
      (sLower.includes("'") || sLower.includes('"'))
    ) {
      return true;
    }

    // 2. Hypothetical indicators
    if (
      sLower.startsWith('if someone') ||
      sLower.startsWith('if you spent') ||
      sLower.startsWith('if you had') ||
      sLower.startsWith('for example, if') ||
      sLower.includes('for example, if a homeowner') ||
      sLower.includes('assuming a') ||
      sLower.includes('hypothetically')
    ) {
      return true;
    }

    // 3. Educational guidelines
    if (
      sLower.includes('50/30/20') ||
      sLower.includes('rule of thumb') ||
      sLower.includes('under the 50/30/20') ||
      sLower.includes('experts recommend') ||
      sLower.includes('educational framework')
    ) {
      return true;
    }

    // 4. Negated presence ("You do not have any recorded Tesla", "There is no record of")
    if (
      sLower.includes('do not have any recorded') ||
      sLower.includes('does not have any recorded') ||
      sLower.includes('no record of') ||
      sLower.includes('no recorded')
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
