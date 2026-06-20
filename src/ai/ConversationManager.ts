import { ConversationContext } from './ConversationContext';
import { ConversationMemory } from './ConversationMemory';

export class ConversationManager {
  private static sessions = new Map<string, ConversationContext>();

  static getOrCreateSession(userId: string, conversationId?: string, sessionId?: string): ConversationContext {
    const cid = conversationId || `conv_${Math.random().toString(36).substring(2, 11)}`;
    const sid = sessionId || `sess_${Math.random().toString(36).substring(2, 11)}`;
    const sessionKey = `${userId}:${cid}`;

    const existing = this.sessions.get(sessionKey);
    if (existing) {
      // Update last activity
      const updated: ConversationContext = {
        ...existing,
        lastActivity: new Date()
      };
      this.sessions.set(sessionKey, updated);
      return updated;
    }

    const memory = new ConversationMemory(cid, sid);
    const newContext: ConversationContext = {
      conversationId: cid,
      sessionId: sid,
      userId,
      memory,
      lastActivity: new Date(),
      metadata: {}
    };

    this.sessions.set(sessionKey, newContext);
    return newContext;
  }

  static getSession(userId: string, conversationId: string): ConversationContext | null {
    const sessionKey = `${userId}:${conversationId}`;
    return this.sessions.get(sessionKey) || null;
  }

  static removeSession(userId: string, conversationId: string): void {
    const sessionKey = `${userId}:${conversationId}`;
    this.sessions.delete(sessionKey);
  }

  static listSessionsForUser(userId: string): ConversationContext[] {
    const result: ConversationContext[] = [];
    for (const [key, ctx] of this.sessions.entries()) {
      if (key.startsWith(`${userId}:`)) {
        result.push(ctx);
      }
    }
    return result;
  }

  static clear(): void {
    this.sessions.clear();
  }
}
