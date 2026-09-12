import { LLMProvider, GenerationOptions, ToolCallingProvider, ToolDefinition, ToolCall, ToolCallResult } from './LLMProvider';
import { StreamingProvider, ChunkEnvelope } from './StreamingProvider';
import { Money } from '../../domain/finance/Money';
import { Currency } from '../../domain/finance/Currency';

export class MockProvider implements LLMProvider, StreamingProvider, ToolCallingProvider {
  readonly id = 'mock';

  // Capability detection methods
  supportsStreaming(): boolean {
    return true;
  }

  supportsSystemPrompts(): boolean {
    return true;
  }

  supportsVision(): boolean {
    return false;
  }

  supportsToolCalling(): boolean {
    return false;
  }

  /**
   * Safely extracts tool outputs, KPIs, budgets, forecasts, and simulation
   * data embedded in the prompt. Detects the user's active currency symbol.
   */
  private extractContext(prompt: string): {
    toolOutputs: Record<string, any>;
    kpis: Record<string, any>;
    budgets: any[];
    forecasts: Record<string, any>;
    simulation: Record<string, any>;
    currencySymbol: string;
    goals: any[];
  } {
    let toolOutputs: Record<string, any> = {};
    const allMatches = Array.from(prompt.matchAll(/\[TOOL OUTPUTS\]\s*([\s\S]*?)(?=\n\[|$)/g));
    for (const match of allMatches) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed && typeof parsed === 'object') {
          toolOutputs = { ...toolOutputs, ...parsed };
        }
      } catch {}
    }

    const analyticsOutput = toolOutputs.analytics || {};
    const kpis = analyticsOutput.kpis || toolOutputs.kpis || toolOutputs.health || {};
    const budgets: any[] = [];
    if (Array.isArray(toolOutputs.budget?.budgets)) {
      budgets.push(...toolOutputs.budget.budgets);
    } else if (Array.isArray(toolOutputs.budgets)) {
      budgets.push(...toolOutputs.budgets);
    } else if (Array.isArray(analyticsOutput.budgets)) {
      budgets.push(...analyticsOutput.budgets);
    }

    if (budgets.length === 0) {
      const budgetMatch = prompt.match(/User Budgets:\s*(\[[\s\S]*?\])/);
      if (budgetMatch && budgetMatch[1]) {
        try {
          const parsed = JSON.parse(budgetMatch[1].trim());
          if (Array.isArray(parsed)) budgets.push(...parsed);
        } catch {}
      }
    }

    const goals: any[] = [];
    if (Array.isArray(toolOutputs.goal?.savings)) {
      goals.push(...toolOutputs.goal.savings);
    } else if (Array.isArray(toolOutputs.savings)) {
      goals.push(...toolOutputs.savings);
    } else if (Array.isArray(analyticsOutput.savings)) {
      goals.push(...analyticsOutput.savings);
    }

    if (goals.length === 0) {
      const goalsMatch = prompt.match(/User Goals:\s*(\[[\s\S]*?\])/);
      if (goalsMatch && goalsMatch[1]) {
        try {
          const parsed = JSON.parse(goalsMatch[1].trim());
          if (Array.isArray(parsed)) goals.push(...parsed);
        } catch {}
      }
    }

    const forecasts = toolOutputs.forecast || toolOutputs.forecasts || analyticsOutput.forecasts || {};
    const simulation = toolOutputs.simulation || {};

    // Detect user's actual currency symbol from formatted values in context
    let currencySymbol = '';
    const searchString = JSON.stringify({ kpis, budgets, simulation, toolOutputs, goals });
    const currMatch = searchString.match(/([$€£₹]|USD|EUR|GBP|INR)/);
    if (currMatch) {
      currencySymbol = currMatch[1];
    }

    return {
      toolOutputs,
      kpis,
      budgets,
      forecasts,
      simulation,
      currencySymbol,
      goals
    };
  }

  /**
   * Safely extracts only the current [USER QUESTION] section from the assembled prompt.
   * This isolates the active user query from conversation memory, domain templates,
   * and tool outputs, preventing prior history keywords from hijacking current response routing.
   */
  private extractUserQuestion(prompt: string): string {
    const marker = '[USER QUESTION]';
    const startIndex = prompt.indexOf(marker);
    if (startIndex === -1) {
      return prompt.trim();
    }
    const afterMarker = prompt.slice(startIndex + marker.length);
    const nextSectionMatch = afterMarker.match(/\r?\n\s*\[/);
    if (nextSectionMatch && nextSectionMatch.index !== undefined) {
      return afterMarker.slice(0, nextSectionMatch.index).trim();
    }
    return afterMarker.trim();
  }

  private resolveCurrency(symbol?: string): Currency {
    if (symbol === '₹' || symbol === 'INR') return Currency.INR;
    if (symbol === '€' || symbol === 'EUR') return Currency.EUR;
    if (symbol === '£' || symbol === 'GBP') return Currency.GBP;
    return Currency.USD;
  }

  private formatAmount(val: any, currency: Currency = Currency.USD): string {
    if (val === undefined || val === null || val === '') {
      return 'N/A';
    }
    const str = String(val).trim();
    // If already properly formatted with currency symbol and formatted number (e.g. "$400.00", "$4,000.00", "₹20,000.00")
    if (/^[\$€£₹A-Z]{1,3}\s?[\d,]+\.\d{2}$/.test(str)) {
      return str;
    }
    // Extract numeric portion
    const cleaned = str.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) {
      return str;
    }
    try {
      return Money.fromDecimal(num, currency).format();
    } catch {
      return `${currency.symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  async generate(prompt: string, options?: GenerationOptions): Promise<string> {
    const userQuestion = this.extractUserQuestion(prompt);
    const questionLower = userQuestion.toLowerCase();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 1. Executive Financial Report
    if (
      questionLower.includes('financial report') ||
      questionLower.includes('executive summary') ||
      questionLower.includes('report-specific') ||
      questionLower.includes('report')
    ) {
      const { kpis, budgets } = this.extractContext(prompt);

      const netSavingsStr = kpis.netSavings ? String(kpis.netSavings) : 'N/A — insufficient data';
      const runwayStr = kpis.runwayMonths !== undefined ? `${kpis.runwayMonths} months` : 'N/A — insufficient data';
      const totalIncomeStr = kpis.totalIncome ? String(kpis.totalIncome) : 'N/A — insufficient data';
      const totalExpenseStr = kpis.totalExpense ? String(kpis.totalExpense) : 'N/A — insufficient data';

      const firstBudget = Array.isArray(budgets) && budgets.length > 0 ? budgets[0] : null;
      const budgetCat = firstBudget ? (firstBudget.cat || firstBudget.category || 'discretionary') : 'discretionary';
      const budgetLimitStr = firstBudget
        ? (firstBudget.lim !== undefined ? String(firstBudget.lim) : (firstBudget.limit !== undefined ? String(firstBudget.limit) : 'N/A — insufficient data'))
        : 'N/A — insufficient data';

      const opportunities: string[] = [];
      if (netSavingsStr !== 'N/A — insufficient data') {
        opportunities.push(`Reallocate surplus savings (${netSavingsStr}) into high-yield accounts.`);
      } else {
        opportunities.push("N/A — insufficient data for surplus reallocation.");
      }
      opportunities.push("Consolidate outstanding recurring liabilities to optimize interest expenses.");

      const recommendations: string[] = [];
      if (budgetLimitStr !== 'N/A — insufficient data') {
        recommendations.push(`Maintain ${budgetCat} spending within ${budgetLimitStr} limit to prevent creep.`);
      } else {
        recommendations.push("N/A — insufficient data to recommend specific budget caps.");
      }
      recommendations.push("Initiate a monthly recurring auto-deposit to your primary savings goal.");

      const achievements: string[] = [
        totalIncomeStr !== 'N/A — insufficient data'
          ? `Tracked monthly total income at ${totalIncomeStr} against expenses of ${totalExpenseStr}.`
          : "N/A — insufficient data for income/expense baseline comparison.",
        "Maintained active monitoring across discretionary categories.",
        runwayStr !== 'N/A — insufficient data'
          ? `Emergency fund runway currently stands at ${runwayStr}.`
          : "N/A — insufficient data for runway evaluation."
      ];

      const summaryPayload = {
        headline: "Financial Stability Maintained with Solid Surplus Accumulation",
        overview: "This executive financial report reviews your overall cash flow, expense allocations, and progress towards compound savings goals. Overall indicators show strong budget compliance.",
        achievements,
        risks: [
          "Discretionary spending shows potential upward trend week-over-week.",
          "Inflation-adjusted bills could reduce the savings rate in upcoming months."
        ],
        opportunities,
        recommendations,
        warnings: [
          "Discretionary limits are near allocation thresholds in the current cycle."
        ],
        confidenceLevel: "High"
      };

      return JSON.stringify({
        answer: JSON.stringify(summaryPayload),
        confidence: { level: 'High', score: 0.95 },
        reasoning: ["Parsed financial metrics for report generation", "Analyzed goals and category spends"],
        insights: ["Net income is positive", "No critical alerts generated"],
        recommendations: ["Maintain current allocations"],
        warnings: [],
        followUpQuestions: ["Generate next month's forecast?"],
        citations: ["AnalyticsContext", "FinancialMath"]
      });
    }

    // 2. Affordability / Purchase Simulation
    if (
      questionLower.includes('macbook') ||
      questionLower.includes('afford') ||
      questionLower.includes('buy') ||
      questionLower.includes('simulation')
    ) {
      const { simulation, currencySymbol } = this.extractContext(prompt);

      if (simulation && simulation.simulationInput) {
        const itemLabel = simulation.simulationInput.label || 'purchase';
        const amountNum = simulation.simulationInput.amount;
        const amountStr = amountNum !== undefined
          ? `${currencySymbol}${Number(amountNum).toLocaleString()}`
          : 'N/A — insufficient data';
        const postRunway = simulation.postRunway !== undefined ? `${simulation.postRunway} months` : 'N/A — insufficient data';
        const isAffordable = simulation.isAffordable === true;

        const answer = isAffordable
          ? `Based on the affordability simulation, you can comfortably afford ${itemLabel} (${amountStr}). Your emergency fund runway would remain safe at ${postRunway}.`
          : `Based on the affordability simulation, you cannot comfortably buy ${itemLabel} (${amountStr}) next month. Your emergency fund runway would drop to ${postRunway}.`;

        return JSON.stringify({
          answer,
          confidence: { level: 'High', score: 0.91 },
          reasoning: ["Subtracted cost from savings", "Calculated runway drop"],
          insights: [isAffordable ? "Purchase maintains safe emergency runway." : "Making purchase drops runway below safe limit."],
          recommendations: [isAffordable ? "Proceed with purchase if planned." : "Postpone purchase until savings increase."],
          warnings: isAffordable ? [] : ["Runway drops below safety threshold (3.0 months)."],
          followUpQuestions: ["Try simulation for 3 months later?"],
          citations: ["FinancialMath", "RiskEngine"]
        });
      }

      return JSON.stringify({
        answer: "Based on the affordability simulation, purchase details are currently N/A — insufficient data.",
        confidence: { level: 'High', score: 0.91 },
        reasoning: ["Evaluated affordability query", "No simulation parameters or savings data available"],
        insights: ["N/A — insufficient data"],
        recommendations: ["Specify an item name and amount to run an affordability simulation."],
        warnings: [],
        followUpQuestions: ["Can I afford a laptop?"],
        citations: ["FinancialMath", "RiskEngine"]
      });
    }

    const isExpenseQuery =
      questionLower.includes('budget') ||
      questionLower.includes('expense') ||
      questionLower.includes('expenditure') ||
      questionLower.includes('spend') ||
      questionLower.includes('spent');

    const isSavingsQuery =
      questionLower.includes('saving') ||
      questionLower.includes('savings') ||
      questionLower.includes('saved') ||
      questionLower.includes('emergency reserve') ||
      questionLower.includes('emergency fund');

    // 3. Combined Expenditure AND Savings
    if (isExpenseQuery && isSavingsQuery) {
      const { kpis, budgets, goals, currencySymbol } = this.extractContext(prompt);
      const currency = this.resolveCurrency(currencySymbol);

      const totalExpenseRaw = kpis.totalExpense !== undefined ? kpis.totalExpense : null;
      const netSavingsRaw = kpis.netSavings !== undefined ? kpis.netSavings : null;

      const totalExpenseStr = totalExpenseRaw !== null ? this.formatAmount(totalExpenseRaw, currency) : null;
      const netSavingsStr = netSavingsRaw !== null ? this.formatAmount(netSavingsRaw, currency) : null;

      const savingsRateRaw = kpis.savingsRate !== undefined ? String(kpis.savingsRate) : null;
      const savingsRateStr = savingsRateRaw !== null ? (savingsRateRaw.includes('%') ? savingsRateRaw : `${savingsRateRaw}%`) : null;

      const b = Array.isArray(budgets) && budgets.length > 0 ? budgets[0] : null;
      const g = Array.isArray(goals) && goals.length > 0 ? goals[0] : null;

      const parts: string[] = [];
      if (totalExpenseStr && netSavingsStr) {
        parts.push(`Based on your financial data, your total monthly expenditure is ${totalExpenseStr} and your net savings is ${netSavingsStr}${savingsRateStr ? ` (savings rate: ${savingsRateStr})` : ''}.`);
      } else if (totalExpenseStr) {
        parts.push(`Based on your financial data, your total monthly expenditure is ${totalExpenseStr}.`);
      } else if (netSavingsStr) {
        parts.push(`Based on your financial data, your net savings is ${netSavingsStr}${savingsRateStr ? ` (savings rate: ${savingsRateStr})` : ''}.`);
      }

      if (b) {
        const cat = b.category || b.cat || 'Expenses';
        const spentRaw = b.spent !== undefined ? b.spent : null;
        const limitRaw = b.limit !== undefined ? b.limit : (b.lim !== undefined ? b.lim : null);
        const spent = spentRaw !== null ? this.formatAmount(spentRaw, currency) : null;
        const limit = limitRaw !== null ? this.formatAmount(limitRaw, currency) : null;
        const pctVal = b.utilizationPercent !== undefined ? b.utilizationPercent : (b.pct !== undefined ? b.pct : null);
        const pctStr = pctVal !== null ? (String(pctVal).includes('%') ? String(pctVal) : `${pctVal}%`) : null;
        if (spent && limit) {
          parts.push(`For ${cat}, you have spent ${spent} against a ${limit} limit${pctStr ? ` (${pctStr} utilization)` : ''}.`);
        }
      }

      if (g) {
        const goalName = g.name || g.goalName || 'savings goal';
        const curRaw = g.cur !== undefined ? g.cur : (g.currentAmount !== undefined ? g.currentAmount : null);
        const tarRaw = g.tar !== undefined ? g.tar : (g.targetAmount !== undefined ? g.targetAmount : null);
        const cur = curRaw !== null ? this.formatAmount(curRaw, currency) : null;
        const tar = tarRaw !== null ? this.formatAmount(tarRaw, currency) : null;
        const pctVal = g.progressPercent !== undefined ? g.progressPercent : (g.pct !== undefined ? g.pct : null);
        const pctStr = pctVal !== null ? (String(pctVal).includes('%') ? String(pctVal) : `${pctVal}%`) : null;
        if (cur && tar) {
          parts.push(`For your '${goalName}' goal, you have accumulated ${cur} toward the ${tar} target${pctStr ? ` (${pctStr} completed)` : ''}.`);
        }
      }

      if (parts.length === 0) {
        parts.push("Based on your financial data, expenditure and savings details are currently N/A — insufficient data.");
      }

      const answer = parts.join(' ');

      const insights: string[] = [];
      if (totalExpenseStr) insights.push(`Total tracked expenses: ${totalExpenseStr}.`);
      if (netSavingsStr) insights.push(`Monthly net savings: ${netSavingsStr}${savingsRateStr ? ` with a savings rate of ${savingsRateStr}` : ''}.`);
      if (insights.length === 0) insights.push("N/A — insufficient data");

      return JSON.stringify({
        answer,
        confidence: { level: 'High', score: 0.95 },
        reasoning: ["Extracted expenditure metrics and budget utilization", "Analyzed net savings, emergency runway, and goal progress"],
        insights,
        recommendations: ["Maintain discretionary spending within planned category limits to meet savings goals."],
        warnings: [],
        followUpQuestions: ["Review individual category expenditures?", "Set up automated contributions to savings goals?"],
        citations: ["BudgetEngine", "SavingsEngine", "AnalyticsContext"]
      });
    }

    // 4. Standalone Expense / Budget / Spend
    if (isExpenseQuery) {
      const { budgets, kpis, currencySymbol } = this.extractContext(prompt);
      const currency = this.resolveCurrency(currencySymbol);
      const b = Array.isArray(budgets) && budgets.length > 0 ? budgets[0] : null;

      if (b) {
        const cat = b.category || b.cat || 'Expenses';
        const spent = b.spent !== undefined ? this.formatAmount(b.spent, currency) : 'N/A — insufficient data';
        const limitRaw = b.limit !== undefined ? b.limit : (b.lim !== undefined ? b.lim : undefined);
        const limit = limitRaw !== undefined ? this.formatAmount(limitRaw, currency) : 'N/A — insufficient data';
        const pctVal = b.utilizationPercent !== undefined ? b.utilizationPercent : (b.pct !== undefined ? b.pct : null);
        const pctStr = pctVal !== null ? (String(pctVal).includes('%') ? String(pctVal) : `${pctVal}%`) : 'N/A — insufficient data';

        const isApproaching = pctVal !== null && Number(String(pctVal).replace(/[^0-9.-]+/g, '')) >= 80;
        const answer = `Based on your budget analysis, you have spent ${spent} on ${cat} out of a ${limit} limit. This represents ${pctStr} utilization.${isApproaching ? ' You are approaching your threshold limit.' : ''}`;

        return JSON.stringify({
          answer,
          confidence: { level: 'High', score: 0.95 },
          reasoning: [`Calculated total ${cat} expenses`, "Compared to limit threshold"],
          insights: [`${cat} spending has utilized ${pctStr} of the monthly budget allocation.`],
          recommendations: [`Maintain ${cat} spending within ${limit} limit.`],
          warnings: isApproaching ? [`${cat} category budget is near threshold.`] : [],
          followUpQuestions: [`Show recent ${cat} charges?`, `Adjust ${cat} budget?`],
          citations: ["BudgetEngine", "AnalyticsContext"]
        });
      }

      const totalExpenseRaw = kpis.totalExpense !== undefined ? kpis.totalExpense : null;
      if (totalExpenseRaw !== null) {
        const totalExpenseStr = this.formatAmount(totalExpenseRaw, currency);
        return JSON.stringify({
          answer: `Based on your expense analysis, your total monthly expenditure is ${totalExpenseStr}.`,
          confidence: { level: 'High', score: 0.95 },
          reasoning: ["Calculated total expenditure across categories", "Compared against baseline income"],
          insights: [`Total monthly expenses stand at ${totalExpenseStr}.`],
          recommendations: ["Track category-level budgets to maintain spending control."],
          warnings: [],
          followUpQuestions: ["Break down expenses by category?", "Review monthly spending trends?"],
          citations: ["BudgetEngine", "AnalyticsContext"]
        });
      }

      return JSON.stringify({
        answer: "Based on your budget analysis, budget details are currently N/A — insufficient data.",
        confidence: { level: 'High', score: 0.95 },
        reasoning: ["Attempted to load budget data from context", "No active budget records found"],
        insights: ["N/A — insufficient data"],
        recommendations: ["Set up budget categories to track your monthly spending."],
        warnings: [],
        followUpQuestions: ["Create a new budget category?"],
        citations: ["BudgetEngine", "AnalyticsContext"]
      });
    }

    // 5. Standalone Savings / Goal
    if (isSavingsQuery || questionLower.includes('goal')) {
      const { kpis, goals, currencySymbol } = this.extractContext(prompt);
      const currency = this.resolveCurrency(currencySymbol);
      const netSavingsStr = kpis.netSavings !== undefined ? this.formatAmount(kpis.netSavings, currency) : null;
      const savingsRateRaw = kpis.savingsRate !== undefined ? String(kpis.savingsRate) : null;
      const savingsRateStr = savingsRateRaw !== null ? (savingsRateRaw.includes('%') ? savingsRateRaw : `${savingsRateRaw}%`) : null;
      const currentSavingsStr = kpis.currentSavings !== undefined ? this.formatAmount(kpis.currentSavings, currency) : null;
      const runwayStr = kpis.runwayMonths !== undefined ? `${kpis.runwayMonths} months` : null;
      const g = Array.isArray(goals) && goals.length > 0 ? goals[0] : null;

      const details: string[] = [];
      if (currentSavingsStr) details.push(`current total savings of ${currentSavingsStr}`);
      if (netSavingsStr) details.push(`monthly net savings of ${netSavingsStr}`);
      if (savingsRateStr) details.push(`savings rate of ${savingsRateStr}`);
      if (runwayStr) details.push(`emergency runway of ${runwayStr}`);

      let answer = "";
      if (details.length > 0) {
        answer = `Based on your savings overview, you have a ${details.join(', ')}.`;
        if (g) {
          const goalName = g.name || g.goalName || 'savings goal';
          const curRaw = g.cur !== undefined ? g.cur : (g.currentAmount !== undefined ? g.currentAmount : null);
          const tarRaw = g.tar !== undefined ? g.tar : (g.targetAmount !== undefined ? g.targetAmount : null);
          const cur = curRaw !== null ? this.formatAmount(curRaw, currency) : null;
          const tar = tarRaw !== null ? this.formatAmount(tarRaw, currency) : null;
          const pctVal = g.progressPercent !== undefined ? g.progressPercent : (g.pct !== undefined ? g.pct : null);
          const pctStr = pctVal !== null ? (String(pctVal).includes('%') ? String(pctVal) : `${pctVal}%`) : null;
          if (cur && tar) {
            answer += ` For your goal '${goalName}', you have saved ${cur} out of ${tar}${pctStr ? ` (${pctStr} complete)` : ''}.`;
          }
        }
      } else {
        answer = "Based on your savings overview, savings details are currently N/A — insufficient data.";
      }

      return JSON.stringify({
        answer,
        confidence: { level: 'High', score: 0.95 },
        reasoning: ["Analyzed savings metrics from analytics context", "Evaluated emergency reserve and active goal targets"],
        insights: [savingsRateStr ? `Current savings rate is ${savingsRateStr}.` : "Savings data loaded from context."],
        recommendations: ["Continue consistent contributions to optimize compound savings growth."],
        warnings: [],
        followUpQuestions: ["Set up a new savings milestone?", "Adjust savings rate targets?"],
        citations: ["SavingsEngine", "AnalyticsContext"]
      });
    }

    // 6. Forecast / Prediction / Projection
    if (
      questionLower.includes('forecast') ||
      questionLower.includes('predict') ||
      questionLower.includes('projection') ||
      questionLower.includes('next month') ||
      questionLower.includes('future')
    ) {
      const { forecasts, kpis } = this.extractContext(prompt);
      const cash3m = forecasts.projectedCash3Months ? String(forecasts.projectedCash3Months) : null;
      const currentCash = kpis.currentSavings ? String(kpis.currentSavings) : null;

      if (cash3m && currentCash) {
        return JSON.stringify({
          answer: `Based on your 3-month forecast projection, your cash balance is projected to move from ${currentCash} to ${cash3m}.`,
          confidence: { level: 'Medium', score: 0.82 },
          reasoning: ["Loaded 3-month forecast", "Calculated trend curves"],
          insights: [`Cash balance is projected to reach ${cash3m} in 3 months.`],
          recommendations: ["Invest surplus funds above runway threshold."],
          warnings: [],
          followUpQuestions: ["See 6-month or 12-month projections?"],
          citations: ["ForecastEngine", "FinancialMath"]
        });
      }

      if (cash3m) {
        return JSON.stringify({
          answer: `Based on your 3-month forecast projection, your projected cash in 3 months is ${cash3m}.`,
          confidence: { level: 'Medium', score: 0.82 },
          reasoning: ["Loaded 3-month forecast", "Calculated trend curves"],
          insights: [`Cash balance is projected to reach ${cash3m} in 3 months.`],
          recommendations: ["Invest surplus funds above runway threshold."],
          warnings: [],
          followUpQuestions: ["See 6-month or 12-month projections?"],
          citations: ["ForecastEngine", "FinancialMath"]
        });
      }

      return JSON.stringify({
        answer: "Based on your 3-month forecast projection, cash flow projection is currently N/A — insufficient data.",
        confidence: { level: 'Medium', score: 0.82 },
        reasoning: ["Loaded forecast tool output", "Insufficient historical records for trend projection"],
        insights: ["N/A — insufficient data"],
        recommendations: ["Maintain consistent transaction history to generate cash flow forecasts."],
        warnings: [],
        followUpQuestions: ["View current month cash flow?"],
        citations: ["ForecastEngine", "FinancialMath"]
      });
    }

    // 7. Income
    if (
      questionLower.includes('income') ||
      questionLower.includes('salary') ||
      questionLower.includes('deposit') ||
      questionLower.includes('earn')
    ) {
      const { kpis } = this.extractContext(prompt);
      const totalIncomeStr = kpis.totalIncome ? String(kpis.totalIncome) : null;
      return JSON.stringify({
        answer: totalIncomeStr
          ? `Based on your income analysis, your total monthly income is ${totalIncomeStr}.`
          : "Based on your income analysis, income details are currently N/A — insufficient data.",
        confidence: { level: 'High', score: 0.95 },
        reasoning: ["Retrieved verified monthly salary and deposits", "Compared against expected monthly cash flows"],
        insights: [totalIncomeStr ? `Monthly income baseline: ${totalIncomeStr}.` : "N/A — insufficient data"],
        recommendations: ["Allocate surplus recurring income toward your high-priority goals."],
        warnings: [],
        followUpQuestions: ["Review income sources?", "Adjust monthly allocation?"],
        citations: ["IncomeEngine", "AnalyticsContext"]
      });
    }

    // 8. Cash Flow
    if (
      questionLower.includes('cash flow') ||
      questionLower.includes('inflow') ||
      questionLower.includes('outflow') ||
      questionLower.includes('net flow')
    ) {
      const { kpis } = this.extractContext(prompt);
      const netSavingsStr = kpis.netSavings ? String(kpis.netSavings) : null;
      const runwayStr = kpis.runwayMonths !== undefined ? `${kpis.runwayMonths} months` : null;
      return JSON.stringify({
        answer: netSavingsStr
          ? `Based on your cash flow analysis, your net monthly cash flow is ${netSavingsStr}${runwayStr ? ` with an emergency runway of ${runwayStr}` : ''}.`
          : "Based on your cash flow analysis, cash flow records are currently N/A — insufficient data.",
        confidence: { level: 'High', score: 0.95 },
        reasoning: ["Analyzed monthly cash inflows versus category outflows", "Evaluated net cash flow delta and runway buffer"],
        insights: [netSavingsStr ? `Net cash flow stands at ${netSavingsStr}.` : "N/A — insufficient data"],
        recommendations: ["Maintain a positive monthly cash flow to ensure stable liquidity."],
        warnings: [],
        followUpQuestions: ["Show 30-day cash flow trends?", "View recurring inflows and bills?"],
        citations: ["CashFlowEngine", "AnalyticsContext"]
      });
    }

    // 9. Fallback / Greeting / General
    const { kpis } = this.extractContext(prompt);
    const runwayVal = kpis.runwayMonths;
    const runwayStr = runwayVal !== undefined ? `${runwayVal} months` : 'N/A — insufficient data';

    return JSON.stringify({
      answer: runwayStr !== 'N/A — insufficient data'
        ? `Hello! I am Aura AI, your financial assistant. Your overall emergency fund runway is ${runwayStr}.`
        : "Hello! I am Aura AI, your financial assistant. How can I assist you with your finances today?",
      confidence: { level: 'High', score: 0.9 },
      reasoning: ["Processed generic context check"],
      insights: [runwayStr !== 'N/A — insufficient data' ? `Runway covers ${runwayStr}.` : "N/A — insufficient data"],
      recommendations: ["Keep current savings rate."],
      warnings: [],
      followUpQuestions: ["Analyze my cash flow?"],
      citations: ["AnalyticsContext"]
    });
  }

  // Implementation of StreamingProvider
  async generateStream(prompt: string, options?: GenerationOptions): Promise<AsyncIterable<ChunkEnvelope>> {
    const text = await this.generate(prompt, options);
    
    // Split the text into smaller word chunks to simulate stream
    const words = text.split(' ');
    
    return {
      [Symbol.asyncIterator]() {
        let index = 0;
        return {
          async next() {
            if (index >= words.length) {
              return { done: true, value: undefined };
            }
            
            const chunk = words[index] + ' ';
            index++;
            
            // Short delay
            await new Promise(r => setTimeout(r, 10));

            return {
              done: false,
              value: {
                chunk,
                metadata: {
                  tokenCount: Math.ceil(chunk.length / 4),
                  done: index === words.length
                }
              }
            };
          }
        };
      }
    };
  }

  // ------------------------------------------------------------------ Tool Calling (§5)
  // Stub implementation: MockProvider returns the generated text with no tool calls.

  async generateWithTools(
    prompt: string,
    tools: readonly ToolDefinition[],
    options?: GenerationOptions
  ): Promise<{ text: string; toolCalls: readonly ToolCall[] }> {
    const text = await this.generate(prompt, options);
    return { text, toolCalls: [] };
  }

  async continueWithToolResults(
    originalPrompt: string,
    toolResults: readonly ToolCallResult[],
    options?: GenerationOptions
  ): Promise<string> {
    return this.generate(originalPrompt, options);
  }
}
