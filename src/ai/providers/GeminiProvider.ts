import { GoogleGenAI } from '@google/genai';
import { LLMProvider, GenerationOptions, ToolCallingProvider, ToolDefinition, ToolCall, ToolCallResult } from './LLMProvider';
import { StreamingProvider, ChunkEnvelope } from './StreamingProvider';
import { AIConfiguration } from '../AIConfiguration';
import { ModelSelector } from './ModelSelector';
import {
  InvalidApiKeyError,
  QuotaExceededError,
  RateLimitError,
  ProviderUnavailableError,
  StreamingError,
  ProviderConfigurationError
} from './ProviderErrors';

/**
 * GeminiProvider – production adapter for the Google Gemini SDK.
 *
 * Features:
 *   1. Model auto-selection  (§1) – delegates to ModelSelector
 *   2. Retry failover chain  (§4) – retry → fallback model → throw
 *   3. Streaming             – generateStream via generateContentStream
 *   4. Tool-calling stubs    (§5) – ToolCallingProvider implemented for future use
 *   5. Structured errors     – all SDK errors mapped to typed ProviderErrors
 */
export class GeminiProvider implements LLMProvider, StreamingProvider, ToolCallingProvider {
  readonly id = 'gemini';
  private client: GoogleGenAI | null = null;

  constructor() {
    const isEnvAvailable =
      typeof import.meta !== 'undefined' &&
      typeof import.meta.env !== 'undefined';
    const apiKey =
      (isEnvAvailable ? import.meta.env.VITE_GEMINI_API_KEY : process.env.VITE_GEMINI_API_KEY) || '';
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  // ------------------------------------------------------------------ capability

  supportsStreaming(): boolean     { return true; }
  supportsSystemPrompts(): boolean { return true; }
  supportsVision(): boolean        { return false; }
  supportsToolCalling(): boolean   { return true; }

  // ------------------------------------------------------------------ error mapping

  private mapError(err: unknown): Error {
    const e = err as any;
    const status = e?.status || e?.statusCode || 0;
    const msg    = e?.message || String(err);

    if (status === 401 || status === 403 || msg.includes('API key') || msg.includes('unauthorized')) {
      return new InvalidApiKeyError('Gemini API access denied: Invalid API key.');
    }
    if (status === 429 || msg.includes('quota') || msg.includes('exhausted')) {
      return new QuotaExceededError('Gemini API quota exceeded or rate limit hit.');
    }
    if (msg.includes('rate limit')) {
      return new RateLimitError('Gemini API rate limit reached. Throttling active.');
    }
    if (status >= 500 || msg.includes('unavailable') || msg.includes('network')) {
      return new ProviderUnavailableError('Gemini API provider is currently unavailable.');
    }
    return err instanceof Error ? err : new Error(msg);
  }

  // ------------------------------------------------------------------ generate (with retry chain)

  /**
   * Attempts generation on `model`.  On failure, retries up to `maxRetries`
   * times with exponential back-off, then tries the `fallbackModel` once,
   * then throws.
   */
  async generate(prompt: string, options?: GenerationOptions): Promise<string> {
    if (!this.client) {
      throw new InvalidApiKeyError('Gemini API key is not configured in VITE_GEMINI_API_KEY.');
    }

    const config = AIConfiguration.getConfig();

    // Auto-select model unless overridden
    const selection = ModelSelector.selectModel(prompt, options?.modelOverride);
    const primaryModel  = selection.model;
    const fallbackModel = config.fallbackModel !== primaryModel
      ? config.fallbackModel
      : config.experimentalModel;

    let lastError: Error = new ProviderUnavailableError('Unknown generation error.');

    // --- Attempt: primaryModel × (1 + maxRetries) ---
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await this.callGenerate(primaryModel, prompt, options);
      } catch (err) {
        lastError = this.mapError(err);
        if (attempt < config.maxRetries) {
          // Exponential back-off between retries (skip in tests)
          if (config.loggingVerbosity !== 'silent') {
            console.warn(`[GeminiProvider] Attempt ${attempt + 1} failed. Retrying in ${50 * 2 ** attempt}ms…`);
          }
          await new Promise(r => setTimeout(r, 50 * Math.pow(2, attempt)));
        }
      }
    }

    // --- Fallback model attempt (once) ---
    if (fallbackModel !== primaryModel) {
      try {
        if (config.loggingVerbosity !== 'silent') {
          console.warn(`[GeminiProvider] All retries exhausted on ${primaryModel}. Trying fallback model: ${fallbackModel}.`);
        }
        return await this.callGenerate(fallbackModel, prompt, options);
      } catch (err) {
        lastError = this.mapError(err);
      }
    }

    throw lastError;
  }

  /** Low-level SDK call for a specific model. */
  private async callGenerate(model: string, prompt: string, options?: GenerationOptions): Promise<string> {
    const config = AIConfiguration.getConfig();
    const response = await this.client!.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature:     options?.temperature    ?? config.temperature,
        topP:            options?.topP           ?? config.topP,
        maxOutputTokens: options?.maxTokens      ?? config.tokenLimit,
        safetySettings:  config.safetySettings as any[]
      }
    });
    return response.text || '';
  }

  // ------------------------------------------------------------------ streaming

  async generateStream(prompt: string, options?: GenerationOptions): Promise<AsyncIterable<ChunkEnvelope>> {
    if (!this.client) {
      throw new InvalidApiKeyError('Gemini API key is not configured in VITE_GEMINI_API_KEY.');
    }

    const config   = AIConfiguration.getConfig();
    const selection = ModelSelector.selectModel(prompt, options?.modelOverride);
    const model    = selection.model;

    try {
      const responseStream = await this.client.models.generateContentStream({
        model,
        contents: prompt,
        config: {
          temperature:     options?.temperature    ?? config.temperature,
          topP:            options?.topP           ?? config.topP,
          maxOutputTokens: options?.maxTokens      ?? config.tokenLimit,
          safetySettings:  config.safetySettings as any[]
        }
      });

      return {
        [Symbol.asyncIterator]() {
          const iterator = responseStream[Symbol.asyncIterator]();
          return {
            async next() {
              try {
                const { done, value } = await iterator.next();
                if (done) return { done: true, value: undefined };

                const chunkText = value.text || '';
                return {
                  done: false,
                  value: {
                    chunk: chunkText,
                    metadata: {
                      tokenCount: Math.ceil(chunkText.length / 4),
                      done: false
                    }
                  }
                };
              } catch (err) {
                throw new StreamingError(`Gemini chunk streaming failure: ${(err as Error).message}`);
              }
            }
          };
        }
      };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  // ------------------------------------------------------------------ Tool Calling (§5 – future)

  /**
   * Extension point: native Gemini function calling.
   * Stub implementation – returns empty toolCalls until Gemini tool-calling
   * is wired to the ToolRegistry. AuraAIService checks supportsToolCalling()
   * before casting to ToolCallingProvider.
   */
  async generateWithTools(
    prompt: string,
    tools: readonly ToolDefinition[],
    options?: GenerationOptions
  ): Promise<{ text: string; toolCalls: readonly ToolCall[] }> {
    if (!this.client) {
      throw new InvalidApiKeyError('Gemini API key is not configured in VITE_GEMINI_API_KEY.');
    }
    // TODO: pass `tools` as function declarations when Gemini tool-calling
    // is integrated with the ToolRegistry.  For now generate normally.
    const text = await this.generate(prompt, options);
    return { text, toolCalls: [] };
  }

  async continueWithToolResults(
    originalPrompt: string,
    toolResults: readonly ToolCallResult[],
    options?: GenerationOptions
  ): Promise<string> {
    if (!this.client) {
      throw new InvalidApiKeyError('Gemini API key is not configured in VITE_GEMINI_API_KEY.');
    }
    // TODO: send tool results back to Gemini in a multi-turn conversation.
    // For now, append results as context and call generate.
    const resultsText = toolResults
      .map(r => `Tool "${r.toolName}" returned: ${JSON.stringify(r.output)}`)
      .join('\n');
    return this.generate(`${originalPrompt}\n\n${resultsText}`, options);
  }
}
