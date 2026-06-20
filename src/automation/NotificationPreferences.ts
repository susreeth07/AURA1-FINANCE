export interface Preferences {
  readonly enabledCategories: string[];
  readonly quietHoursStart: number; // 0-23
  readonly quietHoursEnd: number; // 0-23
  readonly mutedRules: string[];
  readonly channels: string[];
}

export class NotificationPreferences {
  private static userPreferences = new Map<string, Preferences>();

  static getPreferences(userId: string): Preferences {
    return NotificationPreferences.userPreferences.get(userId) || {
      enabledCategories: ['budget', 'goal', 'bill', 'warning', 'salary', 'summary', 'achievement', 'reminder', 'system', 'ai'],
      quietHoursStart: 22, // 10 PM
      quietHoursEnd: 7, // 7 AM
      mutedRules: [],
      channels: ['in-app']
    };
  }

  static setPreferences(userId: string, preferences: Preferences): void {
    NotificationPreferences.userPreferences.set(userId, preferences);
  }

  static isNotificationAllowed(userId: string, category: string, ruleId?: string): boolean {
    const prefs = NotificationPreferences.getPreferences(userId);
    
    if (!prefs.enabledCategories.includes(category)) {
      return false;
    }

    if (ruleId && prefs.mutedRules.includes(ruleId)) {
      return false;
    }

    // Quiet Hours Check
    const currentHour = new Date().getHours();
    const start = prefs.quietHoursStart;
    const end = prefs.quietHoursEnd;

    if (start < end) {
      if (currentHour >= start && currentHour < end) {
        return false;
      }
    } else {
      // Handles overnight ranges (e.g. 22:00 to 07:00)
      if (currentHour >= start || currentHour < end) {
        return false;
      }
    }

    return true;
  }

  static clear(): void {
    NotificationPreferences.userPreferences.clear();
  }
}
