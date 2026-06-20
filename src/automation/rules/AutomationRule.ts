import { AutomationContext } from '../AutomationContext';
import { RuleResult } from './RuleResult';

export interface AutomationRule {
  readonly id: string;
  readonly name: string;
  readonly priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'BACKGROUND';
  readonly cooldownDuration: number; // Cooldown duration in milliseconds
  readonly dependencies: readonly string[];
  
  /**
   * Determine if the rule's criteria match the current event trigger.
   */
  shouldRun(context: AutomationContext): boolean;
  
  /**
   * Evaluate the business logic of the rule and return a standardized result.
   */
  evaluate(context: AutomationContext): Promise<RuleResult>;
}
