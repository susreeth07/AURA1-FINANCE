import { incomeRepository } from '../repositories/incomeRepository';
import { IncomeItem } from '../types';

export const incomeService = {
  /**
   * Run operation with exponential backoff retry.
   * Retry schedule: 1s, 2s, 4s.
   */
  async retryOperation<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (err: any) {
        attempt++;
        if (attempt >= maxRetries) {
          throw err;
        }
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(`[IncomeService] Database operation failed: ${err.message || err}. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  /**
   * Validate income parameters.
   */
  validateIncome(data: Partial<IncomeItem>): { [key: string]: string } {
    const errors: { [key: string]: string } = {};

    // Validate Source if provided
    if (data.source !== undefined) {
      if (!data.source || data.source.trim() === '') {
        errors.source = 'Source/Client is required.';
      }
    }

    // Validate Amount if provided
    if (data.amount !== undefined) {
      if (data.amount === null || isNaN(data.amount) || data.amount <= 0) {
        errors.amount = 'Amount must be greater than zero.';
      }
    }

    // Validate Category if provided
    if (data.category !== undefined) {
      if (!data.category || data.category.trim() === '') {
        errors.category = 'Category is required.';
      }
    }

    // Validate Description/Notes length if provided
    if (data.description !== undefined && data.description !== null) {
      if (data.description.length > 500) {
        errors.description = 'Description/Notes cannot exceed 500 characters.';
      }
    }

    // Validate Date if provided
    if (data.date !== undefined) {
      if (!data.date || isNaN(Date.parse(data.date))) {
        errors.date = 'A valid date is required.';
      }
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
    return this.retryOperation(() =>
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

    return this.retryOperation(() =>
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

    return this.retryOperation(() =>
      incomeRepository.updateIncome(userId, id, updates)
    );
  },

  /**
   * Delete income with retry.
   */
  async deleteIncome(userId: string, id: string): Promise<void> {
    return this.retryOperation(() =>
      incomeRepository.deleteIncome(userId, id)
    );
  }
};
