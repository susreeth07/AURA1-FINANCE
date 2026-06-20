import { expenseRepository } from '../repositories/expenseRepository';
import { ExpenseItem } from '../types';
import { retryWithBackoff } from '../utils/retry';
import { validators } from '../utils/validation';

export const expenseService = {
  /**
   * Validates expense parameters using the shared validation library.
   */
  validateExpense(data: Partial<ExpenseItem>): Record<string, string> {
    const errors: Record<string, string> = {};

    if (data.merchant !== undefined) {
      const err = validators.requiredString(data.merchant, 'Merchant');
      if (err) errors.merchant = err;
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
      const err = validators.validDate(data.date, 'Transaction Date');
      if (err) errors.date = err;
    }

    if (data.isRecurring !== undefined || data.frequency !== undefined) {
      const isRecur = data.isRecurring ?? false;
      const freq = data.frequency;
      if (isRecur) {
        if (!freq) {
          errors.frequency = 'Frequency is required for recurring expenses.';
        } else if (!['weekly', 'monthly', 'yearly'].includes(freq)) {
          errors.frequency = 'Frequency must be weekly, monthly, or yearly.';
        }
      }
    }

    return errors;
  },

  /**
   * Fetch expenses with retry.
   */
  async fetchExpenses(
    userId: string,
    filters?: { startDate?: string; endDate?: string; category?: string; search?: string },
    page = 1,
    pageSize = 20
  ): Promise<{ data: ExpenseItem[]; count: number | null }> {
    return retryWithBackoff(() =>
      expenseRepository.fetchExpenses(userId, filters, page, pageSize)
    );
  },

  /**
   * Insert new expense with validation and retry.
   */
  async createExpense(
    userId: string,
    expense: Omit<ExpenseItem, 'id'> & { id?: string }
  ): Promise<ExpenseItem> {
    const errors = this.validateExpense(expense);
    if (Object.keys(errors).length > 0) {
      const errorMsg = Object.values(errors).join(' ');
      throw new Error(`Validation Error: ${errorMsg}`);
    }

    return retryWithBackoff(() =>
      expenseRepository.insertExpense(userId, expense)
    );
  },

  /**
   * Update existing expense with validation and retry.
   */
  async updateExpense(
    userId: string,
    id: string,
    updates: Partial<ExpenseItem>
  ): Promise<ExpenseItem> {
    const errors = this.validateExpense(updates);
    if (Object.keys(errors).length > 0) {
      const errorMsg = Object.values(errors).join(' ');
      throw new Error(`Validation Error: ${errorMsg}`);
    }

    return retryWithBackoff(() =>
      expenseRepository.updateExpense(userId, id, updates)
    );
  },

  /**
   * Delete expense with retry.
   */
  async deleteExpense(userId: string, id: string): Promise<void> {
    return retryWithBackoff(() =>
      expenseRepository.delete(userId, id)
    );
  }
};
