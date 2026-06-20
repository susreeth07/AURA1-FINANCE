import { supabase } from '../lib/supabaseClient';
import { IncomeItem } from '../types';

export function mapDbToIncome(row: any): IncomeItem {
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

export const incomeRepository = {
  /**
   * Look up a category ID (UUID) by name for a user (or system defaults).
   */
  async getCategoryIdByName(userId: string, categoryName: string): Promise<string | null> {
    // Check both user specific categories and system categories (where user_id is null)
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('name', categoryName)
      .eq('type', 'inflow')
      .maybeSingle();

    if (error) {
      console.error(`[IncomeRepository] getCategoryIdByName failed for '${categoryName}':`, error);
      return null;
    }
    if (data) return data.id;

    // Fallback: If not found, look up the 'Other' category
    if (categoryName !== 'Other') {
      return this.getCategoryIdByName(userId, 'Other');
    }
    return null;
  },

  /**
   * Fetch incomes with support for filtering and pagination.
   */
  async fetchIncomes(
    userId: string,
    filters?: { startDate?: string; endDate?: string; category?: string },
    page = 1,
    pageSize = 20
  ): Promise<{ data: IncomeItem[]; count: number | null }> {
    let query = supabase
      .from('incomes')
      .select('*, categories(name)', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (filters) {
      if (filters.category) {
        const categoryId = await this.getCategoryIdByName(userId, filters.category);
        if (categoryId) {
          query = query.eq('category_id', categoryId);
        } else {
          // If category not found, return zero results by passing a dummy UUID
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

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: (data || []).map(mapDbToIncome),
      count: count
    };
  },

  /**
   * Insert a new income record.
   */
  async insertIncome(
    userId: string,
    income: Omit<IncomeItem, 'id'> & { id?: string }
  ): Promise<IncomeItem> {
    const categoryId = await this.getCategoryIdByName(userId, income.category);
    
    const dbPayload: any = {
      user_id: userId,
      source: income.source,
      amount: income.amount,
      category_id: categoryId,
      date: income.date,
      description: income.description || null,
      is_recurring: income.isRecurring || false
    };

    if (income.id) {
      dbPayload.id = income.id;
    }

    const { data, error } = await supabase
      .from('incomes')
      .insert(dbPayload)
      .select('*, categories(name)')
      .single();

    if (error) throw error;
    return mapDbToIncome(data);
  },

  /**
   * Update an existing income record using delta changes.
   */
  async updateIncome(
    userId: string,
    id: string,
    updates: Partial<IncomeItem>
  ): Promise<IncomeItem> {
    const dbPayload: any = {};
    
    if (updates.source !== undefined) dbPayload.source = updates.source;
    if (updates.amount !== undefined) dbPayload.amount = updates.amount;
    if (updates.date !== undefined) dbPayload.date = updates.date;
    if (updates.description !== undefined) dbPayload.description = updates.description || null;
    if (updates.isRecurring !== undefined) dbPayload.is_recurring = updates.isRecurring;
    
    if (updates.category !== undefined) {
      const categoryId = await this.getCategoryIdByName(userId, updates.category);
      dbPayload.category_id = categoryId;
    }

    const { data, error } = await supabase
      .from('incomes')
      .update(dbPayload)
      .eq('id', id)
      .eq('user_id', userId) // Security boundary assertion
      .select('*, categories(name)')
      .single();

    if (error) throw error;
    return mapDbToIncome(data);
  },

  /**
   * Delete an income record.
   */
  async deleteIncome(userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('incomes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Security boundary assertion

    if (error) throw error;
  }
};
