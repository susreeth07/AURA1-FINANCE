/**
 * LLMProvider – core provider abstraction for the Aura AI platform.
 *
 * All providers (Gemini, Mock, and future providers) implement this interface.
 * AuraAIService must depend only on LLMProvider – never on concrete classes.
 */

// ---------------------------------------------------------------------------
// Generation options
// ---------------------------------------------------------------------------

export interface GenerationOptions {
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly stopSequences?: readonly string[];
  readonly topP?: number;
  readonly modelOverride?: string;
  /** Forward correlation metadata to provider adapters for logging. */
  readonly correlationId?: string;
  readonly requestId?: string;
}

// ---------------------------------------------------------------------------
// Tool-calling extension points (§5 – Future Tool Calling Support)
//
// The interfaces below are designed so future providers can implement native
// function-calling without requiring any changes in AuraAIService.
// ---------------------------------------------------------------------------

/** Describes a single function a provider may invoke on behalf of the LLM. */
export interface ToolDefinition {
  /** Unique name used as the function identifier by the LLM. */
  readonly name: string;
  /** Human-readable description the LLM uses to decide when to call it. */
  readonly description: string;
  /**
   * JSON Schema object describing the expected parameters.
   * Kept as `unknown` so callers are not forced to pull in a JSON-Schema
   * library – cast to the schema type in the provider implementation.
   */
  readonly parametersSchema: unknown;
}

/** A single tool invocation request emitted by the LLM. */
export interface ToolCall {
  readonly callId: string;
  readonly toolName: string;
  readonly arguments: Record<string, unknown>;
}

/** The result returned to the LLM after executing a tool call. */
export interface ToolCallResult {
  readonly callId: string;
  readonly toolName: string;
  readonly output: unknown;
  readonly errorMessage?: string;
}

/**
 * Providers that support native LLM tool / function calling implement this
 * interface IN ADDITION TO LLMProvider.
 *
 * AuraAIService checks `supportsToolCalling()` before attempting to cast.
 */
export interface ToolCallingProvider {
  /**
   * Generates a response that may contain zero or more tool call requests.
   * Returns both the assistant text and the requested calls (if any).
   */
  generateWithTools(
    prompt: string,
    tools: readonly ToolDefinition[],
    options?: GenerationOptions
  ): Promise<{ text: string; toolCalls: readonly ToolCall[] }>;

  /**
   * Continues a conversation after tool results have been gathered.
   * The provider must incorporate the results and produce a final answer.
   */
  continueWithToolResults(
    originalPrompt: string,
    toolResults: readonly ToolCallResult[],
    options?: GenerationOptions
  ): Promise<string>;
}

// ---------------------------------------------------------------------------
// Core provider interface
// ---------------------------------------------------------------------------

export interface LLMProvider {
  /** Stable identifier for this provider (e.g. 'gemini', 'mock'). */
  readonly id: string;

  /** Primary generation call. Returns the full text response. */
  generate(prompt: string, options?: GenerationOptions): Promise<string>;

  // ------------------------------------------------------------------
  // Capability detection – called before each request so AuraAIService
  // can route intelligently without modifying provider code.
  // ------------------------------------------------------------------

  /** True when the provider supports streaming chunk delivery. */
  supportsStreaming(): boolean;

  /** True when the provider honours a system prompt / instruction preamble. */
  supportsSystemPrompts(): boolean;

  /** True when the provider can process image inputs. */
  supportsVision(): boolean;

  /**
   * True when the provider supports native function / tool calling.
   * If true, the provider must also implement ToolCallingProvider.
   */
  supportsToolCalling(): boolean;
}
