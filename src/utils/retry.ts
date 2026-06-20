import { logger } from './logger';

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  factor?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  retryableErrorsOnly?: boolean;
}

/**
 * Checks if a database, network, or service error is retryable.
 */
function isErrorRetryable(error: any): boolean {
  if (!error) return false;
  
  const msg = String(error.message || '').toLowerCase();
  
  // App-level validation failures are not retryable
  if (msg.includes('validation error') || msg.includes('validation')) {
    return false;
  }

  // Supabase/PostgREST schema / database constraints are not retryable
  if (error.code) {
    const code = String(error.code);
    
    // Standard Postgres non-retryable error class prefixes (e.g. syntax, integrity constraint violations)
    // 23505 = unique_violation, 23503 = foreign_key_violation, 42P01 = undefined_table, etc.
    const nonRetryableCodes = ['42P01', '42703', '23505', '23503', '22001', '23502'];
    if (nonRetryableCodes.includes(code)) {
      return false;
    }
  }

  // HTTP Gateway / network response code boundaries
  if (error.status) {
    const status = Number(error.status);
    
    // Client-side authentication/request errors are not retryable
    // 408 (timeout) and 429 (rate-limit) are retryable.
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      return false;
    }
  }

  return true;
}

/**
 * Executes a callback operation wrapped inside an exponential backoff sequence.
 */
export async function retryWithBackoff<T>(
  operation: (signal?: AbortSignal) => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    factor = 2,
    timeoutMs,
    signal,
    retryableErrorsOnly = true
  } = config;

  let attempt = 0;

  while (true) {
    if (signal?.aborted) {
      throw new Error('Operation aborted');
    }

    try {
      const operationPromise = operation(signal);
      
      if (timeoutMs) {
        let timerId: any;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timerId = setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
        });
        
        const result = await Promise.race([operationPromise, timeoutPromise]);
        clearTimeout(timerId);
        return result;
      } else {
        return await operationPromise;
      }
    } catch (err: any) {
      attempt++;

      if (signal?.aborted) {
        throw new Error('Operation aborted');
      }

      // Check if error is eligible for retry
      if (retryableErrorsOnly && !isErrorRetryable(err)) {
        logger.warn(`[Retry] Non-retryable error, aborted retry: ${err.message || err}`);
        throw err;
      }

      if (attempt >= maxRetries) {
        logger.error(`[Retry] Max retry count (${maxRetries}) exhausted. Final throw.`);
        throw err;
      }

      // Offline detection loop
      if (typeof window !== 'undefined' && !navigator.onLine) {
        logger.warn('[Retry] Local network interface offline. Waiting for connection recovery...');
        await new Promise((resolve, reject) => {
          const handleOnline = () => {
            window.removeEventListener('online', handleOnline);
            signal?.removeEventListener('abort', handleAbort);
            resolve(null);
          };
          const handleAbort = () => {
            window.removeEventListener('online', handleOnline);
            signal?.removeEventListener('abort', handleAbort);
            reject(new Error('Operation aborted during offline freeze'));
          };
          window.addEventListener('online', handleOnline);
          signal?.addEventListener('abort', handleAbort);
        });
      }

      const delay = initialDelayMs * Math.pow(factor, attempt - 1);
      logger.warn(`[Retry] Attempt ${attempt} failed. Retrying in ${delay}ms. Error: ${err.message || err}`);
      
      // Delay block with active abort hook
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          signal?.removeEventListener('abort', handleAbort);
          resolve(null);
        }, delay);
        
        const handleAbort = () => {
          clearTimeout(timeoutId);
          reject(new Error('Operation aborted during retry delay'));
        };
        
        signal?.addEventListener('abort', handleAbort);
      });
    }
  }
}
