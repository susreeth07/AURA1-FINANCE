import { GenerationOptions } from './LLMProvider';

export interface ChunkEnvelope {
  readonly chunk: string;
  readonly metadata?: {
    readonly tokenCount: number;
    readonly done: boolean;
  };
}

export interface StreamingProvider {
  generateStream(prompt: string, options?: GenerationOptions): Promise<AsyncIterable<ChunkEnvelope>>;
}
