import { BaseRepository } from './baseRepository';
import { supabase } from '../lib/supabaseClient';

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  status: string;
  isRead: boolean;
  createdAt: Date;
  priority?: string;
}

const isValidUuid = (val?: string) =>
  !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

const ALLOWED_NOTIFICATION_TYPES = new Set(['budget', 'goal', 'bill', 'warning', 'ai']);

export const normalizeNotificationType = (val?: string): string => {
  if (!val) return 'budget';
  const lower = val.toLowerCase().trim();
  if (ALLOWED_NOTIFICATION_TYPES.has(lower)) return lower;
  if (lower === 'salary' || lower === 'income' || lower === 'revenue') return 'budget';
  if (lower === 'bill' || lower === 'reminder') return 'bill';
  if (lower === 'goal' || lower === 'achievement') return 'goal';
  if (lower === 'ai' || lower === 'agent') return 'ai';
  if (lower.includes('warning') || lower.includes('alert') || lower.includes('emergency')) return 'warning';
  return 'budget';
};

export class NotificationRepository extends BaseRepository<any, NotificationItem> {
  constructor() {
    super('system_notifications');
  }

  mapDbToModel(row: any): NotificationItem {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      status: row.status || (row.is_read ? 'read' : 'delivered'),
      isRead: row.is_read || row.status === 'read',
      createdAt: new Date(row.created_at),
      priority: row.priority || (row.title.includes('⚠️') || row.title.includes('Exceeded') || row.title.includes('Overdue') ? 'CRITICAL' : 'INFO')
    };
  }

  mapModelToDb(model: Partial<NotificationItem>): any {
    const row: any = {};
    if (isValidUuid(model.id)) row.id = model.id;
    if (model.userId !== undefined) row.user_id = model.userId;
    if (model.type !== undefined) row.type = normalizeNotificationType(model.type);
    if (model.title !== undefined) row.title = model.title;
    if (model.message !== undefined) row.message = model.message;
    
    // Map status / isRead to is_read column exclusively.
    // public.system_notifications contains is_read BOOLEAN and no status column.
    if (model.isRead !== undefined) {
      row.is_read = Boolean(model.isRead);
    } else if (model.status !== undefined) {
      row.is_read = model.status === 'read';
    }
    return row;
  }

  async fetchNotifications(userId: string, status?: string, page = 1, pageSize = 20): Promise<{ data: NotificationItem[]; count: number | null }> {
    this.validateUserId(userId);
    return this.tracePerformance('fetchNotifications', async () => {
      const { from, to } = this.getRange(page, pageSize);
      let query = supabase
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (status) {
        if (status.toLowerCase() === 'read') {
          query = query.eq('is_read', true);
        } else if (status.toLowerCase() === 'unread' || status.toLowerCase() === 'delivered' || status.toLowerCase() === 'created') {
          query = query.eq('is_read', false);
        }
      }

      const { data, error, count } = await query.range(from, to);

      if (error) {
        throw error;
      }

      return {
        data: (data || []).map((row) => this.mapDbToModel(row)),
        count
      };
    });
  }

  async markAllRead(userId: string): Promise<void> {
    this.validateUserId(userId);
    return this.tracePerformance('markAllRead', async () => {
      const { error } = await supabase
        .from(this.tableName)
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        throw error;
      }
    });
  }
}

export const notificationRepository = new NotificationRepository();
