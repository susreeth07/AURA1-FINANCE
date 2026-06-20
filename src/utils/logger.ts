const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Logs debug level trace (Dev only)
   */
  debug(message: string, ...args: any[]) {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Logs info level message (Dev only)
   */
  info(message: string, ...args: any[]) {
    if (isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Logs warn level message (Dev only)
   */
  warn(message: string, ...args: any[]) {
    if (isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  /**
   * Logs error level message (Always logs)
   */
  error(message: string, error?: any, ...args: any[]) {
    console.error(`[ERROR] ${message}`, error, ...args);
  },

  /**
   * Consistent Supabase database client error formatter
   */
  supabaseError(operation: string, error: any) {
    const errorDetails = error 
      ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      : { message: 'Unknown error', code: undefined, details: undefined, hint: undefined };
    
    console.error(
      `[Supabase Error] Operation: ${operation} | Code: ${errorDetails.code || 'N/A'} | Message: ${errorDetails.message || 'N/A'}`,
      errorDetails
    );
  },

  /**
   * Performance metrics logging group
   */
  performanceGroup(label: string, durationMs: number) {
    if (isDev) {
      console.groupCollapsed(`[PERF] ${label} - ${durationMs.toFixed(2)}ms`);
      console.log(`Duration: ${durationMs}ms`);
      console.groupEnd();
    }
  }
};
