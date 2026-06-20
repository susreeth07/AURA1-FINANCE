import { NotificationItem } from '../repositories/notificationRepository';

export interface ActionCenterPayload {
  readonly unreadNotifications: readonly NotificationItem[];
  readonly upcomingReminders: readonly any[];
  readonly pendingRecommendations: readonly any[];
  readonly criticalAlerts: readonly NotificationItem[];
  readonly goalMilestones: readonly any[];
}

export class ActionCenter {
  private static subscribers = new Set<(payload: ActionCenterPayload) => void>();
  private static currentPayload: ActionCenterPayload = {
    unreadNotifications: [],
    upcomingReminders: [],
    pendingRecommendations: [],
    criticalAlerts: [],
    goalMilestones: []
  };

  static subscribe(listener: (payload: ActionCenterPayload) => void): () => void {
    ActionCenter.subscribers.add(listener);
    listener(ActionCenter.currentPayload);
    return () => {
      ActionCenter.subscribers.delete(listener);
    };
  }

  static update(payload: Partial<ActionCenterPayload>): void {
    ActionCenter.currentPayload = {
      ...ActionCenter.currentPayload,
      ...payload
    };
    ActionCenter.subscribers.forEach(sub => {
      try {
        sub(ActionCenter.currentPayload);
      } catch (err) {
        console.error('[ActionCenter] Subscriber notification error:', err);
      }
    });
  }

  static getPayload(): ActionCenterPayload {
    return ActionCenter.currentPayload;
  }
}
