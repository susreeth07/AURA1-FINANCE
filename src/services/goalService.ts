import { savingsGoalRepository } from '../repositories/savingsGoalRepository';
import { SavingsGoal } from '../types';
import { retryWithBackoff } from '../utils/retry';
import { validators } from '../utils/validation';
import { logger } from '../utils/logger';

export const goalService = {
  /**
   * Validates savings goal parameters.
   */
  validateGoal(data: Partial<SavingsGoal>): Record<string, string> {
    const errors: Record<string, string> = {};

    if (data.name !== undefined) {
      const err = validators.requiredString(data.name, 'Goal Name');
      if (err) errors.name = err;
    }

    if (data.targetAmount !== undefined) {
      const err = validators.positiveAmount(data.targetAmount, 'Target Amount');
      if (err) errors.targetAmount = err;
    }

    if (data.targetDate !== undefined) {
      const err = validators.validDate(data.targetDate, 'Target Date');
      if (err) errors.targetDate = err;
    }

    return errors;
  },

  /**
   * Fetch all savings goals for a user with retry.
   */
  async fetchGoals(userId: string): Promise<SavingsGoal[]> {
    return retryWithBackoff(() =>
      savingsGoalRepository.fetchSavingsGoals(userId)
    );
  },

  /**
   * Create a new savings goal with validation and retry.
   */
  async createGoal(
    userId: string,
    goal: Omit<SavingsGoal, 'id'> & { id?: string }
  ): Promise<SavingsGoal> {
    const errors = this.validateGoal(goal);
    if (Object.keys(errors).length > 0) {
      const errorMsg = Object.values(errors).join(' ');
      throw new Error(`Validation Error: ${errorMsg}`);
    }

    const result = await retryWithBackoff(() =>
      savingsGoalRepository.insertSavingsGoal(userId, goal)
    );
    logger.debug(`[GoalService] Goal created: ${result.name} (₹${result.targetAmount})`);
    return result;
  },

  /**
   * Fund a savings goal (add amount to current).
   * Uses repository's atomic fundGoal which also fires domain events.
   */
  async fundGoal(
    userId: string,
    goalId: string,
    amount: number
  ): Promise<SavingsGoal> {
    if (!amount || amount <= 0) {
      throw new Error('Fund amount must be a positive number.');
    }

    const result = await retryWithBackoff(() =>
      savingsGoalRepository.fundGoal(userId, goalId, amount)
    );
    logger.debug(`[GoalService] Goal funded: ${goalId} +₹${amount} → total ₹${result.currentAmount}`);
    return result;
  },

  /**
   * Delete a savings goal with retry.
   */
  async deleteGoal(userId: string, id: string): Promise<void> {
    await retryWithBackoff(() => savingsGoalRepository.delete(userId, id));
    logger.debug(`[GoalService] Goal deleted: ${id}`);
  }
};
