import { offlineStorage, type SyncQueueItem } from './offline-storage';
import { supabase } from './supabase';

type SyncResult = {
  success: boolean;
  item: SyncQueueItem;
  error?: string;
};

class SyncManager {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private startPeriodicSync() {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingChanges();
      }
    }, 30000);
  }

  async addToSyncQueue(
    action: 'create' | 'update' | 'delete',
    resource: 'jobs' | 'clients' | 'time_entries' | 'cost_items',
    data: any
  ) {
    const syncItem = {
      action,
      resource,
      data,
      timestamp: Date.now(),
    };

    return await offlineStorage.addToSyncQueue(syncItem);
  }

  async syncPendingChanges(): Promise<SyncResult[]> {
    if (!this.isOnline || this.syncInProgress) {
      return [];
    }

    this.syncInProgress = true;

    try {
      const queue = await offlineStorage.getSyncQueue();
      const results: SyncResult[] = [];

      // Process items in order (oldest first)
      const sortedQueue = queue.sort((a, b) => a.timestamp - b.timestamp);

      for (const item of sortedQueue) {
        try {
          const result = await this.processSyncItem(item);
          results.push(result);

          if (result.success) {
            await offlineStorage.removeFromSyncQueue(item.id!);
          } else {
            // Update retry count
            await offlineStorage.updateSyncQueueItem(item.id!, {
              retryCount: (item.retryCount || 0) + 1,
            });
          }
        } catch (error) {
          results.push({
            success: false,
            item,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Update retry count
          await offlineStorage.updateSyncQueueItem(item.id!, {
            retryCount: (item.retryCount || 0) + 1,
          });
        }
      }

      // Clean up old items with too many retries
      await this.cleanupOldFailedItems();

      return results;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processSyncItem(item: SyncQueueItem): Promise<SyncResult> {
    const { action, resource, data } = item;

    try {
      switch (resource) {
        case 'jobs':
          return await this.syncJob(action, data, item);
        case 'clients':
          return await this.syncClient(action, data, item);
        case 'time_entries':
          return await this.syncTimeEntry(action, data, item);
        case 'cost_items':
          return await this.syncCostItem(action, data, item);
        default:
          throw new Error(`Unknown resource: ${resource}`);
      }
    } catch (error) {
      return {
        success: false,
        item,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  private async syncJob(action: string, data: any, item: SyncQueueItem): Promise<SyncResult> {
    switch (action) {
      case 'create': {
        const { data: result, error } = await supabase
          .from('jobs')
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        // Update local data with server-generated ID
        await offlineStorage.saveJob(result);
        return { success: true, item };
      }

      case 'update': {
        const { error } = await supabase
          .from('jobs')
          .update(data)
          .eq('id', data.id);

        if (error) throw error;
        return { success: true, item };
      }

      case 'delete': {
        const { error } = await supabase
          .from('jobs')
          .delete()
          .eq('id', data.id);

        if (error) throw error;
        return { success: true, item };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async syncClient(action: string, data: any, item: SyncQueueItem): Promise<SyncResult> {
    switch (action) {
      case 'create': {
        const { data: result, error } = await supabase
          .from('clients')
          .insert(data)
          .select()
          .single();

        if (error) throw error;
        await offlineStorage.saveClient(result);
        return { success: true, item };
      }

      case 'update': {
        const { error } = await supabase
          .from('clients')
          .update(data)
          .eq('id', data.id);

        if (error) throw error;
        return { success: true, item };
      }

      case 'delete': {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', data.id);

        if (error) throw error;
        return { success: true, item };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async syncTimeEntry(action: string, data: any, item: SyncQueueItem): Promise<SyncResult> {
    switch (action) {
      case 'create': {
        const { data: result, error } = await supabase
          .from('time_entries')
          .insert(data)
          .select()
          .single();

        if (error) throw error;
        await offlineStorage.saveTimeEntry(result);
        return { success: true, item };
      }

      case 'update': {
        const { error } = await supabase
          .from('time_entries')
          .update(data)
          .eq('id', data.id);

        if (error) throw error;
        return { success: true, item };
      }

      case 'delete': {
        const { error } = await supabase
          .from('time_entries')
          .delete()
          .eq('id', data.id);

        if (error) throw error;
        return { success: true, item };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async syncCostItem(action: string, data: any, item: SyncQueueItem): Promise<SyncResult> {
    switch (action) {
      case 'create': {
        const { data: result, error } = await supabase
          .from('cost_items')
          .insert(data)
          .select()
          .single();

        if (error) throw error;
        await offlineStorage.saveCostItem(result);
        return { success: true, item };
      }

      case 'update': {
        const { error } = await supabase
          .from('cost_items')
          .update(data)
          .eq('id', data.id);

        if (error) throw error;
        return { success: true, item };
      }

      case 'delete': {
        const { error } = await supabase
          .from('cost_items')
          .delete()
          .eq('id', data.id);

        if (error) throw error;
        return { success: true, item };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async cleanupOldFailedItems() {
    const queue = await offlineStorage.getSyncQueue();
    const maxRetries = 5;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const item of queue) {
      const retryCount = item.retryCount || 0;
      const age = Date.now() - item.timestamp;

      if (retryCount >= maxRetries || age > maxAge) {
        await offlineStorage.removeFromSyncQueue(item.id!);
      }
    }
  }

  async forceSync(): Promise<SyncResult[]> {
    return await this.syncPendingChanges();
  }

  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
    };
  }

  async getPendingSyncCount(): Promise<number> {
    const queue = await offlineStorage.getSyncQueue();
    return queue.length;
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const syncManager = new SyncManager();