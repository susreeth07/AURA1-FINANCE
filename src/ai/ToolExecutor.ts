import { ToolRegistry } from './ToolRegistry';
import { ContextBuilder } from './ContextBuilder';

export interface ToolExecutorResult {
  readonly outputs: Record<string, any>;
  readonly toolsUsed: readonly string[];
  readonly totalDurationMs: number;
}

export class ToolExecutor {
  static async execute(
    userId: string,
    steps: readonly string[],
    inputs?: Record<string, any>
  ): Promise<ToolExecutorResult> {
    const startTime = performance.now();
    const outputs: Record<string, any> = {};
    const toolsUsed: string[] = [];

    // 1. Build optimized context payload
    const context = await ContextBuilder.build(userId);

    // 2. Parallel execute registered tools using Promise.all
    const toolRuns = steps.map(async (stepId) => {
      const tool = ToolRegistry.getTool(stepId);
      if (!tool) {
        return;
      }

      toolsUsed.push(stepId);
      
      // Execute tool with timeout guard (2000ms)
      const executeWithTimeout = async (): Promise<Record<string, any>> => {
        return new Promise<Record<string, any>>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error(`Tool ${stepId} execution timed out`)), 2000);
          
          tool.execute(userId, context, inputs?.[stepId] || inputs)
            .then((res) => {
              clearTimeout(timer);
              resolve(res);
            })
            .catch((err) => {
              clearTimeout(timer);
              reject(err);
            });
        });
      };

      // Simple retry wrapper (up to 2 attempts)
      let attempt = 0;
      const maxAttempts = 2;
      while (attempt < maxAttempts) {
        try {
          const result = await executeWithTimeout();
          outputs[stepId] = result;
          return;
        } catch (err) {
          attempt++;
          if (attempt >= maxAttempts) {
            console.error(`[ToolExecutor] Tool ${stepId} failed all attempts:`, err);
            outputs[stepId] = { error: (err as Error).message };
          }
        }
      }
    });

    await Promise.all(toolRuns);

    const totalDurationMs = performance.now() - startTime;
    return {
      outputs,
      toolsUsed,
      totalDurationMs
    };
  }
}
