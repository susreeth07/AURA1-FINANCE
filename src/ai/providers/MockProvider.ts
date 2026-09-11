import { LLMProvider, GenerationOptions, ToolCallingProvider, ToolDefinition, ToolCall, ToolCallResult } from './LLMProvider';
import { StreamingProvider, ChunkEnvelope } from './StreamingProvider';

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

    const forecasts = toolOutputs.forecast || toolOutputs.forecasts || analyticsOutput.forecasts || {};
    const simulation = toolOutputs.simulation || {};

    // Detect user's actual currency symbol from formatted values in context
    let currencySymbol = '';
    const searchString = JSON.stringify({ kpis, budgets, simulation, toolOutputs });
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
      currencySymbol
    };
  }

  async generate(prompt: string, options?: GenerationOptions): Promise<string> {
    const promptLower = prompt.toLowerCase();
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (promptLower.includes('financial report') || promptLower.includes('executive summary') || promptLower.includes('report-specific') || promptLower.includes('report')) {
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

    if (promptLower.includes('budget') || promptLower.includes('spend')) {
      const { budgets } = this.extractContext(prompt);
      const b = Array.isArray(budgets) && budgets.length > 0 ? budgets[0] : null;

      if (b) {
        const cat = b.category || b.cat || 'Expenses';
        const spent = b.spent !== undefined ? String(b.spent) : 'N/A — insufficient data';
        const limit = b.limit !== undefined ? String(b.limit) : (b.lim !== undefined ? String(b.lim) : 'N/A — insufficient data');
        const pctVal = b.utilizationPercent !== undefined ? b.utilizationPercent : (b.pct !== undefined ? b.pct : null);
        const pctStr = pctVal !== null ? `${pctVal}%` : 'N/A — insufficient data';

        const isApproaching = pctVal !== null && pctVal >= 80;
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

    if (promptLower.includes('forecast') || promptLower.includes('predict') || promptLower.includes('projection')) {
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

    if (promptLower.includes('macbook') || promptLower.includes('afford') || promptLower.includes('buy') || promptLower.includes('simulation')) {
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
