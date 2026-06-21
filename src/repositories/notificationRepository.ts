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
    if (model.id !== undefined) row.id = model.id;
    if (model.userId !== undefined) row.user_id = model.userId;
    if (model.type !== undefined) row.type = model.type;
    if (model.title !== undefined) row.title = model.title;
    if (model.message !== undefined) row.message = model.message;
    if (model.status !== undefined) {
      row.status = model.status;
      row.is_read = model.status === 'read';
    } else if (model.isRead !== undefined) {
      row.is_read = model.isRead;
      row.status = model.isRead ? 'read' : 'delivered';
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
        query = query.eq('status', status);
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
        .update({ status: 'read', is_read: true })
        .eq('user_id', userId)
        .neq('status', 'read');

      if (error) {
        throw error;
      }
    });
  }
}

export const notificationRepository = new NotificationRepository();
