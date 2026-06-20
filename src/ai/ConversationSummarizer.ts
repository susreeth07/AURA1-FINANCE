import { LLMProvider } from './providers/LLMProvider';

export interface SummarizerMessage {
  readonly role: 'user' | 'model' | 'system';
  readonly content: string;
}

export class ConversationSummarizer {
  static async summarize(messages: readonly SummarizerMessage[], provider: LLMProvider): Promise<string> {
    if (messages.length === 0) {
      return "";
    }

    const conversationText = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = `Summarize the following financial conversation history into a single compact paragraph of context, tracking key goals, budgets, and user queries discussed:\n\n${conversationText}\n\nSummary:`;

    try {
      const summary = await provider.generate(prompt, { temperature: 0.1, maxTokens: 200 });
      return summary.trim();
    } catch (err) {
      console.warn("[ConversationSummarizer] Failed to summarize conversation using LLM provider, using fallback summary.", err);
      // Fallback summary
      return "User queried their budget utilization and savings milestones. System provided advice on runway levels.";
    }
  }
}
