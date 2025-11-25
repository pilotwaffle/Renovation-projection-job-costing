'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { locationUtils, type LocationData, type Geofence, type LocationTrackingSession } from '@/lib/location-utils';

interface LocationState {
  isSupported: boolean;
  hasPermission: boolean;
  currentPosition: LocationData | null;
  isTracking: boolean;
  currentSession: LocationTrackingSession | null;
  geofences: Geofence[];
  lastError: string | null;
  trackingHistory: LocationTrackingSession[];
}

interface GeofenceStatus {
  geofence: Geofence;
  isInside: boolean;
  distance: number;
  lastChecked: number;
}

export function useLocationTracking() {
  const [state, setState] = useState<LocationState>({
    isSupported: false,
    hasPermission: false,
    currentPosition: null,
    isTracking: false,
    currentSession: null,
    geofences: [],
    lastError: null,
    trackingHistory: [],
  });

  const [geofenceStatuses, setGeofenceStatuses] = useState<Map<string, GeofenceStatus>>(new Map());
  const eventListeners = useRef<Map<string, EventListener>>(new Map());

  // Initialize location tracking
  useEffect(() => {
    const initializeLocation = async () => {
      const isSupported = locationUtils.isGeolocationSupported();

      if (isSupported) {
        try {
          // Check if we have location permission
          const position = await locationUtils.getCurrentPosition({ timeout: 5000 });
          const geofences = locationUtils.getGeofences();
          const history = await locationUtils.getTrackingSessions();

          setState(prev => ({
            ...prev,
            isSupported: true,
            hasPermission: true,
            currentPosition: position,
            geofences,
            trackingHistory: history,
          }));
        } catch (error) {
          // Permission denied or unavailable
          setState(prev => ({
            ...prev,
            isSupported: true,
            hasPermission: false,
            lastError: error instanceof Error ? error.message : 'Location access denied',
          }));
        }
      } else {
        setState(prev => ({
          ...prev,
          isSupported: false,
          lastError: 'Geolocation is not supported by this device',
        }));
      }
    };

    initializeLocation();
    setupEventListeners();

    return () => {
      cleanupEventListeners();
    };
  }, []);

  // Setup event listeners
  const setupEventListeners = () => {
    const locationUpdateHandler = (event: CustomEvent) => {
      const { session, location } = event.detail;
      setState(prev => ({
        ...prev,
        currentSession: session,
        currentPosition: location,
        isTracking: true,
        lastError: null,
      }));
    };

    const locationErrorHandler = (event: CustomEvent) => {
      const { message } = event.detail;
      setState(prev => ({
        ...prev,
        lastError: message,
      }));
    };

    const geofenceUpdateHandler = (event: CustomEvent) => {
      const { geofence, isInside, distance } = event.detail;

      setGeofenceStatuses(prev => {
        const newStatuses = new Map(prev);
        newStatuses.set(geofence.id, {
          geofence,
          isInside,
          distance,
          lastChecked: Date.now(),
        });
        return newStatuses;
      });
    };

    window.addEventListener('locationUpdate', locationUpdateHandler as EventListener);
    window.addEventListener('locationError', locationErrorHandler as EventListener);
    window.addEventListener('geofenceUpdate', geofenceUpdateHandler as EventListener);

    eventListeners.current.set('locationUpdate', locationUpdateHandler as EventListener);
    eventListeners.current.set('locationError', locationErrorHandler as EventListener);
    eventListeners.current.set('geofenceUpdate', geofenceUpdateHandler as EventListener);
  };

  const cleanupEventListeners = () => {
    eventListeners.current.forEach((listener, event) => {
      window.removeEventListener(event, listener);
    });
    eventListeners.current.clear();
  };

  // Actions
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      const position = await locationUtils.requestLocationPermission();
      setState(prev => ({
        ...prev,
        hasPermission: true,
        currentPosition: locationUtils.formatLocationData(position),
        lastError: null,
      }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        hasPermission: false,
        lastError: error instanceof Error ? error.message : 'Permission denied',
      }));
      return false;
    }
  }, []);

  const getCurrentPosition = useCallback(async (): Promise<LocationData | null> => {
    if (!state.hasPermission) {
      return null;
    }

    try {
      const position = await locationUtils.getCurrentPosition();
      setState(prev => ({
        ...prev,
        currentPosition: position,
        lastError: null,
      }));
      return position;
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Location fetch failed',
      }));
      return null;
    }
  }, [state.hasPermission]);

  const startTracking = useCallback(async (jobId: string): Promise<boolean> => {
    if (!state.hasPermission) {
      setState(prev => ({
        ...prev,
        lastError: 'Location permission required for tracking',
      }));
      return false;
    }

    try {
      const session = locationUtils.startLocationTracking(jobId);
      setState(prev => ({
        ...prev,
        isTracking: true,
        currentSession: session,
        lastError: null,
      }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Failed to start tracking',
      }));
      return false;
    }
  }, [state.hasPermission]);

  const stopTracking = useCallback((): LocationTrackingSession | null => {
    try {
      const session = locationUtils.stopLocationTracking();

      setState(prev => ({
        ...prev,
        isTracking: false,
        currentSession: null,
        trackingHistory: session ? [...prev.trackingHistory, session] : prev.trackingHistory,
      }));

      return session;
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Failed to stop tracking',
      }));
      return null;
    }
  }, []);

  const reverseGeocode = useCallback(async (latitude: number, longitude: number): Promise<string> => {
    try {
      return await locationUtils.reverseGeocode(latitude, longitude);
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Reverse geocoding failed',
      }));
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  }, []);

  // Geofence management
  const createGeofence = useCallback(async (geofenceData: Omit<Geofence, 'id'>): Promise<Geofence | null> => {
    try {
      const geofence = await locationUtils.createGeofence(geofenceData);
      setState(prev => ({
        ...prev,
        geofences: [...prev.geofences, geofence],
      }));
      return geofence;
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Failed to create geofence',
      }));
      return null;
    }
  }, []);

  const updateGeofence = useCallback(async (id: string, updates: Partial<Geofence>): Promise<Geofence | null> => {
    try {
      const updatedGeofence = await locationUtils.updateGeofence(id, updates);
      setState(prev => ({
        ...prev,
        geofences: prev.geofences.map(g => g.id === id ? updatedGeofence : g),
      }));
      return updatedGeofence;
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Failed to update geofence',
      }));
      return null;
    }
  }, []);

  const deleteGeofence = useCallback(async (id: string): Promise<boolean> => {
    try {
      await locationUtils.deleteGeofence(id);
      setState(prev => ({
        ...prev,
        geofences: prev.geofences.filter(g => g.id !== id),
      }));

      // Remove from geofence statuses
      setGeofenceStatuses(prev => {
        const newStatuses = new Map(prev);
        newStatuses.delete(id);
        return newStatuses;
      });

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Failed to delete geofence',
      }));
      return false;
    }
  }, []);

  const loadTrackingHistory = useCallback(async (jobId?: string): Promise<LocationTrackingSession[]> => {
    try {
      const history = await locationUtils.getTrackingSessions(jobId);
      setState(prev => ({
        ...prev,
        trackingHistory: history,
      }));
      return history;
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Failed to load tracking history',
      }));
      return [];
    }
  }, []);

  const clearLocationData = useCallback(() => {
    try {
      locationUtils.clearAllData();
      setState(prev => ({
        ...prev,
        geofences: [],
        trackingHistory: [],
        currentSession: null,
        isTracking: false,
      }));
      setGeofenceStatuses(new Map());
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Failed to clear location data',
      }));
    }
  }, []);

  return {
    state,
    geofenceStatuses: Array.from(geofenceStatuses.values()),
    actions: {
      requestLocationPermission,
      getCurrentPosition,
      startTracking,
      stopTracking,
      reverseGeocode,
      createGeofence,
      updateGeofence,
      deleteGeofence,
      loadTrackingHistory,
      clearLocationData,
    },
  };
}