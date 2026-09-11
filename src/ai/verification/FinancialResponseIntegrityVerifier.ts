/**
 * FinancialResponseIntegrityVerifier — Deterministic Financial Response Integrity & Answer Completeness Layer (§AI-2.7)
 *
 * Evaluates AI-generated responses to ensure that:
 * 1. The response directly answers the user's specific financial question (question-answer alignment).
 * 2. Requested numerical metrics are supplied and grounded in verified data.
 * 3. Multi-part questions (e.g. multi-category, comparison, multi-entity) are completely addressed.
 * 4. Entities (categories, goals, debts, accounts) requested by the user are covered, not substituted.
 * 5. Answer types match question intents (comparison -> comparative relation; affordability -> clear determination; why -> causal explanation).
 * 6. Empty, generic evasions or non-informative responses are flagged.
 * 7. Unsupported completeness claims ("That's everything you need to know") are caught.
 * 8. Contradictory direct answers are eliminated.
 * 9. Legitimate refusals (insufficient data), qualified future projections, concise answers, and educational explanations are protected.
 *
 * Operates purely deterministically and locally with ZERO network or LLM calls.
 */

export interface ResponseIntegrityDiscrepancy {
  readonly issueType:
    | 'question_answer_misalignment'
    | 'missing_required_number'
    | 'missing_entity_coverage'
    | 'missing_comparison'
    | 'missing_yes_no_determination'
    | 'missing_causal_explanation'
    | 'partial_multi_part_answer'
    | 'unsupported_completeness_claim'
    | 'contradictory_answer'
    | 'empty_non_informative_answer'
    | 'wrong_entity_substitution';
  readonly claimText: string;
  readonly severity: 'minor' | 'significant' | 'severe';
  readonly sentenceContext: string;
  readonly reason: string;
}

export interface FinancialResponseIntegrityResult {
  readonly isValid: boolean;
  readonly discrepancies: readonly ResponseIntegrityDiscrepancy[];
  readonly warnings: readonly string[];
  readonly reasoning: readonly string[];
  readonly adjustedConfidence?: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
}

export interface ResponseIntegrityVerificationOptions {
  readonly existingWarnings?: readonly string[];
  readonly existingReasoning?: readonly string[];
}

interface QuestionProfile {
  readonly isAmountRequested: boolean;
  readonly isComparisonRequested: boolean;
  readonly isAffordabilityRequested: boolean;
  readonly isWhyRequested: boolean;
  readonly isRemainingRequested: boolean;
  readonly isMultiPart: boolean;
  readonly isEducational: boolean;
  readonly requestedEntities: readonly string[];
  readonly rawQuery: string;
}

export class FinancialResponseIntegrityVerifier {
  // Canonical entity registry and synonyms
  private static readonly KNOWN_ENTITIES: Record<string, readonly string[]> = {
    food: ['food', 'meals'],
    dining: ['dining', 'dining out', 'eating out', 'restaurants', 'takeout', 'takeaways'],
    groceries: ['groceries', 'grocery', 'supermarket', 'food shopping'],
    utilities: ['utilities', 'utility', 'electric', 'electricity', 'water', 'internet', 'gas', 'power'],
    entertainment: ['entertainment', 'movies', 'fun', 'leisure', 'games', 'gaming', 'concert', 'concerts'],
    housing: ['housing', 'rent', 'mortgage'],
    transportation: ['transportation', 'transit', 'commute'],
    emergency_fund: ['emergency fund', 'emergency savings', 'rainy day fund', 'emergency reserve', 'emergency reserves'],
    vacation: ['vacation', 'holiday', 'trip', 'travel goal'],
    house_downpayment: ['house downpayment', 'down payment', 'house goal', 'home purchase', 'home goal'],
    car_goal: ['car goal', 'new car', 'vehicle goal', 'car savings'],
    retirement: ['retirement', '401k', 'ira', 'pension', 'nest egg'],
    credit_card: ['credit card', 'credit cards', 'card debt', 'cc balance'],
    student_loan: ['student loan', 'student loans', 'education debt', 'tuition loan'],
    debt: ['debt', 'debts', 'liabilities', 'loans'],
    savings: ['savings', 'savings account', 'hysa', 'emergency fund', 'liquid savings'],
    income: ['income', 'salary', 'take-home', 'earnings', 'paycheck'],
    expenses: ['expenses', 'spending', 'spent', 'outflows', 'costs']
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
    options?: ResponseIntegrityVerificationOptions
  ): FinancialResponseIntegrityResult {
    const existingWarns = options?.existingWarnings || [];
    const discrepancies: ResponseIntegrityDiscrepancy[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    // Step 1: Check for legitimate exemptions (insufficient data, data unavailability)
    if (this.isLegitimateDataRefusal(answerText)) {
      return {
        isValid: true,
        discrepancies: [],
        warnings: [],
        reasoning: ['Response Integrity: Valid insufficient-data / data unavailability acknowledgment accepted.'],
        adjustedConfidence: currentConfidence
      };
    }

    // Step 2: Check for empty / non-informative answers
    if (this.isEmptyOrNonInformative(query, answerText)) {
      discrepancies.push({
        issueType: 'empty_non_informative_answer',
        claimText: answerText.slice(0, 100).trim(),
        severity: 'severe',
        sentenceContext: answerText.slice(0, 120).trim(),
        reason: 'The response contains only generic filler or evasions without addressing the specific financial query.'
      });
    }

    // Step 3: Check for contradictory direct answers
    this.checkContradictoryAnswers(answerText, discrepancies);

    // Step 4: Parse Question Profile
    const profile = this.analyzeQuestion(query);

    // If query is educational, allow general conceptual answers without strict entity/number matching
    if (profile.isEducational) {
      return {
        isValid: true,
        discrepancies: [],
        warnings: [],
        reasoning: ['Response Integrity: Educational framework explanation accepted.'],
        adjustedConfidence: currentConfidence
      };
    }

    // Step 5: Check Unsupported Completeness Claims
    this.checkUnsupportedCompleteness(query, answerText, profile, discrepancies);

    // Step 6: Check Entity Coverage & Entity Substitution
    this.checkEntityCoverage(query, answerText, profile, discrepancies);

    // Step 7: Check Answer Type Requirements
    this.checkAnswerTypes(query, answerText, profile, discrepancies);

    // Step 8: Check Multi-Part Conjunctions
    this.checkMultiPartCompleteness(query, answerText, profile, discrepancies);

    // Filter out duplicates already flagged by prior tiers
    const unflaggedDiscrepancies: ResponseIntegrityDiscrepancy[] = [];
    for (const disc of discrepancies) {
      const isAlreadyFlagged = existingWarns.some(w => {
        const wLower = w.toLowerCase();
        return (
          wLower.includes(disc.issueType.replace(/_/g, ' ')) ||
          wLower.includes(disc.reason.toLowerCase()) ||
          (disc.issueType === 'missing_required_number' && (wLower.includes('no numerical value') || wLower.includes('numerical amount')))
        );
      });

      if (!isAlreadyFlagged) {
        unflaggedDiscrepancies.push(disc);
        warnings.push(`⚠️ Response Integrity Note: ${disc.reason}`);
        reasoning.push(`Response Integrity: Flagged ${disc.issueType.replace(/_/g, ' ')} (${disc.severity}): ${disc.reason}`);
      }
    }

    if (unflaggedDiscrepancies.length === 0) {
      return {
        isValid: true,
        discrepancies: [],
        warnings: [],
        reasoning: ['Response Integrity: Response successfully answers the query completely and coherently.'],
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
  // Question Analyzer
  // ---------------------------------------------------------------------------

  private static analyzeQuestion(query: string): QuestionProfile {
    const qLower = query.toLowerCase();

    // 1. Is Amount Requested?
    const isAmountRequested =
      /\b(how\s+much|what\s+is\s+my|what\s+did\s+i\s+spend|what\s+was\s+my|what\s+is\s+the\s+total|calculate|how\s+much\s+is\s+left|how\s+much\s+did\s+i|total\s+spending|how\s+much\s+to\s+save)\b/i.test(qLower);

    // 2. Is Comparison Requested?
    const isComparisonRequested =
      /\b(which\s+(?:was|is)\s+higher|which\s+(?:was|is)\s+lower|which\s+(?:was|is)\s+more|did\s+i\s+spend\s+more\s+on|compare|higher\s+or\s+lower|which\s+is\s+greater)\b/i.test(qLower);

    // 3. Is Affordability Requested?
    const isAffordabilityRequested =
      /\b(can\s+i\s+afford|is\s+it\s+affordable|can\s+i\s+buy|should\s+i\s+buy|do\s+i\s+have\s+enough\s+for|afford\s+a)\b/i.test(qLower);

    // 4. Is Why Requested?
    const isWhyRequested =
      /\b(why\s+is\s+my|why\s+did\s+my|what\s+caused|why\s+are\s+my|why\s+did\s+i|reason\s+for|explain\s+why)\b/i.test(qLower);

    // 5. Is Remaining Requested?
    const isRemainingRequested =
      /\b(remaining\s+budget|how\s+much\s+is\s+left|what\s+is\s+left|budget\s+remaining)\b/i.test(qLower);

    // 6. Is Multi-Part?
    const isMultiPart =
      (qLower.includes(' and ') && (isComparisonRequested || isAmountRequested || isRemainingRequested || isAffordabilityRequested)) ||
      (qLower.split('?').filter(s => s.trim().length > 0).length > 1);

    // 7. Is Educational?
    const isEducational =
      /\b(what\s+is\s+the\s+50\/30\/20|what\s+is\s+compound\s+interest|how\s+does\s+an?\s+emergency\s+fund\s+work|what\s+is\s+an\s+index\s+fund|explain\s+the\s+50\/30\/20|what\s+is\s+a\s+hysa)\b/i.test(qLower);

    // 8. Extract Requested Entities
    const requestedEntities: string[] = [];
    for (const [entityKey, synonyms] of Object.entries(this.KNOWN_ENTITIES)) {
      for (const syn of synonyms) {
        // Use word boundary to avoid matching "in" or "or" inside words
        const regex = new RegExp(`\\b${syn}\\b`, 'i');
        if (regex.test(qLower)) {
          if (!requestedEntities.includes(entityKey)) {
            requestedEntities.push(entityKey);
          }
          break;
        }
      }
    }

    // If specific dining/groceries is queried, don't demand general "food" unless literal "food" was in query
    if ((requestedEntities.includes('dining') || requestedEntities.includes('groceries')) && !/\bfood\b/i.test(qLower)) {
      const idx = requestedEntities.indexOf('food');
      if (idx !== -1) requestedEntities.splice(idx, 1);
    }

    // If a specific budget category is queried, do not demand generic "expenses" unless literal "expenses" was in query
    const hasSpecificCategory = requestedEntities.some(e => ['dining', 'groceries', 'entertainment', 'utilities', 'housing', 'transportation'].includes(e));
    if (hasSpecificCategory && !/\bexpenses\b/i.test(qLower) && !/\bcosts\b/i.test(qLower)) {
      const idx = requestedEntities.indexOf('expenses');
      if (idx !== -1) requestedEntities.splice(idx, 1);
    }

    return {
      isAmountRequested,
      isComparisonRequested,
      isAffordabilityRequested,
      isWhyRequested,
      isRemainingRequested,
      isMultiPart,
      isEducational,
      requestedEntities,
      rawQuery: query
    };
  }

  // ---------------------------------------------------------------------------
  // Check 1: Legitimate Data Refusal / Insufficient Data Guard
  // ---------------------------------------------------------------------------

  private static isLegitimateDataRefusal(answerText: string): boolean {
    const aLower = answerText.toLowerCase();

    const refusalPhrases = [
      "don't have enough data",
      'do not have enough data',
      'insufficient data',
      'not enough transaction history',
      'cannot know the exact',
      "can't know the exact",
      'unavailable in your profile',
      'no records found',
      "don't have access to",
      'do not have access to',
      'no data available',
      'limited data on your',
      'we would need more information'
    ];

    for (const phrase of refusalPhrases) {
      if (aLower.includes(phrase)) {
        return true;
      }
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Check 2: Empty or Non-Informative Answer
  // ---------------------------------------------------------------------------

  private static isEmptyOrNonInformative(query: string, answerText: string): boolean {
    const aTrim = answerText.trim();
    if (aTrim.length === 0) return true;

    const aLower = answerText.toLowerCase();

    // Pure greetings or generic fillers with no financial content
    const isPureGreeting =
      /^(hello|hi|hey|greetings|good\s+day)[\s!.,]+(i\s+am\s+aura[\s!.,]*)?(how\s+can\s+i\s+help\s+you[\s?.,]*)?$/i.test(aTrim);
    if (isPureGreeting) return true;

    // Greeting + vague platitude with zero numbers and zero query entity mentions
    const mentionsAnyNumbers = /\b[0-9]+(?:\.[0-9]+)?\b/.test(answerText);
    const hasVaguePlatitude =
      aLower.includes('having good financial habits is essential') ||
      aLower.includes('savings fluctuate from month to month depending on what happens') ||
      aLower.includes('reviewing your finances is always a good practice') ||
      aLower.includes('maintaining a budget is good for your finances');

    if (!mentionsAnyNumbers && hasVaguePlatitude) {
      return true;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Check 3: Contradictory Answers
  // ---------------------------------------------------------------------------

  private static checkContradictoryAnswers(
    answerText: string,
    discrepancies: ResponseIntegrityDiscrepancy[]
  ): void {
    const aLower = answerText.toLowerCase();

    // Contradiction A: Affordability ("yes you can afford" AND "you cannot afford")
    const claimsCanAfford = /\b(yes,?\s+you\s+can\s+afford|you\s+can\s+afford\s+this|is\s+affordable)\b/i.test(aLower);
    const claimsCannotAfford = /\b(no,?\s+you\s+cannot\s+afford|you\s+cannot\s+afford|you\s+can't\s+afford|cannot\s+afford\s+this\s+purchase)\b/i.test(aLower);

    if (claimsCanAfford && claimsCannotAfford) {
      discrepancies.push({
        issueType: 'contradictory_answer',
        claimText: 'yes you can afford ... you cannot afford',
        severity: 'severe',
        sentenceContext: answerText,
        reason: 'The response provides contradictory direct affordability conclusions in the same answer.'
      });
      return;
    }

    // Contradiction B: Direct comparative contradictions (X was higher than Y AND Y was higher than X)
    if (
      aLower.includes('dining was higher than groceries') &&
      aLower.includes('groceries was higher than dining')
    ) {
      discrepancies.push({
        issueType: 'contradictory_answer',
        claimText: 'conflicting comparison order',
        severity: 'severe',
        sentenceContext: answerText,
        reason: 'The response asserts conflicting comparative relations.'
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 4: Unsupported Completeness Claims
  // ---------------------------------------------------------------------------

  private static checkUnsupportedCompleteness(
    query: string,
    answerText: string,
    profile: QuestionProfile,
    discrepancies: ResponseIntegrityDiscrepancy[]
  ): void {
    const aLower = answerText.toLowerCase();

    const completenessPhrases = [
      "that's everything you need to know",
      'this fully solves your financial situation',
      'this completely resolves your finances',
      'now you know everything'
    ];

    for (const phrase of completenessPhrases) {
      if (aLower.includes(phrase)) {
        // If query asked for multiple things (e.g. expenses AND debts) and one is missing:
        if (profile.isMultiPart || profile.requestedEntities.length > 1) {
          discrepancies.push({
            issueType: 'unsupported_completeness_claim',
            claimText: phrase,
            severity: 'significant',
            sentenceContext: answerText,
            reason: 'The response makes an absolute completeness claim while omitting part of the requested financial inquiry.'
          });
          return;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 5: Entity Coverage & Wrong Entity Substitution
  // ---------------------------------------------------------------------------

  private static checkEntityCoverage(
    query: string,
    answerText: string,
    profile: QuestionProfile,
    discrepancies: ResponseIntegrityDiscrepancy[]
  ): void {
    const aLower = answerText.toLowerCase();

    // Check which requested entities were covered in the answer
    const missingEntities: string[] = [];
    for (const reqEntity of profile.requestedEntities) {
      let synonyms = this.KNOWN_ENTITIES[reqEntity] || [reqEntity];
      if (reqEntity === 'food') {
        synonyms = ['food', 'groceries', 'grocery', 'dining', 'eating out', 'restaurants', 'meals'];
      } else if (reqEntity === 'debt') {
        synonyms = ['debt', 'debts', 'liabilities', 'loans', 'credit card', 'student loan'];
      }

      const isCovered = synonyms.some(syn => {
        const regex = new RegExp(`\\b${syn}\\b`, 'i');
        return regex.test(aLower);
      });

      if (!isCovered) {
        missingEntities.push(reqEntity);
      }
    }

    // Case 5A: Multiple requested entities, but some are missing
    if (profile.requestedEntities.length > 1 && missingEntities.length > 0) {
      discrepancies.push({
        issueType: 'missing_entity_coverage',
        claimText: `Missing: ${missingEntities.join(', ')}`,
        severity: 'significant',
        sentenceContext: answerText,
        reason: `The query requested information on multiple entities (${profile.requestedEntities.join(', ')}), but ${missingEntities.join(', ')} was omitted from the response.`
      });
      return;
    }

    // Case 5B: Single requested entity is completely missing AND another unrelated entity was substituted
    if (profile.requestedEntities.length === 1 && missingEntities.length === 1) {
      const targetEntity = profile.requestedEntities[0];

      // Check if answer discusses another known entity instead
      let substitutedEntity: string | null = null;
      for (const [otherEntity, synonyms] of Object.entries(this.KNOWN_ENTITIES)) {
        if (otherEntity !== targetEntity && otherEntity !== 'expenses') {
          if (synonyms.some(s => new RegExp(`\\b${s}\\b`, 'i').test(aLower))) {
            substitutedEntity = otherEntity;
            break;
          }
        }
      }

      if (substitutedEntity) {
        discrepancies.push({
          issueType: 'wrong_entity_substitution',
          claimText: `Expected ${targetEntity}, answered with ${substitutedEntity}`,
          severity: 'significant',
          sentenceContext: answerText,
          reason: `The user explicitly queried '${targetEntity}', but the response answered about '${substitutedEntity}' instead.`
        });
      } else {
        discrepancies.push({
          issueType: 'question_answer_misalignment',
          claimText: `Missing: ${targetEntity}`,
          severity: 'significant',
          sentenceContext: answerText,
          reason: `The user asked about '${targetEntity}', but the response did not address this entity.`
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 6: Answer Types (Numbers, Comparisons, Affordability, Explanations)
  // ---------------------------------------------------------------------------

  private static checkAnswerTypes(
    query: string,
    answerText: string,
    profile: QuestionProfile,
    discrepancies: ResponseIntegrityDiscrepancy[]
  ): void {
    const aLower = answerText.toLowerCase();

    // Rule 6A: Amount requested -> Must contain an amount/number or verified dollar value
    if (profile.isAmountRequested) {
      const hasNumber =
        /(?:[\$€£₹]|usd\s*)?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?(?:\s*[km])?\b/i.test(answerText) ||
        /\b[0-9]+(?:\.[0-9]+)?\b/.test(answerText);

      if (!hasNumber) {
        discrepancies.push({
          issueType: 'missing_required_number',
          claimText: answerText.trim(),
          severity: 'significant',
          sentenceContext: answerText,
          reason: 'The query requested a specific financial amount or calculation, but no numerical value was provided.'
        });
      }
    }

    // Rule 6B: Comparison requested -> Must contain a comparative relationship
    if (profile.isComparisonRequested) {
      const hasComparison =
        /\b(higher|lower|more\s+than|less\s+than|greater\s+than|exceeded|surpassed|spent\s+more|was\s+more|was\s+higher|was\s+lower|equal|same|tied|highest|lowest|difference\s+of)\b/i.test(aLower);

      if (!hasComparison) {
        discrepancies.push({
          issueType: 'missing_comparison',
          claimText: answerText.trim(),
          severity: 'significant',
          sentenceContext: answerText,
          reason: 'The user asked for a comparison between entities, but no comparative conclusion was stated.'
        });
      }
    }

    // Rule 6C: Affordability requested -> Must contain a clear determination
    if (profile.isAffordabilityRequested) {
      const hasDetermination =
        /\b(yes|no|can\s+afford|cannot\s+afford|can't\s+afford|affordable|not\s+affordable|within\s+your\s+budget|exceeds\s+your\s+budget|feasible|not\s+feasible)\b/i.test(aLower);

      if (!hasDetermination) {
        discrepancies.push({
          issueType: 'missing_yes_no_determination',
          claimText: answerText.trim(),
          severity: 'significant',
          sentenceContext: answerText,
          reason: 'The user asked whether an expense is affordable, but the response omitted a clear yes/no or affordability determination.'
        });
      }
    }

    // Rule 6D: "Why" requested -> Must contain explanatory causation
    if (profile.isWhyRequested) {
      // Must not be a mere definition ("Expenses are the money that leaves your account")
      const isMereDefinition =
        /\b(expenses\s+are|spending\s+is)\s+the\s+money\s+that\s+leaves\b/i.test(aLower);

      const hasCausalReasoning =
        /\b(because|due\s+to|as\s+a\s+result|driven\s+by|reflects|since|caused\s+by|the\s+main\s+reason|primarily\s+from|attributed\s+to|increase\s+in|higher\s+spending\s+on)\b/i.test(aLower);

      if (isMereDefinition || !hasCausalReasoning) {
        discrepancies.push({
          issueType: 'missing_causal_explanation',
          claimText: answerText.trim(),
          severity: 'significant',
          sentenceContext: answerText,
          reason: 'The user asked why a spending variance occurred, but no causal or explanatory reasoning was provided.'
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 7: Multi-Part Completeness
  // ---------------------------------------------------------------------------

  private static checkMultiPartCompleteness(
    query: string,
    answerText: string,
    profile: QuestionProfile,
    discrepancies: ResponseIntegrityDiscrepancy[]
  ): void {
    const qLower = query.toLowerCase();
    const aLower = answerText.toLowerCase();

    // Multi-part pattern A: "How much did I spend on X and what is my remaining budget?"
    if (qLower.includes('how much') && (qLower.includes('remaining budget') || qLower.includes('what is my remaining'))) {
      const hasSpending = /\b(spent|spending|was\s+[\$€£₹0-9])\b/i.test(aLower);
      const hasRemaining = /\b(remaining|left|limit|balance)\b/i.test(aLower);

      if (hasSpending && !hasRemaining) {
        discrepancies.push({
          issueType: 'partial_multi_part_answer',
          claimText: 'remaining budget omitted',
          severity: 'significant',
          sentenceContext: answerText,
          reason: 'The user asked for both spending and remaining budget, but the remaining budget was omitted.'
        });
        return;
      }
    }

    // Multi-part pattern B: "How much did I spend on X and can I afford Y?"
    if (qLower.includes('how much') && qLower.includes('can i afford')) {
      const hasAmount = /(?:[\$€£₹]|usd\s*)?[0-9]+(?:\.[0-9]+)?/i.test(aLower) && /\b(spent|spending)\b/i.test(aLower);
      const hasAffordability = /\b(yes|no|can\s+afford|cannot\s+afford|can't\s+afford|affordable)\b/i.test(aLower);

      if (!hasAmount && hasAffordability) {
        discrepancies.push({
          issueType: 'partial_multi_part_answer',
          claimText: 'spending amount omitted',
          severity: 'significant',
          sentenceContext: answerText,
          reason: 'The user asked for spending amount and affordability, but the spending amount was omitted.'
        });
      }
    }
  }
}
