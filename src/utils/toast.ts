export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export type ToastEvent = 
  | { type: 'add'; toast: ToastMessage }
  | { type: 'dismiss'; id: string };

type ToastListener = (event: ToastEvent) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  /**
   * Register a toast event listener.
   */
  subscribe(listener: ToastListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Internal pub/sub event publisher.
   */
  publish(type: ToastType, message: string, duration = 4000): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const toastObj: ToastMessage = { id, type, message, duration };
    listeners.forEach((listener) => listener({ type: 'add', toast: toastObj }));
    return id;
  },

  /**
   * Manually dismiss a specific active toast.
   */
  dismiss(id: string) {
    listeners.forEach((listener) => listener({ type: 'dismiss', id }));
  },

  /**
   * Show success feedback toast.
   */
  success(message: string, duration?: number): string {
    return this.publish('success', message, duration);
  },

  /**
   * Show error feedback toast.
   */
  error(message: string, duration?: number): string {
    return this.publish('error', message, duration);
  },

  /**
   * Show warning toast.
   */
  warning(message: string, duration?: number): string {
    return this.publish('warning', message, duration);
  },

  /**
   * Show informative toast.
   */
  info(message: string, duration?: number): string {
    return this.publish('info', message, duration);
  },

  /**
   * Show loading spinner toast.
   */
  loading(message: string): string {
    // Pass duration = 0 so it stays visible indefinitely until explicitly dismissed
    return this.publish('loading', message, 0);
  },

  /**
   * Automates loading, success, and error toasts based on a Promise.
   */
  async promise<T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string | ((err: any) => string) },
    options?: { duration?: number }
  ): Promise<T> {
    const id = this.loading(msgs.loading);
    try {
      const result = await promise;
      this.dismiss(id);
      this.success(msgs.success, options?.duration);
      return result;
    } catch (err: any) {
      this.dismiss(id);
      const errMsg = typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
      this.error(errMsg || err.message || 'Operation failed', options?.duration);
      throw err;
    }
  }
};
