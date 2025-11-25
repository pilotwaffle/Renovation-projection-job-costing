'use client';

import { useEffect, useState } from 'react';
import { offlineStorage } from '@/lib/offline-storage';
import { syncManager } from '@/lib/sync-manager';

interface InstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInitializer() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const initializePWA = async () => {
      try {
        // Initialize offline storage
        await offlineStorage.init();

        // Setup install prompt listener
        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          setDeferredPrompt(e as InstallPromptEvent);
        });

        // Setup online/offline listeners
        const handleOnline = () => {
          console.log('App is online');
          syncManager.forceSync();
        };

        const handleOffline = () => {
          console.log('App is offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        setIsInitialized(true);

        // Cleanup
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      } catch (error) {
        console.error('PWA initialization failed:', error);
      }
    };

    initializePWA();
  }, []);

  // Expose install function globally for other components to use
  useEffect(() => {
    (window as any).installPWA = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        return outcome === 'accepted';
      }
      return false;
    };
  }, [deferredPrompt]);

  if (!isInitialized) {
    return null;
  }

  return (
    <>
      {/* Install Banner */}
      {deferredPrompt && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-3 md:hidden">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">JC</span>
              </div>
              <div>
                <p className="font-medium text-sm">Install Job Costing App</p>
                <p className="text-xs opacity-90">Get instant access to your jobs</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setDeferredPrompt(null);
                }}
                className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded-lg text-xs font-medium transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={async () => {
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    setDeferredPrompt(null);
                  }
                }}
                className="px-3 py-1 bg-white text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium transition-colors"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Sync Status Indicator */}
      <SyncStatusIndicator />
    </>
  );
}

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
      isOnline
        ? 'bg-green-500 text-white'
        : 'bg-orange-500 text-white'
    }`}>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white' : 'bg-white animate-pulse'}`} />
        <span className="text-sm font-medium">
          {isOnline ? 'Back online' : 'You\'re offline'}
        </span>
      </div>
    </div>
  );
}

function SyncStatusIndicator() {
  const [syncStatus, setSyncStatus] = useState({
    inProgress: false,
    pendingCount: 0,
  });

  useEffect(() => {
    const updateSyncStatus = async () => {
      const status = syncManager.getSyncStatus();
      const pendingCount = await syncManager.getPendingSyncCount();
      setSyncStatus({
        inProgress: status.syncInProgress,
        pendingCount,
      });
    };

    // Initial update
    updateSyncStatus();

    // Update every 5 seconds
    const interval = setInterval(updateSyncStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  if (syncStatus.pendingCount === 0 && !syncStatus.inProgress) return null;

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 min-w-32">
        <div className="flex items-center space-x-2">
          {syncStatus.inProgress ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              <span className="text-sm text-gray-700">Syncing...</span>
            </>
          ) : (
            <>
              <div className="w-4 h-4 bg-orange-500 rounded-full" />
              <span className="text-sm text-gray-700">
                {syncStatus.pendingCount} pending
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}