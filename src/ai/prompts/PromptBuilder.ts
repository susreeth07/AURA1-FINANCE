import { IntentType } from '../IntentClassifier';
import { AdvicePrompt } from './AdvicePrompt';
import { BudgetPrompt } from './BudgetPrompt';
import { ForecastPrompt } from './ForecastPrompt';
import { GoalPrompt } from './GoalPrompt';
import { HealthPrompt } from './HealthPrompt';
import { SummaryPrompt } from './SummaryPrompt';

export class PromptBuilder {
  static build(
    intent: IntentType,
    query: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    memorySummary: string,
    memoryMessagesText: string
  ): string {
    // 1. Get base template matching the intent
    let domainPrompt = '';
    switch (intent) {
      case 'Budget':
      case 'Expense':
        domainPrompt = BudgetPrompt.getTemplate(context, toolOutputs);
        break;
      case 'Forecast':
      case 'Cash Flow':
        domainPrompt = ForecastPrompt.getTemplate(context, toolOutputs);
        break;
      case 'Goal':
      case 'Savings':
        domainPrompt = GoalPrompt.getTemplate(context, toolOutputs);
        break;
      case 'Recommendation':
      case 'Investment':
        domainPrompt = AdvicePrompt.getTemplate(context, toolOutputs);
        break;
      case 'General Finance':
        domainPrompt = HealthPrompt.getTemplate(context, toolOutputs);
        break;
      case 'Greeting':
        domainPrompt = "Greet the user warmly as Aura AI, your financial assistant, and ask how you can help today.";
        break;
      case 'Unknown':
      default:
        domainPrompt = SummaryPrompt.getTemplate(context);
        break;
    }

    // 2. Assemble system envelope
    return `
[SYSTEM INSTRUCTIONS]
You are Aura AI, an enterprise-grade financial intelligence engine. 
You must analyze the stashed context, memory, user question, and tool outputs to generate a highly professional, accurate, and explainable answer.
DO NOT perform mathematical calculations; all metrics are pre-calculated.
Format the output as a valid JSON block containing:
{
  "answer": "Your natural language response...",
  "confidence": {
    "level": "High" | "Medium" | "Low",
    "score": 0.0 to 1.0
  },
  "reasoning": ["Step 1...", "Step 2..."],
  "insights": ["Insight 1...", "Insight 2..."],
  "recommendations": ["Recommendation 1...", "Recommendation 2..."],
  "warnings": ["Warning 1...", "Warning 2..."],
  "followUpQuestions": ["Q1?", "Q2?"],
  "citations": ["Citation 1...", "Citation 2..."]
}

[DOMAIN CONTEXT]
${domainPrompt}

[CONVERSATION MEMORY]
Summary: ${memorySummary || 'None'}
Recent Chat History:
${memoryMessagesText || 'None'}

[USER QUESTION]
${query}

[TOOL OUTPUTS]
${JSON.stringify(toolOutputs, null, 2)}
`;
  }
}
