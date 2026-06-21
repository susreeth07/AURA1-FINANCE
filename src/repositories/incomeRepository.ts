import { supabase } from '../lib/supabaseClient';
import { IncomeItem } from '../types';
import { BaseRepository } from './baseRepository';
import { logger } from '../utils/logger';

export class IncomeRepository extends BaseRepository<any, IncomeItem> {
  constructor() {
    super('incomes');
  }

  mapDbToModel(row: any): IncomeItem {
    return {
      id: row.id,
      source: row.source,
      amount: Number(row.amount),
      category: row.categories?.name || 'Other',
      date: row.date,
      description: row.description || '',
      isRecurring: row.is_recurring || false
    };
  }

  mapModelToDb(model: Partial<IncomeItem>): any {
    const row: any = {};
    if (model.source !== undefined) row.source = model.source;
    if (model.amount !== undefined) row.amount = model.amount;
    if (model.date !== undefined) row.date = model.date;
    if (model.description !== undefined) row.description = model.description || null;
    if (model.isRecurring !== undefined) row.is_recurring = model.isRecurring;
    return row;
  }

  /**
   * Look up a category ID (UUID) by name for a user (or system defaults).
   */
  async getCategoryIdByName(userId: string, categoryName: string): Promise<string | null> {
    this.validateUserId(userId);
    return this.tracePerformance('getCategoryIdByName', async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq('name', categoryName)
        .eq('type', 'inflow')
        .maybeSingle();

      if (error) {
        logger.supabaseError(`getCategoryIdByName failed for '${categoryName}'`, error);
        return null;
      }
      if (data) return data.id;

      // Fallback: If not found, look up the 'Other' category
      if (categoryName !== 'Other') {
        return this.getCategoryIdByName(userId, 'Other');
      }
      return null;
    });
  }

  /**
   * Fetch incomes with support for filtering and pagination.
   */
  async fetchIncomes(
    userId: string,
    filters?: { startDate?: string; endDate?: string; category?: string },
    page = 1,
    pageSize = 20
  ): Promise<{ data: IncomeItem[]; count: number | null }> {
    this.validateUserId(userId);
    return this.tracePerformance('fetchIncomes', async () => {
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
      }

      const { from, to } = this.getRange(page, pageSize);
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) {
        logger.supabaseError('fetchIncomes', error);
        throw error;
      }

      return {
        data: (data || []).map((row) => this.mapDbToModel(row)),
        count
      };
    });
  }

  /**
   * Insert a new income record with category mapping.
   */
  async insertIncome(
    userId: string,
    income: Omit<IncomeItem, 'id'> & { id?: string }
  ): Promise<IncomeItem> {
    this.validateUserId(userId);
    return this.tracePerformance('insertIncome', async () => {
      const categoryId = await this.getCategoryIdByName(userId, income.category);
      const mapped = this.mapModelToDb(income);
      mapped.category_id = categoryId;
      mapped.user_id = userId;
      if (income.id) {
        mapped.id = income.id;
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .insert(mapped)
        .select('*, categories(name)')
        .single();

      if (error) {
        logger.supabaseError('insertIncome', error);
        throw error;
      }
      return this.mapDbToModel(data);
    });
  }

  /**
   * Update an existing income record using delta changes.
   */
  async updateIncome(
    userId: string,
    id: string,
    updates: Partial<IncomeItem>
  ): Promise<IncomeItem> {
    this.validateUserId(userId);
    return this.tracePerformance('updateIncome', async () => {
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
        logger.supabaseError('updateIncome', error);
        throw error;
      }
      return this.mapDbToModel(data);
    });
  }
}

export const incomeRepository = new IncomeRepository();
