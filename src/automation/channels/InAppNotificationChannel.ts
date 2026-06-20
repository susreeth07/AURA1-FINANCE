import { NotificationChannel } from '../NotificationChannel';
import { NotificationItem, notificationRepository } from '../../repositories/notificationRepository';

export class InAppNotificationChannel implements NotificationChannel {
  readonly id = 'in-app';
  readonly name = 'In-App Notification Channel';

  async send(notification: Omit<NotificationItem, 'id' | 'createdAt'> & { id?: string }): Promise<NotificationItem> {
    const inserted = await notificationRepository.insert(notification.userId, {
      ...notification,
      status: notification.status || 'created',
      isRead: notification.isRead || notification.status === 'read',
      createdAt: new Date()
    });
    return inserted;
  }
}
