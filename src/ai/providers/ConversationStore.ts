export interface ConversationStore {
  save(conversationId: string, messages: readonly any[], summary: string): Promise<void>;
  load(conversationId: string): Promise<{ messages: any[]; summary: string } | null>;
  delete(conversationId: string): Promise<void>;
}

export class MemoryConversationStore implements ConversationStore {
  private store = new Map<string, { messages: any[]; summary: string }>();

  async save(conversationId: string, messages: readonly any[], summary: string): Promise<void> {
    this.store.set(conversationId, {
      messages: [...messages],
      summary
    });
  }

  async load(conversationId: string): Promise<{ messages: any[]; summary: string } | null> {
    return this.store.get(conversationId) || null;
  }

  async delete(conversationId: string): Promise<void> {
    this.store.delete(conversationId);
  }
}
