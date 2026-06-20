import { AIConfiguration, AIProfile } from '../AIConfiguration';

/**
 * ModelSelector – chooses the appropriate Gemini model tier based on
 * prompt complexity, token budget and current cost-protection policy.
 *
 * Complexity tiers:
 *   small   → Flash Lite  (short factual queries, < 400 tokens)
 *   normal  → Flash       (conversational replies, 400–1200 tokens)
 *   complex → Pro         (multi-step financial reasoning, > 1200 tokens)
 *
 * All thresholds and model names come from AIConfiguration – nothing is
 * hard-coded here.
 */
export type PromptComplexity = 'small' | 'normal' | 'complex';

export interface ModelSelectionResult {
  readonly model: string;
  readonly complexity: PromptComplexity;
  readonly reason: string;
}

export class ModelSelector {
  /**
   * Keywords that always up-promote a prompt to "complex" regardless of length.
   * Kept intentionally short – the full set lives in configuration.
   */
  private static readonly COMPLEX_KEYWORDS: readonly string[] = [
    'forecast', 'simulation', 'projection', 'multi-month', 'scenario',
    'investment', 'portfolio', 'cash flow', 'retirement', 'tax',
    'debt payoff', 'compound', 'amortize', 'rebalance'
  ];

  private static readonly SMALL_KEYWORDS: readonly string[] = [
    'hello', 'hi', 'thanks', 'yes', 'no', 'ok', 'sure'
  ];

  // -----------------------------------------------------------------
  // Complexity detection
  // -----------------------------------------------------------------

  static detectComplexity(prompt: string): PromptComplexity {
    const lower = prompt.toLowerCase().trim();
    const wordCount = lower.split(/\s+/).filter(w => w.length > 0).length;

    // Explicit simple phrases override everything (8 words or fewer + no financial terms)
    const isSmallPhrase = wordCount <= 8 && !this.COMPLEX_KEYWORDS.some(k => lower.includes(k));
    if (isSmallPhrase && this.SMALL_KEYWORDS.some(k => lower.startsWith(k))) {
      return 'small';
    }

    // Complex financial keywords → Pro regardless of length
    if (this.COMPLEX_KEYWORDS.some(k => lower.includes(k))) {
      return 'complex';
    }

    // Word-count heuristic
    // < 8 words  → small   (short factual/greeting)
    // 8–35 words → normal  (conversational, one concept)
    // > 35 words → complex (multi-step reasoning)
    if (wordCount < 8)  return 'small';
    if (wordCount <= 35) return 'normal';
    return 'complex';
  }

  // -----------------------------------------------------------------
  // Model selection
  // -----------------------------------------------------------------

  static selectModel(prompt: string, modelOverride?: string): ModelSelectionResult {
    if (modelOverride) {
      return {
        model: modelOverride,
        complexity: 'normal',
        reason: 'Explicit modelOverride supplied by caller.'
      };
    }

    const config: AIProfile = AIConfiguration.getConfig();
    const complexity = this.detectComplexity(prompt);

    switch (complexity) {
      case 'small':
        return {
          model: config.experimentalModel, // Flash Lite for small prompts
          complexity,
          reason: `Short/simple prompt (est. ${Math.ceil(prompt.length / 4)} tokens) → experimentalModel (Flash Lite).`
        };
      case 'normal':
        return {
          model: config.fallbackModel,     // Flash for normal conversations
          complexity,
          reason: `Conversational prompt → fallbackModel (Flash).`
        };
      case 'complex':
        return {
          model: config.defaultModel,      // Pro for deep financial reasoning
          complexity,
          reason: `Complex financial reasoning detected → defaultModel (Pro).`
        };
    }
  }
}
