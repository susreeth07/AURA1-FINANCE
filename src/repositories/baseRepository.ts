import { supabase } from '../lib/supabaseClient';
import { logger } from '../utils/logger';

export abstract class BaseRepository<TDbRow, TJsModel> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Abstract mapper to transform a database row into a JS object model.
   */
  abstract mapDbToModel(row: TDbRow): TJsModel;

  /**
   * Abstract mapper to transform a JS model update payload into database columns.
   */
  abstract mapModelToDb(model: Partial<TJsModel>): Partial<TDbRow>;

  /**
   * Shared helper for pagination range offsets.
   */
  getRange(page: number, pageSize: number): { from: number; to: number } {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    return { from, to };
  }

  /**
   * Trace database execution times for performance profiling.
   */
  protected async tracePerformance<T>(label: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await operation();
    } finally {
      const end = performance.now();
      logger.performanceGroup(`${this.tableName}:${label}`, end - start);
    }
  }

  /**
   * Generic fetch by ID.
   */
  async findById(userId: string, id: string): Promise<TJsModel | null> {
    return this.tracePerformance('findById', async () => {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.supabaseError(`findById in "${this.tableName}"`, error);
        throw error;
      }
      return data ? this.mapDbToModel(data as any) : null;
    });
  }

  /**
   * Generic Insert.
   */
  async insert(userId: string, item: Omit<TJsModel, 'id'> & { id?: string }): Promise<TJsModel> {
    return this.tracePerformance('insert', async () => {
      const dbPayload = {
        ...this.mapModelToDb(item as any),
        user_id: userId
      };

      if (item.id) {
        (dbPayload as any).id = item.id;
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .insert(dbPayload as any)
        .select()
        .single();

      if (error) {
        logger.supabaseError(`insert in "${this.tableName}"`, error);
        throw error;
      }
      return this.mapDbToModel(data as any);
    });
  }

  /**
   * Generic Update (supports delta-saving updates).
   */
  async update(userId: string, id: string, updates: Partial<TJsModel>): Promise<TJsModel> {
    return this.tracePerformance('update', async () => {
      const dbPayload = this.mapModelToDb(updates);

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbPayload as any)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        logger.supabaseError(`update in "${this.tableName}"`, error);
        throw error;
      }
      return this.mapDbToModel(data as any);
    });
  }

  /**
   * Generic Delete.
   */
  async delete(userId: string, id: string): Promise<void> {
    return this.tracePerformance('delete', async () => {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        logger.supabaseError(`delete in "${this.tableName}"`, error);
        throw error;
      }
    });
  }

  /**
   * Generic Batch Insert.
   */
  async batchInsert(userId: string, items: (Omit<TJsModel, 'id'> & { id?: string })[]): Promise<TJsModel[]> {
    return this.tracePerformance('batchInsert', async () => {
      const dbPayloads = items.map((item) => ({
        ...this.mapModelToDb(item as any),
        user_id: userId,
        ...(item.id ? { id: item.id } : {})
      }));

      const { data, error } = await supabase
        .from(this.tableName)
        .insert(dbPayloads as any)
        .select();

      if (error) {
        logger.supabaseError(`batchInsert in "${this.tableName}"`, error);
        throw error;
      }
      return (data || []).map((row) => this.mapDbToModel(row as any));
    });
  }

  /**
   * Soft Delete support (future ready archive tracking).
   */
  async softDelete(userId: string, id: string): Promise<void> {
    return this.tracePerformance('softDelete', async () => {
      // Updates the deleted_at column (assumes table has soft delete schema)
      const { error } = await supabase
        .from(this.tableName)
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        logger.supabaseError(`softDelete in "${this.tableName}"`, error);
        throw error;
      }
    });
  }
}
