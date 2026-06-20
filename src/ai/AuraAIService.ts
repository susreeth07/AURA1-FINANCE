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

export class AuraAIService {
  private provider: LLMProvider;

  constructor(providerOverride?: LLMProvider) {
    if (providerOverride) {
      this.provider = providerOverride;
    } else {
      // Choose provider based on environment profile
      const isEnvAvailable = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined';
      const apiKey = (isEnvAvailable ? import.meta.env.GEMINI_API_KEY : process.env.GEMINI_API_KEY) || '';
      
      if (apiKey) {
        this.provider = new GeminiProvider();
      } else {
        this.provider = new MockProvider();
      }
    }
  }

  async processQuery(
    userId: string,
    query: string,
    options?: {
      readonly conversationId?: string;
      readonly sessionId?: string;
      readonly formattingStyle?: FormattingStyle;
      readonly providerId?: 'gemini' | 'mock';
    }
  ): Promise<AuraResponse> {
    const startTime = performance.now();

    // 1. Check Guardrails
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
        metadata: { guardrailBlocked: true },
        executionTimeMs: performance.now() - startTime
      };
    }

    const sanitizedPrompt = guardrailResult.sanitizedPrompt;

    // 2. Classify Intent
    const intent = IntentClassifier.classify(sanitizedPrompt);

    // 3. Resolve Session Memory
    const session = ConversationManager.getOrCreateSession(userId, options?.conversationId, options?.sessionId);
    session.memory.addMessage('user', sanitizedPrompt);

    // 4. Enforce Token Budgets (Auto-summarize if warning threshold hit)
    const compressed = await session.memory.enforceBudget(this.provider);
    if (compressed) {
      AIHealth.recordCompression();
    }

    // 5. Execute Plan & Run Tools
    const plan = AIPlanner.buildPlan(intent, sanitizedPrompt);
    const executorStart = performance.now();
    const executorResult = await ToolExecutor.execute(userId, plan.steps);
    const executorDuration = performance.now() - executorStart;
    
    AIHealth.recordToolExecution(executorDuration);

    // 6. Caching layer lookup
    const context = await ToolExecutor.execute(userId, ['analytics']); // Load core context details for key generation
    const cacheKey = AICache.generateKey({
      userId,
      prompt: sanitizedPrompt,
      contextVersion: context.outputs.analytics?.healthStatus?.status || '1.0',
      conversationStateHash: session.memory.getSummary() + session.memory.getMessages().length
    });

    const cachedResponse = AICache.get(cacheKey);
    if (cachedResponse) {
      AIHealth.recordCacheHit();
      return cachedResponse;
    }
    AIHealth.recordCacheMiss();

    // 7. Assemble Prompt Envelope
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

    // 8. Run LLM generation
    const llmStart = performance.now();
    let llmOutput = "";
    try {
      llmOutput = await this.provider.generate(prompt);
    } catch (err) {
      console.warn("[AuraAIService] Provider failed generation. Falling back to MockProvider.", err);
      AIHealth.recordFallback();
      const fallback = new MockProvider();
      llmOutput = await fallback.generate(prompt);
    }
    const llmDuration = performance.now() - llmStart;

    // Track tokens
    const promptTokens = TokenBudgetManager.estimateTokens(prompt);
    const completionTokens = TokenBudgetManager.estimateTokens(llmOutput);
    AIHealth.recordRequest(promptTokens, completionTokens, llmDuration);

    // 9. Parse and Extract Structured Fields
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
      // JSON parsing failed, LLM returned plain text. Parse fields deterministically.
      answerText = llmOutput;
      insightsList = AIInsightEngine.generate(context.outputs.analytics || { kpis: {}, risks: {} });
      recommendationsList = AIRecommendationEngine.generate(context.outputs.analytics || { kpis: {}, risks: {} });
      citationsList = [...executorResult.toolsUsed];
    }

    // 10. Augment with Deterministic Calculations & Metadata
    const finalConfidence = ConfidenceEngine.evaluate(context.outputs.analytics || { kpis: {}, risks: {} });
    const finalReasoning = ExplainabilityEngine.compileReasoning(intent, executorResult.toolsUsed, executorResult.totalDurationMs);
    const assumptions = ExplainabilityEngine.getAssumptions(intent);

    // Add warnings if runway is critical
    const runwayNum = Number(context.outputs.analytics?.kpis?.runwayMonths) || 0;
    if (runwayNum < 3.0 && !warningsList.includes("Runway months is below safe 3-month threshold.")) {
      warningsList = [...warningsList, "Runway months is below safe 3-month threshold."];
    }

    // Formatter
    const formattedAnswer = ResponseFormatter.format(answerText, options?.formattingStyle || 'Markdown');

    // 11. Compile AuraResponse
    const responseTime = performance.now() - startTime;
    const finalResponse: AuraResponse = {
      answer: formattedAnswer,
      confidence: finalConfidence,
      reasoning: [...finalReasoning, ...reasoningList],
      insights: insightsList.length > 0 ? insightsList : ["Reserve metrics stashed successfully."],
      recommendations: recommendationsList.length > 0 ? recommendationsList : ["Maintain budget limits."],
      warnings: warningsList,
      followUpQuestions: followUpList.length > 0 ? followUpList : ["How can I increase my runway?", "Adjust budget limits."],
      toolsUsed: executorResult.toolsUsed,
      citations: citationsList.length > 0 ? citationsList : ["AnalyticsContext", "FinancialMath"],
      metadata: {
        intent,
        compressedMemory: compressed,
        promptTokens,
        completionTokens,
        llmDurationMs: Number(llmDuration.toFixed(2)),
        toolDurationMs: Number(executorDuration.toFixed(2)),
        assumptions
      },
      executionTimeMs: Number(responseTime.toFixed(2))
    };

    // Save to cache & memory
    AICache.set(cacheKey, finalResponse);
    session.memory.addMessage('model', finalResponse.answer);

    return finalResponse;
  }
}
