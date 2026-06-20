import { NotificationItem } from '../repositories/notificationRepository';

export interface NotificationChannel {
  readonly id: string;
  readonly name: string;
  send(notification: Omit<NotificationItem, 'id' | 'createdAt'> & { id?: string }): Promise<NotificationItem>;
}
