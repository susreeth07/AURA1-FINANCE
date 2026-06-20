import { budgetRepository } from '../repositories/budgetRepository';
import { BudgetItem } from '../types';
import { retryWithBackoff } from '../utils/retry';
import { validators } from '../utils/validation';
import { logger } from '../utils/logger';

export const budgetService = {
  /**
   * Validates budget parameters.
   */
  validateBudget(data: Partial<BudgetItem>): Record<string, string> {
    const errors: Record<string, string> = {};

    if (data.category !== undefined) {
      const err = validators.requiredString(data.category, 'Category');
      if (err) errors.category = err;
    }

    if (data.limit !== undefined) {
      const err = validators.positiveAmount(data.limit, 'Budget Limit');
      if (err) errors.limit = err;
    }

    if (data.alertThreshold !== undefined) {
      if (data.alertThreshold < 1 || data.alertThreshold > 100) {
        errors.alertThreshold = 'Alert threshold must be between 1 and 100.';
      }
    }

    return errors;
  },

  /**
   * Fetch all budgets for a user with retry.
   */
  async fetchBudgets(userId: string): Promise<BudgetItem[]> {
    return retryWithBackoff(() => budgetRepository.fetchBudgets(userId));
  },

  /**
   * Create a new budget with validation and retry.
   */
  async createBudget(
    userId: string,
    budget: Omit<BudgetItem, 'id'> & { id?: string }
  ): Promise<BudgetItem> {
    const errors = this.validateBudget(budget);
    if (Object.keys(errors).length > 0) {
      const errorMsg = Object.values(errors).join(' ');
      throw new Error(`Validation Error: ${errorMsg}`);
    }

    const result = await retryWithBackoff(() =>
      budgetRepository.insertBudget(userId, budget)
    );
    logger.debug(`[BudgetService] Budget created for category: ${result.category}`);
    return result;
  },

  /**
   * Update an existing budget's limit with retry.
   */
  async updateBudget(
    userId: string,
    id: string,
    limit: number
  ): Promise<BudgetItem> {
    const errors = this.validateBudget({ limit });
    if (Object.keys(errors).length > 0) {
      const errorMsg = Object.values(errors).join(' ');
      throw new Error(`Validation Error: ${errorMsg}`);
    }

    const result = await retryWithBackoff(() =>
      budgetRepository.updateBudgetLimit(userId, id, limit)
    );
    logger.debug(`[BudgetService] Budget updated: ${id} → limit ₹${limit}`);
    return result;
  },

  /**
   * Delete a budget with retry.
   */
  async deleteBudget(userId: string, id: string): Promise<void> {
    await retryWithBackoff(() => budgetRepository.delete(userId, id));
    logger.debug(`[BudgetService] Budget deleted: ${id}`);
  }
};
