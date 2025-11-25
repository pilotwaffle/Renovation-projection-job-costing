'use client';

import { useState, useEffect, useCallback } from 'react';
import { pwaUtils } from '@/lib/pwa-utils';
import { syncManager } from '@/lib/sync-manager';
import { offlineStorage } from '@/lib/offline-storage';
import { locationUtils } from '@/lib/location-utils';

interface PWAState {
  isSupported: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  syncInProgress: boolean;
  pendingSyncCount: number;
  canInstall: boolean;
  locationTrackingActive: boolean;
  notifications: {
    supported: boolean;
    permission: NotificationPermission;
  };
}

interface StorageInfo {
  quota: number;
  usage: number;
  available: number;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isSupported: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    syncInProgress: false,
    pendingSyncCount: 0,
    canInstall: false,
    locationTrackingActive: false,
    notifications: {
      supported: false,
      permission: 'default',
    },
  });

  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

  // Initialize PWA
  useEffect(() => {
    const initializePWA = async () => {
      try {
        // Check PWA support
        const features = pwaUtils.getPWAFeatures();
        const isSupported = features.serviceWorker && features.indexedDB;

        if (isSupported) {
          // Initialize offline storage
          await offlineStorage.init();

          // Register service worker
          await pwaUtils.registerServiceWorker();

          // Setup install prompt
          pwaUtils.setupInstallPrompt();

          // Setup network monitoring
          pwaUtils.setupNetworkMonitoring();
        }

        setState(prev => ({
          ...prev,
          isSupported,
          isInstalled: features.serviceWorker ? pwaUtils.getDeviceInfo().isStandalone : false,
          canInstall: features.beforeInstallPrompt ? pwaUtils.canInstall() : false,
          notifications: {
            supported: features.notifications || false,
            permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
          },
        }));
      } catch (error) {
        console.error('PWA initialization failed:', error);
      }
    };

    initializePWA();
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync status monitoring
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateSyncStatus = async () => {
      const syncStatus = syncManager.getSyncStatus();
      const pendingCount = await syncManager.getPendingSyncCount();

      setState(prev => ({
        ...prev,
        syncInProgress: syncStatus.syncInProgress,
        pendingSyncCount: pendingCount,
      }));
    };

    updateSyncStatus();
    interval = setInterval(updateSyncStatus, 5000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Location tracking monitoring
  useEffect(() => {
    const updateLocationStatus = () => {
      const status = locationUtils.getTrackingStatus();
      setState(prev => ({
        ...prev,
        locationTrackingActive: status.isTracking,
      }));
    };

    // Initial update
    updateLocationStatus();

    // Listen for location tracking events
    window.addEventListener('locationUpdate', updateLocationStatus);

    return () => {
      window.removeEventListener('locationUpdate', updateLocationStatus);
    };
  }, []);

  // Storage monitoring
  useEffect(() => {
    const updateStorageInfo = async () => {
      const info = await pwaUtils.getStorageInfo();
      setStorageInfo(info);
    };

    updateStorageInfo();
    const interval = setInterval(updateStorageInfo, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Actions
  const installApp = useCallback(async () => {
    try {
      const installed = await pwaUtils.promptInstall();
      if (installed) {
        setState(prev => ({ ...prev, isInstalled: true, canInstall: false }));
      }
      return installed;
    } catch (error) {
      console.error('App installation failed:', error);
      return false;
    }
  }, []);

  const forceSync = useCallback(async () => {
    try {
      const results = await syncManager.forceSync();
      return results;
    } catch (error) {
      console.error('Force sync failed:', error);
      return [];
    }
  }, []);

  const clearStorage = useCallback(async () => {
    try {
      await pwaUtils.clearStorage();
      // Update storage info after clearing
      const info = await pwaUtils.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Clear storage failed:', error);
    }
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    pwaUtils.showNotification(title, options);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setState(prev => ({
        ...prev,
        notifications: { ...prev.notifications, permission },
      }));
      return permission;
    }
    return 'denied';
  }, []);

  const getDeviceInfo = useCallback(() => {
    return pwaUtils.getDeviceInfo();
  }, []);

  const getPWAFeatures = useCallback(() => {
    return pwaUtils.getPWAFeatures();
  }, []);

  const getPerformanceMetrics = useCallback(async () => {
    return await pwaUtils.getPerformanceMetrics();
  }, []);

  return {
    state,
    storageInfo,
    actions: {
      installApp,
      forceSync,
      clearStorage,
      showNotification,
      requestNotificationPermission,
      getDeviceInfo,
      getPWAFeatures,
      getPerformanceMetrics,
    },
  };
}