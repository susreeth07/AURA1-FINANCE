import { supabase } from '../lib/supabaseClient';
import { ExpenseItem } from '../types';
import { BaseRepository } from './baseRepository';
import { logger } from '../utils/logger';

export class ExpenseRepository extends BaseRepository<any, ExpenseItem> {
  constructor() {
    super('expenses');
  }

  mapDbToModel(row: any): ExpenseItem {
    return {
      id: row.id,
      merchant: row.merchant,
      amount: Number(row.amount),
      category: row.categories?.name || 'Other',
      date: row.date,
      description: row.description || '',
      isRecurring: row.is_recurring || false,
      frequency: row.frequency as any
    };
  }

  mapModelToDb(model: Partial<ExpenseItem>): any {
    const row: any = {};
    if (model.merchant !== undefined) row.merchant = model.merchant;
    if (model.amount !== undefined) row.amount = model.amount;
    if (model.date !== undefined) row.date = model.date;
    if (model.description !== undefined) row.description = model.description || null;
    if (model.isRecurring !== undefined) row.is_recurring = model.isRecurring;
    if (model.frequency !== undefined) row.frequency = model.frequency || null;
    return row;
  }

  /**
   * Look up a category ID (UUID) by name for a user (or system defaults) for outflow category types.
   */
  async getCategoryIdByName(userId: string, categoryName: string): Promise<string | null> {
    this.validateUserId(userId);
    return this.tracePerformance('getCategoryIdByName', async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq('name', categoryName)
        .eq('type', 'outflow')
        .maybeSingle();

      if (error) {
        logger.supabaseError(`getCategoryIdByName failed for '${categoryName}'`, error);
        return null;
      }
      if (data) return data.id;

      // Fallback: If not found, look up the 'Other' outflow category
      if (categoryName !== 'Other') {
        return this.getCategoryIdByName(userId, 'Other');
      }
      return null;
    });
  }

  /**
   * Fetch expenses with support for filtering, search, pagination, and ordering.
   */
  async fetchExpenses(
    userId: string,
    filters?: { startDate?: string; endDate?: string; category?: string; search?: string },
    page = 1,
    pageSize = 20
  ): Promise<{ data: ExpenseItem[]; count: number | null }> {
    this.validateUserId(userId);
    return this.tracePerformance('fetchExpenses', async () => {
      let query = supabase
        .from(this.tableName)
        .select('*, categories(name)', { count: 'exact' })
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (filters) {
        if (filters.category) {
          const categoryId = await this.getCategoryIdByName(userId, filters.category);
          if (categoryId) {
            query = query.eq('category_id', categoryId);
          } else {
            // Return zero results using a dummy UUID
            query = query.eq('category_id', '00000000-0000-0000-0000-000000000000');
          }
        }
        if (filters.startDate) {
          query = query.gte('date', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('date', filters.endDate);
        }
        if (filters.search) {
          // Perform a case-insensitive logical search on merchant or description attributes
          query = query.or(`merchant.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }
      }

      const { from, to } = this.getRange(page, pageSize);
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) {
        logger.supabaseError('fetchExpenses', error);
        throw error;
      }

      return {
        data: (data || []).map((row) => this.mapDbToModel(row)),
        count
      };
    });
  }

  /**
   * Insert a new expense record.
   */
  async insertExpense(
    userId: string,
    expense: Omit<ExpenseItem, 'id'> & { id?: string }
  ): Promise<ExpenseItem> {
    this.validateUserId(userId);
    return this.tracePerformance('insertExpense', async () => {
      const categoryId = await this.getCategoryIdByName(userId, expense.category);
      const mapped = this.mapModelToDb(expense);
      mapped.category_id = categoryId;
      mapped.user_id = userId;
      if (expense.id) {
        mapped.id = expense.id;
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .insert(mapped)
        .select('*, categories(name)')
        .single();

      if (error) {
        logger.supabaseError('insertExpense', error);
        throw error;
      }
      return this.mapDbToModel(data);
    });
  }

  /**
   * Update an existing expense record using delta changes.
   */
  async updateExpense(
    userId: string,
    id: string,
    updates: Partial<ExpenseItem>
  ): Promise<ExpenseItem> {
    this.validateUserId(userId);
    return this.tracePerformance('updateExpense', async () => {
      const mapped = this.mapModelToDb(updates);
      if (updates.category !== undefined) {
        const categoryId = await this.getCategoryIdByName(userId, updates.category);
        mapped.category_id = categoryId;
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .update(mapped)
        .eq('id', id)
        .eq('user_id', userId)
        .select('*, categories(name)')
        .single();

      if (error) {
        logger.supabaseError('updateExpense', error);
        throw error;
      }
      return this.mapDbToModel(data);
    });
  }
}

export const expenseRepository = new ExpenseRepository();
