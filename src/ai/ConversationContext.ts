import { ConversationMemory } from './ConversationMemory';

export interface ConversationContext {
  readonly conversationId: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly memory: ConversationMemory;
  readonly lastActivity: Date;
  readonly metadata: Record<string, any>;
}
