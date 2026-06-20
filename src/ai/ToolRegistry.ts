import { AITool } from './tools/AITool';

export class ToolRegistry {
  private static tools = new Map<string, AITool>();

  static register(tool: AITool): void {
    this.tools.set(tool.id, tool);
  }

  static getTool(id: string): AITool | null {
    return this.tools.get(id) || null;
  }

  static getTools(): AITool[] {
    return Array.from(this.tools.values());
  }

  static clear(): void {
    this.tools.clear();
  }
}
