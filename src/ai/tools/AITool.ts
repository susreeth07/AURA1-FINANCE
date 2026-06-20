export interface AITool {
  readonly id: string;
  readonly name: string;
  execute(userId: string, context: Record<string, any>, inputs?: Record<string, any>): Promise<Record<string, any>>;
}
