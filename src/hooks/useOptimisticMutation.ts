import React, { useState } from 'react';
import { optimisticUpdate } from '../utils/optimisticUpdate';
import { toast } from '../utils/toast';

export interface MutationMessages {
  success?: string;
  loading?: string;
  error?: string;
}

export function useOptimisticMutation<T extends { id: string }>(
  setList: React.Dispatch<React.SetStateAction<T[]>>,
  options?: {
    onSuccess?: (action: 'insert' | 'update' | 'delete', item?: any) => void;
    onFailure?: (error: Error) => void;
  }
) {
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Execute mutation.
   * - operation: 'insert' | 'update' | 'delete'
   * - data: For 'insert', Omit<T, 'id'>. For 'update', { id: string, updates: Partial<T> }. For 'delete', string id.
   * - saveFn: Promise returning authoritative database item (or void for delete).
   */
  const mutate = async (
    originalList: T[],
    operation: 'insert' | 'update' | 'delete',
    data: any,
    saveFn: () => Promise<any>,
    msgs?: MutationMessages
  ) => {
    if (isSaving) return;
    setIsSaving(true);

    const tempId = operation === 'insert' ? (data.id || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`) : '';

    // Apply optimistic local updates
    if (operation === 'insert') {
      setList((prev) => optimisticUpdate.insert(prev, data, tempId));
    } else if (operation === 'update') {
      const { id, updates } = data;
      setList((prev) => optimisticUpdate.update(prev, id, updates));
    } else if (operation === 'delete') {
      setList((prev) => optimisticUpdate.delete(prev, data));
    }

    // Wrap state confirmation in promise chain
    const executionPromise = (async () => {
      let result;
      if (operation === 'insert') {
        result = await saveFn();
        setList((prev) => optimisticUpdate.confirmInsert(prev, tempId, result));
      } else if (operation === 'update') {
        result = await saveFn();
        setList((prev) => prev.map((item) => (item.id === data.id ? result : item)));
      } else if (operation === 'delete') {
        await saveFn();
      }
      return result;
    })();

    try {
      let result;
      if (msgs?.loading) {
        result = await toast.promise(executionPromise, {
          loading: msgs.loading,
          success: msgs.success || 'Operation succeeded.',
          error: (err) => msgs.error || err.message || 'Operation failed. State rolled back.'
        });
      } else {
        result = await executionPromise;
        if (msgs?.success) {
          toast.success(msgs.success);
        }
      }
      options?.onSuccess?.(operation, result);
      return result;
    } catch (err: any) {
      // Automatic transactional state rollback
      setList(originalList);
      options?.onFailure?.(err);
      if (!msgs?.loading) {
        toast.error(err.message || 'Operation failed. State rolled back.');
      }
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return { mutate, isSaving };
}
