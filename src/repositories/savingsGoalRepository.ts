import { supabase } from '../lib/supabaseClient';
import { SavingsGoal } from '../types';
import { BaseRepository } from './baseRepository';
import { logger } from '../utils/logger';
import { DomainEventBus } from '../domain/events/DomainEventBus';
import { GoalFunded, GoalCompleted } from '../domain/events/FinancialEvents';
import { Money } from '../domain/finance/Money';

export class SavingsGoalRepository extends BaseRepository<any, SavingsGoal> {
  constructor() {
    super('savings_goals');
  }

  mapDbToModel(row: any): SavingsGoal {
    return {
      id: row.id,
      name: row.name,
      targetAmount: Number(row.target_amount),
      currentAmount: Number(row.current_amount),
      category: row.category as any,
      targetDate: row.target_date,
      icon: row.icon || ''
    };
  }

  mapModelToDb(model: Partial<SavingsGoal>): any {
    const row: any = {};
    if (model.name !== undefined) row.name = model.name;
    if (model.targetAmount !== undefined) row.target_amount = model.targetAmount;
    if (model.currentAmount !== undefined) row.current_amount = model.currentAmount;
    if (model.category !== undefined) row.category = model.category;
    if (model.targetDate !== undefined) row.target_date = model.targetDate;
    if (model.icon !== undefined) row.icon = model.icon;
    return row;
  }

  async fetchSavingsGoals(userId: string): Promise<SavingsGoal[]> {
    this.validateUserId(userId);
    return this.tracePerformance('fetchSavingsGoals', async () => {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.supabaseError('fetchSavingsGoals', error);
        throw error;
      }
      return (data || []).map((row) => this.mapDbToModel(row));
    });
  }

  async insertSavingsGoal(userId: string, goal: Omit<SavingsGoal, 'id'> & { id?: string }): Promise<SavingsGoal> {
    this.validateUserId(userId);
    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        ...this.mapModelToDb(goal),
        user_id: userId
      })
      .select()
      .single();
    if (error) throw error;
    return this.mapDbToModel(data);
  }

  async fundGoal(userId: string, id: string, amount: number): Promise<SavingsGoal> {
    this.validateUserId(userId);
    const goal = await this.findById(userId, id);
    if (!goal) throw new Error("Goal not found");

    const newCurrent = goal.currentAmount + amount;
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ current_amount: newCurrent })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    const result = this.mapDbToModel(data);

    DomainEventBus.publish(new GoalFunded(
      userId,
      result.id,
      Money.fromDecimal(amount),
      Money.fromDecimal(result.currentAmount)
    ));

    if (result.currentAmount >= result.targetAmount) {
      DomainEventBus.publish(new GoalCompleted(
        userId,
        result.id,
        result.name,
        Money.fromDecimal(result.targetAmount)
      ));
    }

    return result;
  }
}

export const savingsGoalRepository = new SavingsGoalRepository();
