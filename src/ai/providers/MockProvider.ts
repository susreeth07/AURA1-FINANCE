import { LLMProvider, GenerationOptions } from './LLMProvider';

export class MockProvider implements LLMProvider {
  readonly id = 'mock';

  async generate(prompt: string, options?: GenerationOptions): Promise<string> {
    const promptLower = prompt.toLowerCase();
    
    // Simulate latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Default mock response structures based on intent keywords
    if (promptLower.includes('budget') || promptLower.includes('spend')) {
      return JSON.stringify({
        answer: "Based on your budget analysis, you have spent ₹4,200 on Food and Dining out of a ₹5,000 limit. This represents 84% utilization. You are approaching your threshold limit.",
        confidence: { level: 'High', score: 0.95 },
        reasoning: [
          "Calculated total expenses in the Food category",
          "Compared spent amount to the configured limit"
        ],
        insights: [
          "Food spending has utilized 84% of the monthly budget allocation."
        ],
        recommendations: [
          "Reduce dining out expenses for the next 10 days to avoid exceeding the limit."
        ],
        warnings: [
          "Food category budget is near breach threshold."
        ],
        followUpQuestions: [
          "Would you like me to show a list of recent food transactions?",
          "Should I adjust your Food budget limit?"
        ],
        citations: ["BudgetEngine", "AnalyticsContext"]
      });
    }

    if (promptLower.includes('forecast') || promptLower.includes('predict') || promptLower.includes('projection')) {
      return JSON.stringify({
        answer: "Based on your 3-month forecast projection, your cash flow is projected to remain stable, growing from ₹7,500 to ₹10,200. No liquidity shortfalls are expected.",
        confidence: { level: 'Medium', score: 0.82 },
        reasoning: [
          "Loaded 3-month forecast projection vectors",
          "Calculated future growth rate from current savings rate of 12.5%"
        ],
        insights: [
          "Cash balance is projected to reach ₹10,200 in 3 months."
        ],
        recommendations: [
          "Invest surplus funds above the emergency runway into your high-priority goals."
        ],
        warnings: [],
        followUpQuestions: [
          "Would you like to see the 6-month or 12-month projections?",
          "How does a ₹2,000 emergency expense affect this forecast?"
        ],
        citations: ["ForecastEngine", "FinancialMath"]
      });
    }

    if (promptLower.includes('macbook') || promptLower.includes('afford') || promptLower.includes('buy') || promptLower.includes('simulation')) {
      return JSON.stringify({
        answer: "Based on the affordability simulation, you cannot comfortably buy a MacBook (₹10,000) next month. Your emergency fund runway would drop to 1.2 months, which is below the safe threshold of 3 months.",
        confidence: { level: 'High', score: 0.91 },
        reasoning: [
          "Compared cost against current savings of ₹5,000",
          "Ran simulation subtracting ₹10,000 from cash balances",
          "Evaluated post-purchase runway ratio of 1.2 months"
        ],
        insights: [
          "Making this purchase immediately degrades financial resilience from high safety to critical risk."
        ],
        recommendations: [
          "Postpone the purchase by 4 months or set up a dedicated laptop savings goal of ₹2,500/month."
        ],
        warnings: [
          "Post-purchase emergency fund drops below the 3-month limit."
        ],
        followUpQuestions: [
          "What is the simulation output if you buy it in 3 months?",
          "Can we set up a dedicated Savings Goal for this MacBook?"
        ],
        citations: ["FinancialMath", "RiskEngine", "SavingsEngine"]
      });
    }

    if (promptLower.includes('greeting') || promptLower.includes('hello') || promptLower.includes('hi')) {
      return JSON.stringify({
        answer: "Hello! I am Aura AI, your enterprise financial intelligence partner. How can I help you analyze your budgets, savings goals, or forecasts today?",
        confidence: { level: 'High', score: 1.0 },
        reasoning: ["Classified query as greeting. Returned welcoming greeting."],
        insights: [],
        recommendations: [],
        warnings: [],
        followUpQuestions: [
          "How is my budget utilization looking?",
          "What is my current financial health score?"
        ],
        citations: []
      });
    }

    // Generic response
    return JSON.stringify({
      answer: "I have analyzed your request. Your overall financial runway covers 4.2 months, and your health score is 82/100, which is highly stable.",
      confidence: { level: 'Medium', score: 0.75 },
      reasoning: [
        "Loaded generic financial context snapshots",
        "Calculated runway from profile metrics"
      ],
      insights: [
        "Emergency reserves currently cover 4.2 months of fixed costs."
      ],
      recommendations: [
        "Keep saving at your current 15% rate."
      ],
      warnings: [],
      followUpQuestions: [
        "Can you explain how my health score is calculated?",
        "Show me my recurring bills."
      ],
      citations: ["HealthAnalyzer", "AnalyticsContext"]
    });
  }
}
