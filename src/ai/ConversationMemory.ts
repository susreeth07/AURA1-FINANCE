import { SummarizerMessage, ConversationSummarizer } from './ConversationSummarizer';
import { TokenBudgetManager } from './TokenBudgetManager';
import { LLMProvider } from './providers/LLMProvider';

export interface MessageMetadata {
  readonly conversationId: string;
  readonly sessionId: string;
  readonly messageId: string;
  readonly parentMessageId: string | null;
  readonly createdAt: Date;
}

export interface ConversationMessage {
  readonly role: 'user' | 'model' | 'system';
  readonly content: string;
  readonly metadata: MessageMetadata;
}

export class ConversationMemory {
  private messages: ConversationMessage[] = [];
  private activeSummary: string = "";

  constructor(readonly conversationId: string, readonly sessionId: string) {}

  addMessage(role: 'user' | 'model' | 'system', content: string, parentMessageId: string | null = null): ConversationMessage {
    const messageId = `msg_${Math.random().toString(36).substring(2, 11)}`;
    const msg: ConversationMessage = {
      role,
      content,
      metadata: {
        conversationId: this.conversationId,
        sessionId: this.sessionId,
        messageId,
        parentMessageId,
        createdAt: new Date()
      }
    };
    this.messages.push(msg);
    return msg;
  }

  getMessages(): readonly ConversationMessage[] {
    return this.messages;
  }

  getSummary(): string {
    return this.activeSummary;
  }

  setSummary(summary: string): void {
    this.activeSummary = summary;
  }

  async enforceBudget(provider: LLMProvider): Promise<boolean> {
    const rawText = this.messages.map(m => m.content).join(' ') + this.activeSummary;
    const tokens = TokenBudgetManager.estimateTokens(rawText);

    if (TokenBudgetManager.isBudgetWarning(tokens) && this.messages.length > 4) {
      // Summarize the oldest 50% of messages
      const midpoint = Math.floor(this.messages.length / 2);
      const toSummarize = this.messages.slice(0, midpoint).map(m => ({
        role: m.role,
        content: m.content
      }));

      const newSummaryPart = await ConversationSummarizer.summarize(toSummarize, provider);
      this.activeSummary = this.activeSummary 
        ? `${this.activeSummary}\n${newSummaryPart}`
        : newSummaryPart;

      // Retain the remaining messages
      this.messages = this.messages.slice(midpoint);
      return true; // Pruned/compressed
    }

    return false;
  }

  clear(): void {
    this.messages = [];
    this.activeSummary = "";
  }
}
