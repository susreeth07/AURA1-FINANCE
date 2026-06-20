export class ExplainabilityEngine {
  static compileReasoning(
    intent: string,
    toolsUsed: readonly string[],
    durationMs: number
  ): string[] {
    return [
      `1. Sanitized query and routed through AI Guardrails.`,
      `2. Classified intent to domain category: "${intent}".`,
      `3. Compiled tool execution plan containing steps: [${toolsUsed.join(', ')}].`,
      `4. Triggered tool runs concurrently and resolved outputs in ${durationMs.toFixed(1)}ms.`,
      `5. Performed deterministic logic validations on stashed KPIs.`,
      `6. Constructed LLM context envelope and generated final natural-language framing.`
    ];
  }

  static getAssumptions(intent: string): string[] {
    const assumptions = [
      "Assumed current profile parameters (salary, savings) are accurate.",
      "Calculated runway values assume fixed expenses remain constant."
    ];

    if (intent === 'Forecast') {
      assumptions.push("Projected cash balance assumes historic savings rate continues linearly.");
    }

    return assumptions;
  }
}
