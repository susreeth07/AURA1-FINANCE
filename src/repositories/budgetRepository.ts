import { supabase } from '../lib/supabaseClient';
import { BudgetItem } from '../types';
import { BaseRepository } from './baseRepository';
import { logger } from '../utils/logger';
import { DomainEventBus } from '../domain/events/DomainEventBus';
import { BudgetUpdated } from '../domain/events/FinancialEvents';
import { Money } from '../domain/finance/Money';

export class BudgetRepository extends BaseRepository<any, BudgetItem> {
  constructor() {
    super('budgets');
  }

  mapDbToModel(row: any): BudgetItem {
    return {
      id: row.id,
      category: row.categories?.name || 'Other',
      limit: Number(row.limit_amount),
      spent: 0,
      color: row.categories?.color || '#6366f1',
      alertThreshold: row.alert_threshold || 80
    };
  }

  mapModelToDb(model: Partial<BudgetItem>): any {
    const row: any = {};
    if (model.limit !== undefined) row.limit_amount = model.limit;
    if (model.alertThreshold !== undefined) row.alert_threshold = model.alertThreshold;
    return row;
  }

  async fetchBudgets(userId: string): Promise<BudgetItem[]> {
    this.validateUserId(userId);
    return this.tracePerformance('fetchBudgets', async () => {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*, categories(name, color)')
        .eq('user_id', userId);

      if (error) {
        logger.supabaseError('fetchBudgets', error);
        throw error;
      }
      return (data || []).map((row) => this.mapDbToModel(row));
    });
  }

  async getCategoryIdByName(userId: string, categoryName: string): Promise<string | null> {
    this.validateUserId(userId);
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('name', categoryName)
      .eq('type', 'outflow')
      .maybeSingle();
    if (error) return null;
    return data ? data.id : null;
  }

  async insertBudget(userId: string, budget: Omit<BudgetItem, 'id'> & { id?: string }): Promise<BudgetItem> {
    this.validateUserId(userId);
    const categoryId = await this.getCategoryIdByName(userId, budget.category);
    const dbPayload = {
      limit_amount: budget.limit,
      alert_threshold: budget.alertThreshold,
      category_id: categoryId,
      user_id: userId
    };
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(dbPayload)
      .select('*, categories(name, color)')
      .single();
    if (error) throw error;
    const result = this.mapDbToModel(data);
    DomainEventBus.publish(new BudgetUpdated(
      userId,
      result.id,
      Money.fromDecimal(result.limit),
      result.category
    ));
    return result;
  }

  async updateBudgetLimit(userId: string, id: string, limit: number): Promise<BudgetItem> {
    this.validateUserId(userId);
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ limit_amount: limit })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, categories(name, color)')
      .single();
    if (error) throw error;
    const result = this.mapDbToModel(data);
    DomainEventBus.publish(new BudgetUpdated(
      userId,
      result.id,
      Money.fromDecimal(result.limit),
      result.category
    ));
    return result;
  }
}

export const budgetRepository = new BudgetRepository();
