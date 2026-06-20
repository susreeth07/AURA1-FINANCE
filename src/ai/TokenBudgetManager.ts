import { AIConfiguration } from './AIConfiguration';

export class TokenBudgetManager {
  /**
   * Estimate token usage (standard approximation: ~4 characters = 1 token).
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  static isBudgetWarning(promptTokens: number): boolean {
    const config = AIConfiguration.getConfig();
    const threshold = config.tokenLimit * 0.8; // 80% threshold
    return promptTokens >= threshold;
  }

  static getRemainingBudget(usedTokens: number): number {
    const config = AIConfiguration.getConfig();
    return Math.max(0, config.tokenLimit - usedTokens);
  }
}
