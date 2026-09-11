/**
 * FinancialVerifier – Deterministic numerical verification layer for Aura AI.
 *
 * Intercepts generated financial responses before returning to the UI to ensure
 * that numerical figures (currency amounts, percentages, and runway months) are
 * grounded in authoritative data, derived mathematically, or introduced by the user's query.
 *
 * Does not make any external network or LLM calls.
 */

export interface VerificationResult {
  readonly isValid: boolean;
  readonly discrepancies: readonly FinancialDiscrepancy[];
  readonly warnings: readonly string[];
  readonly reasoning: readonly string[];
  readonly adjustedConfidence?: {
    readonly level: 'High' | 'Medium' | 'Low';
    readonly score: number;
  };
}

export interface FinancialDiscrepancy {
  readonly claimText: string;
  readonly claimValue: number;
  readonly claimType: 'currency' | 'percentage' | 'runway';
  readonly currencyCode?: string;
  readonly reason: string;
  readonly officialContext?: string;
}

interface ExtractedClaim {
  readonly text: string;
  readonly value: number;
  readonly type: 'currency' | 'percentage' | 'runway';
  readonly currencyCode?: string;
  readonly categoryContext?: string;
  readonly sentenceContext?: string;
}

interface AuthoritativeStore {
  readonly activeCurrencies: Set<string>;
  readonly amounts: Map<number, { context: string; currency?: string }>;
  readonly percentages: Map<number, string>;
  readonly runways: Map<number, string>;
  readonly budgets: Map<string, { limit: number; spent: number; pct: number; currency: string }>;
  readonly derivedAmounts: Set<number>;
  readonly queryNumbers: Set<number>;
  readonly hasBudgets: boolean;
  readonly totalIncomeStr?: string;
  readonly totalExpenseStr?: string;
  readonly netSavingsStr?: string;
  readonly runwayMonths?: number;
}

export class FinancialVerifier {
  // Common currency symbols to canonical codes
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
  ): VerificationResult {
    // 1. Build authoritative ground-truth store
    const store = this.buildAuthoritativeStore(query, context, toolOutputs);

    // 2. Extract financially meaningful claims from answerText
    const claims = this.extractClaims(answerText);

    const discrepancies: FinancialDiscrepancy[] = [];
    const warnings: string[] = [];
    const reasoning: string[] = [];

    // 3. Verify each claim
    for (const claim of claims) {
      // Check query allowlist
      if (store.queryNumbers.has(claim.value) || this.isCloseMatchInSet(claim.value, store.queryNumbers, 0.01)) {
        continue;
      }

      // Check if claim is educational benchmark or hypothetical recommendation advice
      if (claim.sentenceContext && this.isEducationalOrHypothetical(claim, claim.sentenceContext)) {
        continue;
      }

      let isVerified = false;

      if (claim.type === 'currency') {
        isVerified = this.verifyCurrencyClaim(claim, store);
      } else if (claim.type === 'percentage') {
        isVerified = this.verifyPercentageClaim(claim, store);
      } else if (claim.type === 'runway') {
        isVerified = this.verifyRunwayClaim(claim, store);
      }

      if (!isVerified) {
        const discrepancy = this.buildDiscrepancy(claim, store);
        discrepancies.push(discrepancy);
        if (discrepancy.officialContext) {
          warnings.push(`⚠️ Verification Note: ${claim.text} could not be verified against authoritative records. ${discrepancy.officialContext}`);
          reasoning.push(`Verification: Flagged unverified claim "${claim.text}". ${discrepancy.officialContext}`);
        } else {
          warnings.push(`⚠️ Verification Note: ${claim.text} could not be verified against authoritative records.`);
          reasoning.push(`Verification: Flagged unverified claim "${claim.text}" against authoritative financial data.`);
        }
      }
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

    // 4. Calculate adjusted confidence for material discrepancies
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
  // Ground-Truth Store Construction
  // ---------------------------------------------------------------------------

  private static buildAuthoritativeStore(
    query: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>
  ): AuthoritativeStore {
    const activeCurrencies = new Set<string>();
    const amounts = new Map<number, { context: string; currency?: string }>();
    const percentages = new Map<number, string>();
    const runways = new Map<number, string>();
    const budgets = new Map<string, { limit: number; spent: number; pct: number; currency: string }>();
    const derivedAmounts = new Set<number>();
    const queryNumbers = new Set<number>();

    // 1. Extract query numbers
    const queryRegex = /(?:[\$€£₹]|USD|EUR|GBP|INR)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*([kKmMbB])?/g;
    let qMatch: RegExpExecArray | null;
    while ((qMatch = queryRegex.exec(query)) !== null) {
      const parsed = this.parseNumericString(qMatch[1], qMatch[2]);
      if (parsed !== null) {
        queryNumbers.add(parsed);
      }
    }

    // 2. Sift context & tool outputs
    const kpis = context?.kpis || toolOutputs?.analytics?.kpis || toolOutputs?.health || {};
    const budgetList: any[] = toolOutputs?.budget?.budgets || context?.budgets || [];
    const goalList: any[] = toolOutputs?.goal?.savings || context?.savings || context?.goals || [];
    const debtList: any[] = toolOutputs?.debt?.debts || context?.debts || [];
    const forecastObj = toolOutputs?.forecast || context?.forecasts || {};
    const simObj = toolOutputs?.simulation || {};

    const registerAmount = (raw: any, desc: string) => {
      if (raw === undefined || raw === null) return;
      const { num, currency } = this.parseMoneyValue(raw);
      if (num !== null) {
        amounts.set(num, { context: desc, currency });
        if (currency) activeCurrencies.add(currency);
      }
    };

    if (Array.isArray(debtList)) {
      for (const d of debtList) {
        registerAmount(d.balance, `${d.name || 'Debt'} balance`);
        if (d.interestRate !== undefined) {
          const r = Number(d.interestRate);
          if (!isNaN(r)) percentages.set(r, `${d.name || 'Debt'} rate`);
        }
        if (d.rate !== undefined) {
          const r = Number(d.rate);
          if (!isNaN(r)) percentages.set(r, `${d.name || 'Debt'} rate`);
        }
        if (d.minPayment !== undefined) registerAmount(d.minPayment, `${d.name || 'Debt'} min payment`);
      }
    }

    registerAmount(kpis.totalIncome, 'Total Income');
    registerAmount(kpis.totalExpense, 'Total Expense');
    registerAmount(kpis.netSavings, 'Net Savings');
    registerAmount(kpis.currentSavings, 'Current Savings');

    if (kpis.runwayMonths !== undefined && kpis.runwayMonths !== null) {
      const r = Number(kpis.runwayMonths);
      if (!isNaN(r)) runways.set(r, 'Emergency Fund Runway');
    }

    if (kpis.savingsRate !== undefined && kpis.savingsRate !== null) {
      const s = Number(kpis.savingsRate);
      if (!isNaN(s)) percentages.set(s, 'Savings Rate');
    }

    if (kpis.overallHealthScore !== undefined && kpis.overallHealthScore !== null) {
      const h = Number(kpis.overallHealthScore);
      if (!isNaN(h)) amounts.set(h, { context: 'Health Score' });
    }

    const analyticsObj = toolOutputs?.analytics || context?.analytics || {};
    if (analyticsObj.avgMonthlySpending !== undefined && analyticsObj.avgMonthlySpending !== null) {
      registerAmount(analyticsObj.avgMonthlySpending, 'Average Monthly Spending');
    }

    // Process Budgets
    let hasBudgets = false;
    if (Array.isArray(budgetList) && budgetList.length > 0) {
      hasBudgets = true;
      for (const b of budgetList) {
        const cat = String(b.category || b.cat || 'discretionary').toLowerCase();
        const limParsed = this.parseMoneyValue(b.limit !== undefined ? b.limit : b.lim);
        const spentParsed = this.parseMoneyValue(b.spent);
        let pctVal = b.utilizationPercent !== undefined ? Number(b.utilizationPercent) : (b.pct !== undefined ? Number(b.pct) : (b.percentage !== undefined ? Number(b.percentage) : NaN));
        if (isNaN(pctVal) && limParsed.num !== null && spentParsed.num !== null && limParsed.num > 0) {
          pctVal = Math.round((spentParsed.num / limParsed.num) * 100);
        }
        if (isNaN(pctVal)) {
          pctVal = 0;
        }

        if (limParsed.num !== null) {
          amounts.set(limParsed.num, { context: `${cat} limit`, currency: limParsed.currency });
          if (limParsed.currency) activeCurrencies.add(limParsed.currency);
        }
        if (spentParsed.num !== null) {
          amounts.set(spentParsed.num, { context: `${cat} spent`, currency: spentParsed.currency });
          if (spentParsed.currency) activeCurrencies.add(spentParsed.currency);
        }
        if (!isNaN(pctVal)) {
          percentages.set(pctVal, `${cat} utilization`);
        }

        if (limParsed.num !== null && spentParsed.num !== null) {
          budgets.set(cat, {
            limit: limParsed.num,
            spent: spentParsed.num,
            pct: pctVal,
            currency: limParsed.currency || spentParsed.currency || 'USD'
          });
          // Derived remaining budget
          derivedAmounts.add(Math.max(0, limParsed.num - spentParsed.num));
        }
      }
    }

    // Process Goals
    if (Array.isArray(goalList)) {
      for (const g of goalList) {
        const name = String(g.goalName || g.name || 'goal');
        const tarParsed = this.parseMoneyValue(g.targetAmount || g.target || g.tar);
        const curParsed = this.parseMoneyValue(g.currentAmount || g.current || g.cur);
        const pVal = g.progressPercent !== undefined ? Number(g.progressPercent) : (g.pct !== undefined ? Number(g.pct) : (tarParsed.num && curParsed.num ? Math.round((curParsed.num / tarParsed.num) * 100) : 0));
        const mVal = g.remainingMonths !== undefined ? Number(g.remainingMonths) : (g.m !== undefined ? Number(g.m) : 0);

        if (tarParsed.num !== null) amounts.set(tarParsed.num, { context: `${name} target`, currency: tarParsed.currency });
        if (curParsed.num !== null) amounts.set(curParsed.num, { context: `${name} current`, currency: curParsed.currency });
        if (!isNaN(pVal)) percentages.set(pVal, `${name} progress`);
        if (!isNaN(mVal) && mVal > 0) runways.set(mVal, `${name} timeline`);

        if (tarParsed.num !== null && curParsed.num !== null) {
          derivedAmounts.add(Math.max(0, tarParsed.num - curParsed.num));
        }
      }
    }


    // Process Forecasts
    if (forecastObj) {
      registerAmount(forecastObj.projectedCash3Months || forecastObj.cash3Months, 'Projected Cash 3M');
      registerAmount(forecastObj.projectedCash6Months || forecastObj.cash6Months, 'Projected Cash 6M');
      registerAmount(forecastObj.projectedCash12Months || forecastObj.cash12Months, 'Projected Cash 12M');
    }

    // Process Simulation
    if (simObj && simObj.simulationInput) {
      const simAmt = Number(simObj.simulationInput.amount);
      if (!isNaN(simAmt)) amounts.set(simAmt, { context: 'Simulation amount' });
      if (simObj.postSavings !== undefined) {
        const ps = Number(simObj.postSavings);
        if (!isNaN(ps)) amounts.set(ps, { context: 'Simulation post-savings' });
      }
      if (simObj.postRunway !== undefined) {
        const pr = Number(simObj.postRunway);
        if (!isNaN(pr)) runways.set(pr, 'Simulation post-runway');
      }
    }

    // Domain-specific derived amounts
    let totalBudgetLimit = 0;
    let totalBudgetSpent = 0;
    for (const b of budgets.values()) {
      totalBudgetLimit += b.limit;
      totalBudgetSpent += b.spent;
      derivedAmounts.add(Math.max(0, b.limit - b.spent));
      derivedAmounts.add(Math.max(0, b.spent - b.limit));
    }
    // Allow pairwise cross-category budget arithmetic (e.g. comparing spending across categories)
    const budgetArray = Array.from(budgets.values());
    for (let i = 0; i < budgetArray.length; i++) {
      for (let j = 0; j < budgetArray.length; j++) {
        if (i !== j) {
          derivedAmounts.add(Math.abs(budgetArray[i].spent - budgetArray[j].spent));
          derivedAmounts.add(Math.abs(budgetArray[i].limit - budgetArray[j].limit));
          derivedAmounts.add(budgetArray[i].spent + budgetArray[j].spent);
        }
      }
    }
    if (totalBudgetLimit > 0) {
      derivedAmounts.add(totalBudgetLimit);
      derivedAmounts.add(totalBudgetSpent);
      derivedAmounts.add(Math.max(0, totalBudgetLimit - totalBudgetSpent));
    }

    if (kpis.currentSavings !== undefined && kpis.currentSavings !== null) {
      const curSav = Number(kpis.currentSavings);
      if (!isNaN(curSav)) {
        for (const qNum of queryNumbers) {
          if (qNum > 0 && qNum < curSav) {
            derivedAmounts.add(curSav - qNum);
          }
        }
      }
    }

    // Default currency if none found
    if (activeCurrencies.size === 0) {
      activeCurrencies.add('USD');
    }

    return {
      activeCurrencies,
      amounts,
      percentages,
      runways,
      budgets,
      derivedAmounts,
      queryNumbers,
      hasBudgets,
      totalIncomeStr: kpis.totalIncome ? String(kpis.totalIncome) : undefined,
      totalExpenseStr: kpis.totalExpense ? String(kpis.totalExpense) : undefined,
      netSavingsStr: kpis.netSavings ? String(kpis.netSavings) : undefined,
      runwayMonths: kpis.runwayMonths !== undefined ? Number(kpis.runwayMonths) : undefined
    };
  }

  // ---------------------------------------------------------------------------
  // Claim Extraction
  // ---------------------------------------------------------------------------

  private static extractClaims(answerText: string): ExtractedClaim[] {
    const claims: ExtractedClaim[] = [];

    // Split text into sentences for context
    const sentences = answerText.split(/(?<=[.?!])\s+/);

    for (const sentence of sentences) {
      const sentLower = sentence.toLowerCase();

      // Detect category context in sentence (e.g. food, dining, housing, travel)
      const categoryContext = this.detectCategoryContext(sentLower);

      // 1. Currency claims: e.g. $600, $600.00, $0.6k, ₹4,200, 600 USD
      const currencyRegex = /(?:([\$€£₹])|(USD|EUR|GBP|INR))\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*([kKmMbB])?\b|\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*([kKmMbB])?\s*(USD|EUR|GBP|INR)\b/g;
      let cMatch: RegExpExecArray | null;

      while ((cMatch = currencyRegex.exec(sentence)) !== null) {
        const symbolOrCode = cMatch[1] || cMatch[2] || cMatch[7] || '';
        const rawNum = cMatch[3] || cMatch[5] || '';
        const multiplier = cMatch[4] || cMatch[6] || '';
        const numVal = this.parseNumericString(rawNum, multiplier);

        if (numVal !== null) {
          const canonicalCode = this.SYMBOL_MAP[symbolOrCode] || symbolOrCode || 'USD';
          const claimIdx = cMatch.index;
          const claimEnd = claimIdx + cMatch[0].length;
          const localCategory = this.detectCategoryContext(sentLower, { start: claimIdx, end: claimEnd });
          claims.push({
            text: cMatch[0].trim(),
            value: numVal,
            type: 'currency',
            currencyCode: canonicalCode,
            categoryContext: localCategory || categoryContext,
            sentenceContext: sentence
          });
        }
      }

      // 2. Percentage claims: e.g. 75%, 84.5%
      const pctRegex = /\b([0-9]+(?:\.[0-9]+)?)\s*%/g;
      let pMatch: RegExpExecArray | null;
      while ((pMatch = pctRegex.exec(sentence)) !== null) {
        const val = Number(pMatch[1]);
        if (!isNaN(val)) {
          claims.push({
            text: pMatch[0].trim(),
            value: val,
            type: 'percentage',
            categoryContext,
            sentenceContext: sentence
          });
        }
      }

      // 3. Runway / Timeline claims: e.g. 4.2 months, 46.51 months
      // Exclude generic day counts like "10 days", "30 days"
      const runwayRegex = /\b([0-9]+(?:\.[0-9]+)?)\s*(?:months?|month's)\b/gi;
      let rMatch: RegExpExecArray | null;
      while ((rMatch = runwayRegex.exec(sentence)) !== null) {
        const val = Number(rMatch[1]);
        if (!isNaN(val)) {
          // Check financial proximity
          const isFinancialRunway =
            sentLower.includes('runway') ||
            sentLower.includes('emergency') ||
            sentLower.includes('coverage') ||
            sentLower.includes('safe') ||
            sentLower.includes('safety') ||
            sentLower.includes('last') ||
            sentLower.includes('fund');

          if (isFinancialRunway) {
            claims.push({
              text: rMatch[0].trim(),
              value: val,
              type: 'runway',
              categoryContext,
              sentenceContext: sentence
            });
          }
        }
      }
    }

    return claims;
  }

  // ---------------------------------------------------------------------------
  // Verification Matchers
  // ---------------------------------------------------------------------------

  private static verifyCurrencyClaim(claim: ExtractedClaim, store: AuthoritativeStore): boolean {
    // 1. Currency code check:
    // If claim explicitly specifies a currency (e.g. INR / ₹), but the authoritative
    // store only uses USD, reject mismatch (Requirement E & Test 12).
    if (claim.currencyCode && !store.activeCurrencies.has(claim.currencyCode)) {
      return false;
    }

    // 2. If claim is tied to a specific category with a known budget:
    if (claim.categoryContext && store.budgets.has(claim.categoryContext)) {
      const b = store.budgets.get(claim.categoryContext)!;
      const catValidValues = [
        b.spent,
        b.limit,
        Math.max(0, b.limit - b.spent),
        Math.max(0, b.spent - b.limit)
      ];
      for (const val of catValidValues) {
        if (this.isCloseMatch(claim.value, val, 0.01)) {
          return true;
        }
      }

      // If claim matches this category's figures or comparison arithmetic, accept!
      if (this.verifySentenceArithmetic(claim, store)) {
        return true;
      }

      // If the sentence mentions multiple categories and claim matches authoritative derived amounts (such as category differences), accept!
      const sentenceHasMultipleCategories = Array.from(store.budgets.keys()).filter(c =>
        claim.sentenceContext && new RegExp(`\\b${c}\\b`, 'i').test(claim.sentenceContext)
      ).length > 1;

      if (sentenceHasMultipleCategories) {
        for (const derivedVal of store.derivedAmounts) {
          if (this.isCloseMatch(claim.value, derivedVal, 0.01)) {
            return true;
          }
        }
      }

      // If it's a category claim that does not match this category's figures or comparison arithmetic, reject!
      return false;
    }

    // 3. Direct authoritative amount match (within ±1% relative tolerance)
    for (const authVal of store.amounts.keys()) {
      if (this.isCloseMatch(claim.value, authVal, 0.01)) {
        return true;
      }
    }

    // 4. Domain derived values match
    for (const derivedVal of store.derivedAmounts) {
      if (this.isCloseMatch(claim.value, derivedVal, 0.01)) {
        return true;
      }
    }

    // 5. Sentence-level arithmetic match
    if (this.verifySentenceArithmetic(claim, store)) {
      return true;
    }

    return false;
  }

  private static verifySentenceArithmetic(claim: ExtractedClaim, store: AuthoritativeStore): boolean {
    if (!claim.sentenceContext) return false;
    const currencyRegex = /(?:([\$€£₹])|(USD|EUR|GBP|INR))\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*([kKmMbB])?\b|\b([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*([kKmMbB])?\s*(USD|EUR|GBP|INR)\b/g;
    const sentenceNumbers: number[] = [];
    let match: RegExpExecArray | null;

    while ((match = currencyRegex.exec(claim.sentenceContext)) !== null) {
      const raw = match[3] || match[5] || '';
      const mult = match[4] || match[6] || '';
      const num = this.parseNumericString(raw, mult);
      if (num !== null && !this.isCloseMatch(num, claim.value, 0.01)) {
        // Only consider numbers that are authoritative in store
        for (const authVal of store.amounts.keys()) {
          if (this.isCloseMatch(num, authVal, 0.01)) {
            sentenceNumbers.push(num);
            break;
          }
        }
      }
    }

    // Check if claim is sum or diff of any two authoritative numbers in the sentence
    for (let i = 0; i < sentenceNumbers.length; i++) {
      for (let j = 0; j < sentenceNumbers.length; j++) {
        if (i !== j) {
          const sum = sentenceNumbers[i] + sentenceNumbers[j];
          const diff = Math.abs(sentenceNumbers[i] - sentenceNumbers[j]);
          if (this.isCloseMatch(claim.value, sum, 0.01) || this.isCloseMatch(claim.value, diff, 0.01)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private static isEducationalOrHypothetical(claim: ExtractedClaim, sentence: string): boolean {
    const sentLower = sentence.toLowerCase();

    // 1. Framework & Rule definitions (50/30/20, 70/20/10, 80/20, rule of thumb)
    if (
      sentLower.includes('50/30/20') ||
      sentLower.includes('70/20/10') ||
      sentLower.includes('80/20') ||
      sentLower.includes('rule of thumb') ||
      sentLower.includes('convention')
    ) {
      return true;
    }

    // 2. Benchmark phrasing: e.g. "recommended guideline of 3 to 6 months", "recommended 20% benchmark"
    const idx = sentence.indexOf(claim.text);
    if (idx !== -1) {
      const snippet = sentence.slice(Math.max(0, idx - 45), Math.min(sentence.length, idx + claim.text.length + 45)).toLowerCase();
      if (
        snippet.includes('benchmark') ||
        snippet.includes('guideline') ||
        snippet.includes('rule') ||
        snippet.includes('recommended') ||
        snippet.includes('conventional') ||
        snippet.includes('standard')
      ) {
        // Confirm it's not asserting current user state like "Your current savings rate is 35%"
        if (!snippet.includes('your current') && !snippet.includes('you currently') && !snippet.includes('you spent')) {
          return true;
        }
      }

      // 3. Target ranges in advice: "between $150 and $250", "3 to 6 months"
      if (snippet.includes('between') || snippet.includes(' to ') || snippet.includes('from ')) {
        if (snippet.includes('target') || snippet.includes('guideline') || snippet.includes('reasonable') || snippet.includes('recommend')) {
          return true;
        }
      }

      // 4. Hypothetical & Suggestive advice deltas:
      // "If you reduce entertainment spending by 15%, you could save an additional $50 per month"
      // "Consider setting aside $150"
      if (
        snippet.includes('additional') ||
        snippet.includes('extra') ||
        snippet.includes('reduce') ||
        snippet.includes('cut') ||
        snippet.includes('trim') ||
        snippet.includes('consider') ||
        snippet.includes('setting aside') ||
        snippet.includes('allocating') ||
        snippet.includes('if you') ||
        snippet.includes('could save') ||
        snippet.includes('would save') ||
        snippet.includes('might accumulate') ||
        snippet.includes('could accumulate') ||
        snippet.includes('might allocate') ||
        snippet.includes('could allocate') ||
        snippet.includes('educational') ||
        snippet.includes('hypothetically')
      ) {
        return true;
      }
    }

    return false;
  }

  private static verifyPercentageClaim(claim: ExtractedClaim, store: AuthoritativeStore): boolean {
    for (const authPct of store.percentages.keys()) {
      // Percentage tolerance: ±1.0% (e.g. 75% matches 75.2%)
      if (Math.abs(claim.value - authPct) <= 1.0) {
        return true;
      }
    }
    return false;
  }

  private static verifyRunwayClaim(claim: ExtractedClaim, store: AuthoritativeStore): boolean {
    for (const authRunway of store.runways.keys()) {
      // Runway tolerance: ±0.5 months
      if (Math.abs(claim.value - authRunway) <= 0.5) {
        return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Discrepancy & Warning Builder
  // ---------------------------------------------------------------------------

  private static buildDiscrepancy(claim: ExtractedClaim, store: AuthoritativeStore): FinancialDiscrepancy {
    const cat = claim.categoryContext;
    const isBudgetSentence =
      Boolean(claim.sentenceContext && (
        claim.sentenceContext.toLowerCase().includes('budget') ||
        claim.sentenceContext.toLowerCase().includes('limit') ||
        claim.sentenceContext.toLowerCase().includes('spent')
      ));

    // Check if category has authoritative budget
    if (cat && store.budgets.has(cat)) {
      const b = store.budgets.get(cat)!;
      const officialContext = `Official records show your ${this.capitalize(cat)} budget has $${b.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} spent against an $${b.limit.toLocaleString(undefined, { minimumFractionDigits: 2 })} limit (${b.pct}% utilized).`;
      return {
        claimText: claim.text,
        claimValue: claim.value,
        claimType: claim.type,
        currencyCode: claim.currencyCode,
        reason: `Claimed amount ${claim.text} diverges from official ${cat} budget figures.`,
        officialContext
      };
    }

    // Check if user has no budgets for mentioned category
    if (cat && !store.budgets.has(cat)) {
      const officialContext = `No authoritative budget records found for ${this.capitalize(cat)} (N/A — insufficient data).`;
      return {
        claimText: claim.text,
        claimValue: claim.value,
        claimType: claim.type,
        currencyCode: claim.currencyCode,
        reason: `Claimed figure ${claim.text} for ${cat} has no matching official budget records.`,
        officialContext
      };
    }

    // Check if general budget claim is made when no budgets exist or without specific category
    if (isBudgetSentence) {
      const officialContext = store.hasBudgets
        ? `No authoritative budget records found for this category (N/A — insufficient data).`
        : `No authoritative budget records found (N/A — insufficient data).`;
      return {
        claimText: claim.text,
        claimValue: claim.value,
        claimType: claim.type,
        currencyCode: claim.currencyCode,
        reason: `Claimed budget figure ${claim.text} has no matching official budget records.`,
        officialContext
      };
    }

    // Runway discrepancy
    if (claim.type === 'runway' && store.runwayMonths !== undefined) {
      const officialContext = `Official records show your emergency fund runway is ${store.runwayMonths} months.`;
      return {
        claimText: claim.text,
        claimValue: claim.value,
        claimType: claim.type,
        reason: `Claimed runway of ${claim.text} diverges from official runway of ${store.runwayMonths} months.`,
        officialContext
      };
    }

    // Currency mismatch
    if (claim.currencyCode && !store.activeCurrencies.has(claim.currencyCode)) {
      const authCurrs = Array.from(store.activeCurrencies).join(', ');
      const officialContext = `Active account currency is ${authCurrs}. Claim used incompatible currency ${claim.currencyCode}.`;
      return {
        claimText: claim.text,
        claimValue: claim.value,
        claimType: claim.type,
        currencyCode: claim.currencyCode,
        reason: `Currency ${claim.currencyCode} does not match active account currency.`,
        officialContext
      };
    }

    // General discrepancy fallback
    let officialContext = '';
    if (store.totalIncomeStr && store.totalExpenseStr) {
      officialContext = `Official records show total income of ${store.totalIncomeStr} and total expense of ${store.totalExpenseStr}.`;
    }

    return {
      claimText: claim.text,
      claimValue: claim.value,
      claimType: claim.type,
      currencyCode: claim.currencyCode,
      reason: `Claimed ${claim.type} figure ${claim.text} could not be verified against authoritative records.`,
      officialContext: officialContext || undefined
    };
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  private static parseMoneyValue(val: any): { num: number | null; currency?: string } {
    if (val === undefined || val === null) return { num: null };
    if (typeof val === 'number') return { num: val };

    const str = String(val).trim();
    let currency: string | undefined;

    for (const [sym, code] of Object.entries(this.SYMBOL_MAP)) {
      if (str.includes(sym)) {
        currency = code;
        break;
      }
    }

    const cleaned = str.replace(/[^0-9.-]+/g, '');
    const num = Number(cleaned);
    return { num: isNaN(num) ? null : num, currency };
  }

  private static parseNumericString(raw: string, multiplier?: string): number | null {
    if (!raw) return null;
    const cleaned = raw.replace(/,/g, '');
    let val = Number(cleaned);
    if (isNaN(val)) return null;

    if (multiplier) {
      const m = multiplier.toLowerCase();
      if (m === 'k') val *= 1000;
      else if (m === 'm') val *= 1000000;
      else if (m === 'b') val *= 1000000000;
    }

    return val;
  }

  private static isCloseMatch(a: number, b: number, relativeTolerance: number): boolean {
    if (a === b) return true;
    const diff = Math.abs(a - b);
    if (diff <= 0.01) return true; // Cents rounding
    const maxVal = Math.max(Math.abs(a), Math.abs(b), 1);
    return diff / maxVal <= relativeTolerance;
  }

  private static isCloseMatchInSet(val: number, set: Set<number>, tolerance: number): boolean {
    for (const item of set) {
      if (this.isCloseMatch(val, item, tolerance)) return true;
    }
    return false;
  }

  private static detectCategoryContext(text: string, targetOffset?: number | { start: number; end: number }): string | undefined {
    // Check regex pattern: e.g. "travel budget" or "budget for travel"
    const budgetMatch = text.match(/\b([a-z]+)\s+budget\b|\bbudget\s+(?:for|in|on)\s+([a-z]+)\b/i);
    if (budgetMatch && targetOffset === undefined) {
      const matched = (budgetMatch[1] || budgetMatch[2]).toLowerCase();
      const stopWords = new Set(['your', 'the', 'my', 'a', 'an', 'this', 'our', 'total', 'overall', 'monthly', 'annual']);
      if (!stopWords.has(matched)) {
        return matched;
      }
    }

    const categories = [
      'food', 'dining', 'groceries', 'housing', 'rent', 'utilities',
      'bills', 'transport', 'transportation', 'travel', 'vacation', 'holiday',
      'entertainment', 'shopping', 'healthcare', 'health', 'fitness', 'education',
      'personal', 'electronics'
    ];

    if (targetOffset !== undefined) {
      const cStart = typeof targetOffset === 'number' ? targetOffset : targetOffset.start;
      const cEnd = typeof targetOffset === 'number' ? targetOffset : targetOffset.end;
      let closestCat: string | undefined = undefined;
      let minDistance = Infinity;

      for (const cat of categories) {
        const reg = new RegExp(`\\b${cat}\\b`, 'gi');
        let m: RegExpExecArray | null;
        while ((m = reg.exec(text)) !== null) {
          const matchStart = m.index;
          const matchEnd = matchStart + m[0].length;
          let dist = 0;
          if (cStart > matchEnd) {
            dist = cStart - matchEnd;
          } else if (cEnd < matchStart) {
            dist = matchStart - cEnd;
          } else {
            dist = 0;
          }
          if (dist < minDistance) {
            minDistance = dist;
            closestCat = cat.toLowerCase();
          }
        }
      }
      if (minDistance <= 60) {
        return closestCat;
      }
      return undefined;
    }

    for (const cat of categories) {
      const reg = new RegExp(`\\b${cat}\\b`, 'i');
      if (reg.test(text)) return cat;
    }
    return undefined;
  }

  private static capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
