export const optimisticUpdate = {
  /**
   * Captures a copy of the current state array to preserve for rollback.
   */
  snapshot<T>(list: T[]): T[] {
    return [...list];
  },

  /**
   * Optimistically prepends a new record with a temporary ID.
   */
  insert<T extends { id: string }>(
    list: T[],
    newItem: Omit<T, 'id'> & { id?: string },
    tempId: string
  ): T[] {
    const optimisticItem = { ...newItem, id: tempId } as T;
    return [optimisticItem, ...list];
  },

  /**
   * Optimistically applies a delta change or partial modification to an existing item.
   */
  update<T extends { id: string }>(
    list: T[],
    id: string,
    updates: Partial<T>
  ): T[] {
    return list.map((item) => {
      if (item.id === id) {
        return { ...item, ...updates } as T;
      }
      return item;
    });
  },

  /**
   * Optimistically removes a record by filtering it out from the current list.
   */
  delete<T extends { id: string }>(list: T[], id: string): T[] {
    return list.filter((item) => item.id !== id);
  },

  /**
   * Replaces the temporary optimistic entry with the server's authoritative response.
   */
  confirmInsert<T extends { id: string }>(
    list: T[],
    tempId: string,
    authoritativeItem: T
  ): T[] {
    return list.map((item) => (item.id === tempId ? authoritativeItem : item));
  }
};
