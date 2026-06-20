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

  async generate(prompt: string, options?: GenerationOptions): Promise<string> {
    const promptLower = prompt.toLowerCase();
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (promptLower.includes('budget') || promptLower.includes('spend')) {
      return JSON.stringify({
        answer: "Based on your budget analysis, you have spent ₹4,200 on Food and Dining out of a ₹5,000 limit. This represents 84% utilization. You are approaching your threshold limit.",
        confidence: { level: 'High', score: 0.95 },
        reasoning: ["Calculated total Food expenses", "Compared to limit threshold"],
        insights: ["Food spending has utilized 84% of the monthly budget allocation."],
        recommendations: ["Reduce dining out for next 10 days."],
        warnings: ["Food category budget is near threshold."],
        followUpQuestions: ["Show recent Food charges?", "Adjust Food budget?"],
        citations: ["BudgetEngine", "AnalyticsContext"]
      });
    }

    if (promptLower.includes('forecast') || promptLower.includes('predict') || promptLower.includes('projection')) {
      return JSON.stringify({
        answer: "Based on your 3-month forecast projection, your cash flow is projected to remain stable, growing from ₹7,500 to ₹10,200.",
        confidence: { level: 'Medium', score: 0.82 },
        reasoning: ["Loaded 3-month forecast", "Calculated trend curves"],
        insights: ["Cash balance is projected to reach ₹10,200 in 3 months."],
        recommendations: ["Invest surplus funds above runway threshold."],
        warnings: [],
        followUpQuestions: ["See 6-month or 12-month projections?"],
        citations: ["ForecastEngine", "FinancialMath"]
      });
    }

    if (promptLower.includes('macbook') || promptLower.includes('afford') || promptLower.includes('buy') || promptLower.includes('simulation')) {
      return JSON.stringify({
        answer: "Based on the affordability simulation, you cannot comfortably buy a MacBook (₹10,000) next month. Your emergency fund runway would drop to 1.2 months.",
        confidence: { level: 'High', score: 0.91 },
        reasoning: ["Subtracted cost from savings", "Calculated runway drop"],
        insights: ["Making purchase drops runway below safe limit."],
        recommendations: ["Postpone purchase by 4 months."],
        warnings: ["Runway drops below safety threshold (3.0 months)."],
        followUpQuestions: ["Try simulation for 3 months later?"],
        citations: ["FinancialMath", "RiskEngine"]
      });
    }

    return JSON.stringify({
      answer: "Hello! I am Aura AI, your financial assistant. Your overall emergency fund runway is 4.2 months.",
      confidence: { level: 'High', score: 0.9 },
      reasoning: ["Processed generic context check"],
      insights: ["Runway covers 4.2 months."],
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
