import { IntentType } from './IntentClassifier';

export interface ExecutionPlan {
  readonly steps: readonly string[];
}

export class AIPlanner {
  static buildPlan(intent: IntentType, query: string): ExecutionPlan {
    const text = query.toLowerCase();
    const steps: string[] = [];

    // Check for buy/afford keyword simulation triggers
    const isSimulationQuery = text.includes('afford') || text.includes('buy') || text.includes('simulation') || text.includes('purchase');

    switch (intent) {
      case 'Greeting':
        break;
      
      case 'Forecast':
        steps.push('forecast', 'cashflow');
        break;

      case 'Budget':
        steps.push('budget', 'trend');
        break;

      case 'Expense':
        steps.push('trend', 'budget');
        break;

      case 'Income':
        steps.push('cashflow', 'recommendation');
        break;

      case 'Goal':
        steps.push('goal', 'health');
        break;

      case 'Recommendation':
        steps.push('recommendation', 'health');
        break;

      case 'Investment':
        steps.push('recommendation', 'trend');
        break;

      case 'Savings':
        steps.push('health', 'trend');
        break;

      case 'Cash Flow':
        steps.push('cashflow', 'trend');
        break;

      case 'Automation':
        steps.push('automation', 'recommendation');
        break;

      case 'General Finance':
        steps.push('analytics', 'health');
        break;

      case 'Unknown':
      default:
        steps.push('analytics', 'health');
        break;
    }

    if (isSimulationQuery) {
      steps.push('simulation');
    }

    // Merge duplicates and maintain order
    const uniqueSteps = Array.from(new Set(steps));

    // Logical dependency sorting: running forecasting or budgets before simulations
    const orderedSteps: string[] = [];
    const orderedPriority = ['analytics', 'health', 'trend', 'cashflow', 'budget', 'goal', 'forecast', 'automation', 'recommendation', 'simulation'];
    
    for (const key of orderedPriority) {
      if (uniqueSteps.includes(key)) {
        orderedSteps.push(key);
      }
    }

    // Add any remaining steps that are not in the predefined priority
    for (const s of uniqueSteps) {
      if (!orderedSteps.includes(s)) {
        orderedSteps.push(s);
      }
    }

    return {
      steps: orderedSteps
    };
  }
}
