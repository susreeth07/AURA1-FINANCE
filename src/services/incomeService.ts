import { incomeRepository } from '../repositories/incomeRepository';
import { IncomeItem } from '../types';
import { retryWithBackoff } from '../utils/retry';
import { validators } from '../utils/validation';

export const incomeService = {
  /**
   * Validate income parameters using the shared validation library.
   */
  validateIncome(data: Partial<IncomeItem>): Record<string, string> {
    const errors: Record<string, string> = {};

    if (data.source !== undefined) {
      const err = validators.requiredString(data.source, 'Source/Client');
      if (err) errors.source = err;
    }

    if (data.amount !== undefined) {
      const err = validators.positiveAmount(data.amount, 'Amount');
      if (err) errors.amount = err;
    }

    if (data.category !== undefined) {
      const err = validators.requiredString(data.category, 'Category');
      if (err) errors.category = err;
    }

    if (data.description !== undefined && data.description !== null) {
      const err = validators.maximumLength(data.description, 500, 'Description/Notes');
      if (err) errors.description = err;
    }

    if (data.date !== undefined) {
      const err = validators.validDate(data.date, 'Allocation Date');
      if (err) errors.date = err;
    }

    return errors;
  },

  /**
   * Fetch incomes with retry.
   */
  async fetchIncomes(
    userId: string,
    filters?: { startDate?: string; endDate?: string; category?: string },
    page = 1,
    pageSize = 20
  ): Promise<{ data: IncomeItem[]; count: number | null }> {
    return retryWithBackoff(() =>
      incomeRepository.fetchIncomes(userId, filters, page, pageSize)
    );
  },

  /**
   * Insert new income with validation and retry.
   */
  async createIncome(
    userId: string,
    income: Omit<IncomeItem, 'id'> & { id?: string }
  ): Promise<IncomeItem> {
    const errors = this.validateIncome(income);
    if (Object.keys(errors).length > 0) {
      const errorMsg = Object.values(errors).join(' ');
      throw new Error(`Validation Error: ${errorMsg}`);
    }

    return retryWithBackoff(() =>
      incomeRepository.insertIncome(userId, income)
    );
  },

  /**
   * Update existing income with validation and retry.
   */
  async updateIncome(
    userId: string,
    id: string,
    updates: Partial<IncomeItem>
  ): Promise<IncomeItem> {
    const errors = this.validateIncome(updates);
    if (Object.keys(errors).length > 0) {
      const errorMsg = Object.values(errors).join(' ');
      throw new Error(`Validation Error: ${errorMsg}`);
    }

    return retryWithBackoff(() =>
      incomeRepository.updateIncome(userId, id, updates)
    );
  },

  /**
   * Delete income with retry.
   */
  async deleteIncome(userId: string, id: string): Promise<void> {
    return retryWithBackoff(() =>
      incomeRepository.delete(userId, id)
    );
  }
};
