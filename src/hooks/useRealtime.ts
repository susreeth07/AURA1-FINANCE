import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export function useRealtime(
  tableName: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  callback: (payload: RealtimePostgresChangesPayload<any>) => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    logger.debug(`[Realtime] Registering subscription channel for table: "${tableName}" (event: ${event})`);

    const channel = supabase
      .channel(`rt:${tableName}:${event}-${Math.random().toString(36).substring(2, 9)}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table: tableName },
        (payload) => {
          logger.debug(`[Realtime] Table change broadcast received on "${tableName}":`, payload);
          callbackRef.current(payload);
        }
      )
      .subscribe((status) => {
        logger.info(`[Realtime] Channel status for table "${tableName}": ${status}`);
      });

    return () => {
      logger.debug(`[Realtime] Unregistering subscription channel for table: "${tableName}"`);
      supabase.removeChannel(channel);
    };
  }, [tableName, event]);
}
