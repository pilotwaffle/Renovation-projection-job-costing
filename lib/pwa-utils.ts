import { Workbox } from 'workbox-window';
import { syncManager } from './sync-manager';
import { offlineStorage } from './offline-storage';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

class PWAUtils {
  private wb: Workbox | null = null;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.wb = new Workbox('/sw.js');

        // Handle service worker updates
        this.wb.addEventListener('waiting', (event) => {
          if (confirm('A new version of the app is available. Update now?')) {
            this.wb?.messageSkipWaiting();
          }
        });

        this.wb.addEventListener('controlling', () => {
          console.log('Service worker is now controlling the page');
          window.location.reload();
        });

        this.wb.addEventListener('externalactivated', () => {
          console.log('External service worker activated');
          window.location.reload();
        });

        // Register the service worker
        this.swRegistration = await this.wb.register();
        console.log('Service worker registered successfully');

        // Set up push notifications
        this.setupPushNotifications();

        return this.swRegistration;
      } catch (error) {
        console.error('Service worker registration failed:', error);
        throw error;
      }
    } else {
      console.warn('Service workers are not supported');
    }
  }

  private setupPushNotifications() {
    if (!this.swRegistration) return;

    // Request notification permission
    if ('Notification' in window && 'serviceWorker' in navigator) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
          this.subscribeToPushNotifications();
        }
      });
    }
  }

  private async subscribeToPushNotifications() {
    if (!this.swRegistration) return;

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        ),
      });

      // Send subscription to server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      console.log('Push notification subscription successful');
    } catch (error) {
      console.error('Push notification subscription failed:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // App installation
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      return false;
    });
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      return false;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('App installed successfully');
    } else {
      console.log('App install dismissed');
    }

    this.deferredPrompt = null;
    return outcome === 'accepted';
  }

  canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  // Network monitoring
  isOnline(): boolean {
    return navigator.onLine;
  }

  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      console.log('App is online');
      this.showNotification('Connection restored', 'success');
      syncManager.forceSync();
    });

    window.addEventListener('offline', () => {
      console.log('App is offline');
      this.showNotification('Working offline', 'warning');
    });
  }

  // Notifications
  showNotification(title: string, options: NotificationOptions = {}) {
    if ('serviceWorker' in navigator && this.swRegistration) {
      this.swRegistration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options,
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options,
      });
    }
  }

  // Storage management
  async getStorageInfo() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
        available: (estimate.quota || 0) - (estimate.usage || 0),
      };
    }
    return null;
  }

  async clearStorage() {
    try {
      // Clear IndexedDB
      await offlineStorage.clearAll();

      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      this.showNotification('App data cleared successfully', 'success');
    } catch (error) {
      console.error('Failed to clear storage:', error);
      this.showNotification('Failed to clear app data', 'error');
    }
  }

  // Device capabilities
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      isStandalone: this.isStandalone(),
      screenResolution: `${screen.width}x${screen.height}`,
      pixelRatio: window.devicePixelRatio,
    };
  }

  private isStandalone(): boolean {
    return (
      (window.matchMedia('(display-mode: standalone)').matches) ||
      ('standalone' in window && (window as any).standalone === true) ||
      (navigator as any).standalone === true
    );
  }

  // PWA features availability
  getPWAFeatures() {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notifications: 'Notification' in window,
      beforeInstallPrompt: 'beforeinstallprompt' in window,
      shareAPI: 'share' in navigator,
      webShareAPI: 'navigator' in window && 'share' in navigator,
      clipboard: 'clipboard' in navigator,
      storage: 'storage' in navigator,
      indexedDB: 'indexedDB' in window,
      geolocation: 'geolocation' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      wakeLock: 'wakeLock' in navigator,
      backgroundSync: 'serviceWorker' in navigator && 'SyncManager' in window,
    };
  }

  // Performance monitoring
  async getPerformanceMetrics() {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      return {
        // Core Web Vitals
        LCP: this.getLCP(),
        FID: this.getFID(),
        CLS: this.getCLS(),

        // Navigation timing
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint(),

        // Memory usage (if available)
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        } : null,
      };
    }
    return null;
  }

  private getLCP(): number {
    const entries = performance.getEntriesByType('largest-contentful-paint');
    return entries.length > 0 ? entries[entries.length - 1].startTime : 0;
  }

  private getFID(): number {
    const entries = performance.getEntriesByType('first-input');
    return entries.length > 0 ? entries[0].processingStart - entries[0].startTime : 0;
  }

  private getCLS(): number {
    let clsValue = 0;
    const entries = performance.getEntriesByType('layout-shift') as PerformanceEntry[];

    for (const entry of entries) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }

    return clsValue;
  }

  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint ? firstContentfulPaint : 0;
  }
}

export const pwaUtils = new PWAUtils();