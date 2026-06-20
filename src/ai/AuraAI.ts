import { AuraAIService } from './AuraAIService';
import { AuraResponse } from './models/AuraResponse';
import { AIConfiguration } from './AIConfiguration';
import { AIHealth, AIHealthReport } from './AIHealth';
import { ToolRegistry } from './ToolRegistry';
import { ConversationManager } from './ConversationManager';
import { AICache } from './AICache';
import { FormattingStyle } from './ResponseFormatter';
import { LLMProvider } from './providers/LLMProvider';

// Tools Imports
import { AnalyticsTool } from './tools/AnalyticsTool';
import { AutomationTool } from './tools/AutomationTool';
import { BudgetTool } from './tools/BudgetTool';
import { CashFlowTool } from './tools/CashFlowTool';
import { ForecastTool } from './tools/ForecastTool';
import { GoalTool } from './tools/GoalTool';
import { HealthTool } from './tools/HealthTool';
import { RecommendationTool } from './tools/RecommendationTool';
import { SimulationTool } from './tools/SimulationTool';
import { TrendTool } from './tools/TrendTool';

export class AuraAI {
  private static service: AuraAIService | null = null;
  private static initialized = false;

  static initialize(
    profile: 'development' | 'testing' | 'production' = 'production',
    providerOverride?: LLMProvider
  ): void {
    if (AuraAI.initialized) {
      return;
    }

    AIConfiguration.setProfile(profile);

    // Register tools in registry
    ToolRegistry.register(new AnalyticsTool());
    ToolRegistry.register(new AutomationTool());
    ToolRegistry.register(new BudgetTool());
    ToolRegistry.register(new CashFlowTool());
    ToolRegistry.register(new ForecastTool());
    ToolRegistry.register(new GoalTool());
    ToolRegistry.register(new HealthTool());
    ToolRegistry.register(new RecommendationTool());
    ToolRegistry.register(new SimulationTool());
    ToolRegistry.register(new TrendTool());

    AuraAI.service = new AuraAIService(providerOverride);
    AuraAI.initialized = true;

    console.log(`[AuraAI] Facade client initialized successfully under profile: ${profile}`);
  }

  static async query(
    userId: string,
    text: string,
    options?: {
      readonly conversationId?: string;
      readonly sessionId?: string;
      readonly formattingStyle?: FormattingStyle;
      readonly correlationId?: string;
      readonly modelOverride?: string;
    }
  ): Promise<AuraResponse> {
    if (!AuraAI.initialized) {
      AuraAI.initialize();
    }

    if (!AuraAI.service) {
      throw new Error("[AuraAI] AuraAIService is not initialized.");
    }

    return AuraAI.service.processQuery(userId, text, options);
  }

  static getHealthDiagnostics(): AIHealthReport {
    return AIHealth.getReport();
  }

  static clearSessions(): void {
    ConversationManager.clear();
    AICache.clear();
    AIHealth.clear();
  }

  static shutdown(): void {
    AuraAI.clearSessions();
    ToolRegistry.clear();
    AuraAI.service = null;
    AuraAI.initialized = false;
    console.log('[AuraAI] Facade client shut down.');
  }
}
