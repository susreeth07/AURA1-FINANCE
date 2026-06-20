import { AutomationRule } from './AutomationRule';
import { AutomationContext } from '../AutomationContext';
import { RuleResult } from './RuleResult';
import { Money } from '../../domain/finance/Money';

export class EmergencyRules implements AutomationRule {
  readonly id = 'emergency-rules';
  readonly name = 'Emergency Fund Runway Checks';
  readonly priority = 'CRITICAL';
  readonly cooldownDuration = 24 * 60 * 60 * 1000; // 24 hours
  readonly dependencies = [];

  shouldRun(context: AutomationContext): boolean {
    const eventType = context.event.eventType;
    return eventType === 'ProfileUpdated' || eventType === 'IncomeAdded' || eventType === 'ExpenseAdded';
  }

  async evaluate(context: AutomationContext): Promise<RuleResult> {
    const start = performance.now();
    const snapshot = context.snapshot;
    const actions: any[] = [];
    let success = false;
    let reason = 'Emergency fund reserves are fully funded and stable.';
    let recommendation = 'Your liquid reserve exceeds the 3-month survival buffer.';

    const profile = snapshot.profile;
    const currency = profile.currentSavings.getCurrency();

    const rent = profile.rent || Money.zero(currency);
    const fixed = profile.fixedExpenses || Money.zero(currency);
    const bills = profile.monthlyBills || Money.zero(currency);
    const emi = profile.emiLoans || Money.zero(currency);

    const monthlyCommitments = rent.add(fixed).add(bills).add(emi);
    const targetFund = monthlyCommitments.multiply(3n); // 3-month survival buffer
    const currentSavings = profile.currentSavings;

    if (!targetFund.isZero() && currentSavings.lessThan(targetFund)) {
      success = true;
      const deficit = targetFund.subtract(currentSavings);
      reason = `Emergency fund deficit: Current savings of ${currentSavings.format()} is below the recommended 3-month commitment reserve (${targetFund.format()}).`;
      recommendation = `Consider saving an additional ${deficit.format()} or allocating salary buffers to secure your emergency reserve.`;
      
      actions.push({
        type: 'send_notification',
        category: 'warning',
        priority: 'CRITICAL',
        title: 'Emergency Reserve Low! ⚠️',
        message: `Your emergency reserves of ${currentSavings.format()} are below the recommended 3-month runway of ${targetFund.format()}. Deficit: ${deficit.format()}.`,
        actionLabel: 'Adjust Target',
        actionRoute: '/profile',
        metadata: {
          currentSavings: currentSavings.toDecimal(),
          targetRunway: targetFund.toDecimal(),
          monthlyCommitments: monthlyCommitments.toDecimal(),
          deficit: deficit.toDecimal()
        }
      });
    }

    const duration = performance.now() - start;

    return {
      ruleId: this.id,
      ruleName: this.name,
      version: '1.0',
      success,
      priority: this.priority,
      duration,
      confidence: 100,
      reason,
      recommendation,
      metrics: {
        currentSavings: currentSavings.toDecimal(),
        targetFund: targetFund.toDecimal(),
        monthlyCommitments: monthlyCommitments.toDecimal()
      },
      actions,
      timestamp: new Date()
    };
  }
}
