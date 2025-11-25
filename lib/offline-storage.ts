import { openDB } from 'idb';
import type { Job, TimeEntry, CostItem, Client } from '@/types/database';

const DB_NAME = 'renovation-job-costing';
const DB_VERSION = 1;

// Database schema
const STORES = {
  jobs: 'jobs',
  clients: 'clients',
  timeEntries: 'time_entries',
  costItems: 'cost_items',
  syncQueue: 'sync_queue',
  offlineCache: 'offline_cache'
} as const;

interface SyncQueueItem {
  id?: number;
  action: 'create' | 'update' | 'delete';
  resource: 'jobs' | 'clients' | 'time_entries' | 'cost_items';
  data: any;
  timestamp: number;
  retryCount?: number;
}

interface OfflineCacheItem {
  url: string;
  response: Response;
  timestamp: number;
  expiration: number;
}

class OfflineStorage {
  private db: any;

  async init() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Jobs store
        if (!db.objectStoreNames.contains(STORES.jobs)) {
          const jobStore = db.createObjectStore(STORES.jobs, { keyPath: 'id' });
          jobStore.createIndex('client_id', 'client_id');
          jobStore.createIndex('status', 'status');
          jobStore.createIndex('created_at', 'created_at');
        }

        // Clients store
        if (!db.objectStoreNames.contains(STORES.clients)) {
          const clientStore = db.createObjectStore(STORES.clients, { keyPath: 'id' });
          clientStore.createIndex('name', 'name');
          clientStore.createIndex('created_at', 'created_at');
        }

        // Time entries store
        if (!db.objectStoreNames.contains(STORES.timeEntries)) {
          const timeStore = db.createObjectStore(STORES.timeEntries, { keyPath: 'id' });
          timeStore.createIndex('job_id', 'job_id');
          timeStore.createIndex('user_id', 'user_id');
          timeStore.createIndex('start_time', 'start_time');
          timeStore.createIndex('created_at', 'created_at');
        }

        // Cost items store
        if (!db.objectStoreNames.contains(STORES.costItems)) {
          const costStore = db.createObjectStore(STORES.costItems, { keyPath: 'id' });
          costStore.createIndex('job_id', 'job_id');
          costStore.createIndex('type', 'type');
          costStore.createIndex('created_at', 'created_at');
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(STORES.syncQueue)) {
          const syncStore = db.createObjectStore(STORES.syncQueue, {
            keyPath: 'id',
            autoIncrement: true
          });
          syncStore.createIndex('timestamp', 'timestamp');
          syncStore.createIndex('resource', 'resource');
        }

        // Offline cache store
        if (!db.objectStoreNames.contains(STORES.offlineCache)) {
          const cacheStore = db.createObjectStore(STORES.offlineCache, { keyPath: 'url' });
          cacheStore.createIndex('expiration', 'expiration');
        }
      },
    });
  }

  // Jobs
  async saveJob(job: Job) {
    const tx = this.db.transaction(STORES.jobs, 'readwrite');
    await tx.store.put(job);
    await tx.done;
    return job;
  }

  async getJob(id: string): Promise<Job | undefined> {
    return await this.db.get(STORES.jobs, id);
  }

  async getAllJobs(): Promise<Job[]> {
    return await this.db.getAll(STORES.jobs);
  }

  async deleteJob(id: string) {
    const tx = this.db.transaction(STORES.jobs, 'readwrite');
    await tx.store.delete(id);
    await tx.done;
  }

  // Clients
  async saveClient(client: Client) {
    const tx = this.db.transaction(STORES.clients, 'readwrite');
    await tx.store.put(client);
    await tx.done;
    return client;
  }

  async getClient(id: string): Promise<Client | undefined> {
    return await this.db.get(STORES.clients, id);
  }

  async getAllClients(): Promise<Client[]> {
    return await this.db.getAll(STORES.clients);
  }

  // Time entries
  async saveTimeEntry(entry: TimeEntry) {
    const tx = this.db.transaction(STORES.timeEntries, 'readwrite');
    await tx.store.put(entry);
    await tx.done;
    return entry;
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    return await this.db.get(STORES.timeEntries, id);
  }

  async getTimeEntriesByJob(jobId: string): Promise<TimeEntry[]> {
    return await this.db.getAllFromIndex(STORES.timeEntries, 'job_id', jobId);
  }

  // Cost items
  async saveCostItem(item: CostItem) {
    const tx = this.db.transaction(STORES.costItems, 'readwrite');
    await tx.store.put(item);
    await tx.done;
    return item;
  }

  async getCostItemsByJob(jobId: string): Promise<CostItem[]> {
    return await this.db.getAllFromIndex(STORES.costItems, 'job_id', jobId);
  }

  // Sync queue management
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id'>) {
    const syncItem: SyncQueueItem = {
      ...item,
      retryCount: 0,
    };
    const tx = this.db.transaction(STORES.syncQueue, 'readwrite');
    const result = await tx.store.add(syncItem);
    await tx.done;
    return result;
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return await this.db.getAll(STORES.syncQueue);
  }

  async getSyncQueueItemsByResource(resource: string): Promise<SyncQueueItem[]> {
    return await this.db.getAllFromIndex(STORES.syncQueue, 'resource', resource);
  }

  async removeFromSyncQueue(id: number) {
    const tx = this.db.transaction(STORES.syncQueue, 'readwrite');
    await tx.store.delete(id);
    await tx.done;
  }

  async updateSyncQueueItem(id: number, updates: Partial<SyncQueueItem>) {
    const item = await this.db.get(STORES.syncQueue, id);
    if (item) {
      const updatedItem = { ...item, ...updates };
      const tx = this.db.transaction(STORES.syncQueue, 'readwrite');
      await tx.store.put(updatedItem);
      await tx.done;
      return updatedItem;
    }
  }

  // Offline cache
  async cacheResponse(url: string, response: Response, ttl: number = 300000) { // 5 minutes default
    const expiration = Date.now() + ttl;
    const cacheItem: OfflineCacheItem = {
      url,
      response,
      timestamp: Date.now(),
      expiration,
    };
    const tx = this.db.transaction(STORES.offlineCache, 'readwrite');
    await tx.store.put(cacheItem);
    await tx.done;
  }

  async getCachedResponse(url: string): Promise<Response | undefined> {
    const item = await this.db.get(STORES.offlineCache, url);
    if (item && item.expiration > Date.now()) {
      return item.response;
    }
    if (item) {
      // Remove expired item
      const tx = this.db.transaction(STORES.offlineCache, 'readwrite');
      await tx.store.delete(url);
      await tx.done;
    }
    return undefined;
  }

  async clearExpiredCache() {
    const now = Date.now();
    const tx = this.db.transaction(STORES.offlineCache, 'readwrite');
    const store = tx.store;
    const index = store.index('expiration');

    let cursor = await index.openCursor();
    while (cursor) {
      if (cursor.value.expiration <= now) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  // Utility methods
  async clearAll() {
    const tx = this.db.transaction(Object.values(STORES), 'readwrite');
    for (const store of Object.values(STORES)) {
      await tx.objectStore(store).clear();
    }
    await tx.done;
  }

  async exportData() {
    const data = {
      jobs: await this.getAllJobs(),
      clients: await this.getAllClients(),
      timeEntries: await this.db.getAll(STORES.timeEntries),
      costItems: await this.db.getAll(STORES.costItems),
      syncQueue: await this.getSyncQueue(),
    };
    return data;
  }

  async importData(data: any) {
    const tx = this.db.transaction(Object.values(STORES), 'readwrite');

    if (data.jobs) {
      for (const job of data.jobs) {
        await tx.objectStore(STORES.jobs).put(job);
      }
    }

    if (data.clients) {
      for (const client of data.clients) {
        await tx.objectStore(STORES.clients).put(client);
      }
    }

    if (data.timeEntries) {
      for (const entry of data.timeEntries) {
        await tx.objectStore(STORES.timeEntries).put(entry);
      }
    }

    if (data.costItems) {
      for (const item of data.costItems) {
        await tx.objectStore(STORES.costItems).put(item);
      }
    }

    await tx.done;
  }
}

export const offlineStorage = new OfflineStorage();
export type { SyncQueueItem, OfflineCacheItem };