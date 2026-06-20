import { GoogleGenAI } from '@google/genai';
import { LLMProvider, GenerationOptions } from './LLMProvider';
import { AIConfiguration } from '../AIConfiguration';

export class GeminiProvider implements LLMProvider {
  readonly id = 'gemini';
  private client: GoogleGenAI | null = null;

  constructor() {
    const isEnvAvailable = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined';
    const apiKey = (isEnvAvailable ? import.meta.env.GEMINI_API_KEY : process.env.GEMINI_API_KEY) || '';
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  async generate(prompt: string, options?: GenerationOptions): Promise<string> {
    if (!this.client) {
      throw new Error("Gemini API key is not configured. Configure GEMINI_API_KEY in environment variables.");
    }
    const config = AIConfiguration.getConfig();
    
    // Call the model matching the official SDK contract
    const response = await this.client.models.generateContent({
      model: config.modelName || 'gemini-2.0-flash',
      contents: prompt,
      config: {
        temperature: options?.temperature ?? config.temperature,
        maxOutputTokens: options?.maxTokens ?? config.tokenLimit
      }
    });

    return response.text || '';
  }
}
