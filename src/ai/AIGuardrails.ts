export interface GuardrailCheckResult {
  readonly approved: boolean;
  readonly reason?: string;
  readonly sanitizedPrompt: string;
}

export class AIGuardrails {
  private static readonly injectionPatterns = [
    /ignore prior/i,
    /ignore previous/i,
    /system instruction/i,
    /you are now/i,
    /jailbreak/i,
    /dan mode/i,
    /prompt injection/i
  ];

  private static readonly blockedTopics = [
    /how to code/i,
    /write python/i,
    /write javascript/i,
    /build a website/i,
    /how to fix a car/i,
    /medical advice/i,
    /recipe/i
  ];

  static verify(prompt: string): GuardrailCheckResult {
    const trimmed = prompt.trim();
    
    // 1. Check for prompt injection
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(trimmed)) {
        return {
          approved: false,
          reason: "Security Guardrails: Potential prompt injection or jailbreak attempt detected.",
          sanitizedPrompt: trimmed
        };
      }
    }

    // 2. Check for out-of-scope requests
    for (const pattern of this.blockedTopics) {
      if (pattern.test(trimmed)) {
        return {
          approved: false,
          reason: "I am only authorized to assist with financial queries related to your accounts, budgets, and savings goals.",
          sanitizedPrompt: trimmed
        };
      }
    }

    // 3. Normalization and basic sanitization
    const sanitized = trimmed
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .replace(/\s+/g, ' ');   // Normalize whitespace

    return {
      approved: true,
      sanitizedPrompt: sanitized
    };
  }
}
