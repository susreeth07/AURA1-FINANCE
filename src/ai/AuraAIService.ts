import { AuraResponse } from './models/AuraResponse';
import { LLMProvider } from './providers/LLMProvider';
import { MockProvider } from './providers/MockProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { AIGuardrails } from './AIGuardrails';
import { AICache } from './AICache';
import { IntentClassifier } from './IntentClassifier';
import { AIPlanner } from './AIPlanner';
import { ToolExecutor } from './ToolExecutor';
import { ConversationManager } from './ConversationManager';
import { PromptBuilder } from './prompts/PromptBuilder';
import { ConfidenceEngine } from './ConfidenceEngine';
import { ExplainabilityEngine } from './ExplainabilityEngine';
import { ResponseFormatter, FormattingStyle } from './ResponseFormatter';
import { AIHealth } from './AIHealth';
import { TokenBudgetManager } from './TokenBudgetManager';
import { AIInsightEngine } from './AIInsightEngine';
import { AIRecommendationEngine } from './AIRecommendationEngine';

// Provider infrastructure
import { ProviderRateLimiter } from './providers/ProviderRateLimiter';
import { CircuitBreaker } from './providers/CircuitBreaker';
import { TimeoutError, ProviderUnavailableError } from './providers/ProviderErrors';
import { ModelSelector } from './providers/ModelSelector';
import { CostProtection } from './providers/CostProtection';
import { AIConfiguration } from './AIConfiguration';

export class AuraAIService {
  private provider: LLMProvider;
  private fallbackProvider: LLMProvider;

  constructor(providerOverride?: LLMProvider) {
    this.fallbackProvider = new MockProvider();
    if (providerOverride) {
      this.provider = providerOverride;
    } else {
      const isEnvAvailable = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined';
      const apiKey = (isEnvAvailable ? import.meta.env.VITE_GEMINI_API_KEY : process.env.VITE_GEMINI_API_KEY) || '';
      
      if (apiKey) {
        this.provider = new GeminiProvider();
      } else {
        this.provider = this.fallbackProvider;
      }
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `hash_${hash}`;
  }

  async processQuery(
    userId: string,
    query: string,
    options?: {
      readonly conversationId?: string;
      readonly sessionId?: string;
      readonly formattingStyle?: FormattingStyle;
      readonly correlationId?: string;
      readonly modelOverride?: string;
    }
  ): Promise<AuraResponse> {
    const startTime = performance.now();

    // 1. Generate Correlation IDs
    const requestId = `req_${Math.random().toString(36).substring(2, 11)}`;
    const correlationId = options?.correlationId || `corr_${Math.random().toString(36).substring(2, 11)}`;
    const sessionId = options?.sessionId || `sess_def_${Math.random().toString(36).substring(2, 11)}`;

    // 2. Check Guardrails
    const guardrailResult = AIGuardrails.verify(query);
    if (!guardrailResult.approved) {
      AIHealth.recordFailure();
      return {
        answer: guardrailResult.reason || "Security Guardrails: Request blocked.",
        confidence: { level: 'Low', score: 0.0 },
        reasoning: ["Request intercepted by AIGuardrails."],
        insights: [],
        recommendations: [],
        warnings: ["Security scan block."],
        followUpQuestions: [],
        toolsUsed: [],
        citations: [],
        metadata: { requestId, correlationId, sessionId, guardrailBlocked: true },
        executionTimeMs: Number((performance.now() - startTime).toFixed(2))
      };
    }

    const sanitizedPrompt = guardrailResult.sanitizedPrompt;

    // Secure Prompt Logging: only log hashes, sizes, execution times
    const promptHash = this.hashString(sanitizedPrompt);
    console.log(`[AuraAIService] Querying model. RequestId: ${requestId}, Correlation: ${correlationId}, Hash: ${promptHash}`);

    // 3. Classify Intent
    const intent = IntentClassifier.classify(sanitizedPrompt);

    // 4. Resolve Memory
    const session = ConversationManager.getOrCreateSession(userId, options?.conversationId, sessionId);
    session.memory.addMessage('user', sanitizedPrompt);

    // 5. Enforce Token Budgets
    const compressed = await session.memory.enforceBudget(this.provider);
    if (compressed) {
      AIHealth.recordCompression();
    }

    // 6. Execute Plan & Run Tools
    const plan = AIPlanner.buildPlan(intent, sanitizedPrompt);
    const executorStart = performance.now();
    const executorResult = await ToolExecutor.execute(userId, plan.steps);
    const executorDuration = performance.now() - executorStart;
    
    AIHealth.recordToolExecution(executorDuration);

    // 7. Cache Lookup
    const context = await ToolExecutor.execute(userId, ['analytics']);
    const cacheKey = AICache.generateKey({
      userId,
      prompt: sanitizedPrompt,
      contextVersion: context.outputs.analytics?.healthStatus?.status || '1.0',
      conversationStateHash: session.memory.getSummary() + session.memory.getMessages().length
    });

    const cachedResponse = AICache.get(cacheKey);
    if (cachedResponse) {
      AIHealth.recordCacheHit();
      // Inject trace IDs to cached response
      return {
        ...cachedResponse,
        metadata: { ...cachedResponse.metadata, requestId, correlationId, sessionId }
      };
    }
    AIHealth.recordCacheMiss();

    // 8. Assemble Prompt Template
    const memorySummary = session.memory.getSummary();
    const memoryMessagesText = session.memory.getMessages()
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = PromptBuilder.build(
      intent,
      sanitizedPrompt,
      context.outputs.analytics || { kpis: {}, risks: {} },
      executorResult.outputs,
      memorySummary,
      memoryMessagesText
    );

    // 9. Run LLM Provider through Rate Limiter & Circuit Breaker
    let activeProvider = this.provider;
    let resolvedModel: string | undefined = options?.modelOverride;

    // --- Cost Protection gate (§2) ---
    if (!CostProtection.isAllowed()) {
      console.warn('[AuraAIService] Monthly cost hard limit reached. Routing to MockProvider.');
      activeProvider = this.fallbackProvider;
      AIHealth.recordFallback();
    } else {
      // Auto-select model based on prompt complexity (§1)
      const modelSelection = ModelSelector.selectModel(prompt, options?.modelOverride);
      resolvedModel = modelSelection.model;

      // If cost is over soft threshold, force Flash tier (§2)
      if (CostProtection.shouldDowngradeToFlash()) {
        const config = AIConfiguration.getConfig();
        resolvedModel = config.fallbackModel;
      }
    }

    // Check Circuit Breaker state
    const circuitState = CircuitBreaker.getState();
    if (circuitState === 'Open') {
      console.warn("[AuraAIService] Circuit breaker is OPEN. Routing request to Fallback MockProvider.");
      activeProvider = this.fallbackProvider;
      AIHealth.recordFallback();
    }

    let llmOutput = "";
    const llmStart = performance.now();

    try {
      // Rate limiter protection (queue-backed)
      await ProviderRateLimiter.acquire();

      try {
        const config = AIConfiguration.getConfig();
        const timeoutLimit = config.timeoutMs;
        const generationPromise = activeProvider.generate(prompt, {
          modelOverride: resolvedModel,
          correlationId: correlationId,
          requestId:     requestId
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new TimeoutError("LLM Provider generation timed out")), timeoutLimit)
        );

        llmOutput = await Promise.race([generationPromise, timeoutPromise]);

        // Success: report to Circuit Breaker
        if (activeProvider === this.provider) {
          CircuitBreaker.recordSuccess();
        }
      } catch (err) {
        if (activeProvider === this.provider) {
          CircuitBreaker.recordFailure();
          AIHealth.recordFailure(err instanceof TimeoutError);
        }
        throw err;
      } finally {
        ProviderRateLimiter.release();
      }
    } catch (err) {
      // Rate limit or Provider failures trigger MockProvider fallback
      console.warn("[AuraAIService] Active provider failure. Falling back to MockProvider:", err);
      AIHealth.recordFallback();
      llmOutput = await this.fallbackProvider.generate(prompt, {
        modelOverride: options?.modelOverride
      });
    }

    const llmDuration = performance.now() - llmStart;

    // Track tokens
    const promptTokens = TokenBudgetManager.estimateTokens(prompt);
    const completionTokens = TokenBudgetManager.estimateTokens(llmOutput);
    AIHealth.recordRequest(promptTokens, completionTokens, llmDuration);
    // §2 – Record spend for cost protection
    CostProtection.record(promptTokens, completionTokens);

    // 10. Parse structured result
    let answerText = "";
    let confidenceVal = { level: 'Medium' as const, score: 0.75 };
    let reasoningList: string[] = [];
    let insightsList: string[] = [];
    let recommendationsList: string[] = [];
    let warningsList: string[] = [];
    let followUpList: string[] = [];
    let citationsList: string[] = [];

    try {
      const parsed = JSON.parse(llmOutput);
      answerText = parsed.answer || llmOutput;
      if (parsed.confidence) {
        confidenceVal = parsed.confidence;
      }
      reasoningList = parsed.reasoning || [];
      insightsList = parsed.insights || [];
      recommendationsList = parsed.recommendations || [];
      warningsList = parsed.warnings || [];
      followUpList = parsed.followUpQuestions || [];
      citationsList = parsed.citations || [];
    } catch (e) {
      answerText = llmOutput;
      insightsList = AIInsightEngine.generate(context.outputs.analytics || { kpis: {}, risks: {} });
      recommendationsList = AIRecommendationEngine.generate(context.outputs.analytics || { kpis: {}, risks: {} });
      citationsList = [...executorResult.toolsUsed];
    }

    const finalConfidence = ConfidenceEngine.evaluate(context.outputs.analytics || { kpis: {}, risks: {} });
    const finalReasoning = ExplainabilityEngine.compileReasoning(intent, executorResult.toolsUsed, executorResult.totalDurationMs);
    const assumptions = ExplainabilityEngine.getAssumptions(intent);

    const runwayNum = Number(context.outputs.analytics?.kpis?.runwayMonths) || 0;
    if (runwayNum < 3.0 && !warningsList.includes("Runway months is below safe 3-month threshold.")) {
      warningsList = [...warningsList, "Runway months is below safe 3-month threshold."];
    }

    const formattedAnswer = ResponseFormatter.format(answerText, options?.formattingStyle || 'Markdown');

    // 11. Compile final response
    const responseTime = performance.now() - startTime;
    const finalResponse: AuraResponse = {
      answer: formattedAnswer,
      confidence: finalConfidence,
      reasoning: [...finalReasoning, ...reasoningList],
      insights: insightsList.length > 0 ? insightsList : ["Reserve metrics stashed successfully."],
      recommendations: recommendationsList.length > 0 ? recommendationsList : ["Maintain budget limits."],
      warnings: warningsList,
      followUpQuestions: followUpList.length > 0 ? followUpList : ["How can I increase my runway?"],
      toolsUsed: executorResult.toolsUsed,
      citations: citationsList.length > 0 ? citationsList : ["AnalyticsContext", "FinancialMath"],
      metadata: {
        requestId,
        correlationId,
        sessionId,
        intent,
        compressedMemory: compressed,
        promptTokens,
        completionTokens,
        llmDurationMs: Number(llmDuration.toFixed(2)),
        toolDurationMs: Number(executorDuration.toFixed(2)),
        assumptions,
        providerUsed: activeProvider.id,
        circuitBreakerState: circuitState,
        capabilities: {
          streaming: activeProvider.supportsStreaming(),
          systemPrompts: activeProvider.supportsSystemPrompts(),
          vision: activeProvider.supportsVision(),
          toolCalling: activeProvider.supportsToolCalling()
        }
      },
      executionTimeMs: Number(responseTime.toFixed(2))
    };

    AICache.set(cacheKey, finalResponse);
    session.memory.addMessage('model', finalResponse.answer);

    return finalResponse;
  }
}
