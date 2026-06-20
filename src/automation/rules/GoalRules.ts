import { AutomationRule } from './AutomationRule';
import { AutomationContext } from '../AutomationContext';
import { RuleResult } from './RuleResult';

export class GoalRules implements AutomationRule {
  readonly id = 'goal-rules';
  readonly name = 'Savings Goal Achievements';
  readonly priority = 'MEDIUM';
  readonly cooldownDuration = 12 * 60 * 60 * 1000; // 12 hours
  readonly dependencies = [];

  shouldRun(context: AutomationContext): boolean {
    const eventType = context.event.eventType;
    return eventType === 'GoalFunded' || eventType === 'GoalCompleted';
  }

  async evaluate(context: AutomationContext): Promise<RuleResult> {
    const start = performance.now();
    const snapshot = context.snapshot;
    const actions: any[] = [];
    let success = false;
    let reason = 'Savings goals are in progress.';
    let recommendation = 'Continue saving towards your active milestones.';

    const completedGoals: string[] = [];
    const milestoneGoals: string[] = [];

    for (const goal of snapshot.savingsGoals) {
      if (goal.targetAmount.isZero()) continue;

      const current = goal.currentAmount;
      const target = goal.targetAmount;
      const percentage = Number((current.cents * 100n) / target.cents);

      if (percentage >= 100) {
        success = true;
        completedGoals.push(goal.name);
        actions.push({
          type: 'send_notification',
          category: 'achievement',
          priority: 'HIGH',
          title: 'Goal Completed! 🎉',
          message: `Congratulations! You have fully funded your "${goal.name}" savings target of ${target.format()}!`,
          actionLabel: 'View Savings Goals',
          actionRoute: '/goals',
          metadata: {
            goalId: goal.id,
            name: goal.name,
            percentage: 100,
            current: current.toDecimal(),
            target: target.toDecimal()
          }
        });
      } else if (percentage === 50 || percentage === 75) {
        success = true;
        milestoneGoals.push(`${goal.name} (${percentage}%)`);
        actions.push({
          type: 'send_notification',
          category: 'goal',
          priority: 'MEDIUM',
          title: 'Savings Milestone Reached! 🚀',
          message: `Nice progress! Your "${goal.name}" savings goal is now ${percentage}% funded (${current.format()} of ${target.format()}).`,
          actionLabel: 'View Savings Goals',
          actionRoute: '/goals',
          metadata: {
            goalId: goal.id,
            name: goal.name,
            percentage,
            current: current.toDecimal(),
            target: target.toDecimal()
          }
        });
      }
    }

    if (completedGoals.length > 0) {
      reason = `Completed goals: ${completedGoals.join(', ')}.`;
      recommendation = 'Great work! You can start a new savings target or fund existing goals faster.';
    } else if (milestoneGoals.length > 0) {
      reason = `Significant progress on: ${milestoneGoals.join(', ')}.`;
      recommendation = 'Keep setting aside money regularly to complete your savings goals.';
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
        totalGoalsChecked: snapshot.savingsGoals.length,
        completedCount: completedGoals.length,
        milestoneCount: milestoneGoals.length
      },
      actions,
      timestamp: new Date()
    };
  }
}
