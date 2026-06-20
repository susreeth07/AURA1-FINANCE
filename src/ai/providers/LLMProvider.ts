export interface GenerationOptions {
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly stopSequences?: readonly string[];
}

export interface LLMProvider {
  readonly id: string;
  generate(prompt: string, options?: GenerationOptions): Promise<string>;
}
