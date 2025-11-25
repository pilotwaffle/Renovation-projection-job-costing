interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  jobId: string;
  clientId: string;
}

interface LocationTrackingSession {
  id: string;
  jobId: string;
  startTime: number;
  endTime?: number;
  locations: LocationData[];
  distance: number; // total distance traveled in meters
}

class LocationUtils {
  private watchId: number | null = null;
  private currentSession: LocationTrackingSession | null = null;
  private geofences: Geofence[] = [];
  private isTracking: boolean = false;

  constructor() {
    this.loadGeofences();
  }

  // Check if geolocation is supported
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  // Request permission for location access
  async requestLocationPermission(): Promise<GeolocationPosition> {
    if (!this.isGeolocationSupported()) {
      throw new Error('Geolocation is not supported by this device');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  // Get current position once
  async getCurrentPosition(options?: PositionOptions): Promise<LocationData> {
    if (!this.isGeolocationSupported()) {
      throw new Error('Geolocation is not supported by this device');
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000, // 30 seconds
          ...options,
        }
      );
    });

    return this.formatLocationData(position);
  }

  // Start location tracking for a job
  startLocationTracking(jobId: string): LocationTrackingSession {
    if (this.isTracking) {
      throw new Error('Location tracking is already active');
    }

    this.currentSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      startTime: Date.now(),
      locations: [],
      distance: 0,
    };

    this.isTracking = true;

    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.handlePositionUpdate(position);
      },
      (error) => {
        console.error('Location tracking error:', error);
        this.handleLocationError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
        distanceFilter: 5, // minimum distance in meters
      }
    );

    return this.currentSession;
  }

  // Stop location tracking
  stopLocationTracking(): LocationTrackingSession | null {
    if (!this.isTracking || !this.currentSession) {
      return null;
    }

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.currentSession.endTime = Date.now();
    this.isTracking = false;

    const session = this.currentSession;
    this.currentSession = null;

    // Save session to local storage
    this.saveTrackingSession(session);

    return session;
  }

  private handlePositionUpdate(position: GeolocationPosition) {
    if (!this.currentSession) return;

    const locationData = this.formatLocationData(position);
    this.currentSession.locations.push(locationData);

    // Calculate distance
    if (this.currentSession.locations.length > 1) {
      const lastLocation = this.currentSession.locations[this.currentSession.locations.length - 2];
      const distance = this.calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        locationData.latitude,
        locationData.longitude
      );
      this.currentSession.distance += distance;
    }

    // Check geofences
    this.checkGeofences(locationData);

    // Dispatch event for real-time updates
    window.dispatchEvent(new CustomEvent('locationUpdate', {
      detail: { session: this.currentSession, location: locationData }
    }));
  }

  private handleLocationError(error: GeolocationPositionError) {
    const errorMessage = this.getGeolocationErrorMessage(error);

    window.dispatchEvent(new CustomEvent('locationError', {
      detail: { error, message: errorMessage }
    }));
  }

  private getGeolocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied by user';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable';
      case error.TIMEOUT:
        return 'Location request timed out';
      default:
        return 'Unknown location error occurred';
    }
  }

  private formatLocationData(position: GeolocationPosition): LocationData {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude || undefined,
      altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined,
      timestamp: position.timestamp,
    };
  }

  // Geofence management
  async createGeofence(geofence: Omit<Geofence, 'id'>): Promise<Geofence> {
    const newGeofence: Geofence = {
      ...geofence,
      id: `geofence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.geofences.push(newGeofence);
    await this.saveGeofences();

    return newGeofence;
  }

  async updateGeofence(id: string, updates: Partial<Geofence>): Promise<Geofence> {
    const index = this.geofences.findIndex(g => g.id === id);
    if (index === -1) {
      throw new Error('Geofence not found');
    }

    this.geofences[index] = { ...this.geofences[index], ...updates };
    await this.saveGeofences();

    return this.geofences[index];
  }

  async deleteGeofence(id: string): Promise<void> {
    this.geofences = this.geofences.filter(g => g.id !== id);
    await this.saveGeofences();
  }

  getGeofences(): Geofence[] {
    return [...this.geofences];
  }

  private checkGeofences(location: LocationData) {
    for (const geofence of this.geofences) {
      const distance = this.calculateDistance(
        geofence.latitude,
        geofence.longitude,
        location.latitude,
        location.longitude
      );

      const isInside = distance <= geofence.radius;

      window.dispatchEvent(new CustomEvent('geofenceUpdate', {
        detail: {
          geofence,
          location,
          isInside,
          distance,
        }
      }));
    }
  }

  // Calculate distance between two points using Haversine formula
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance in meters
  }

  // Get address from coordinates using reverse geocoding
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      // Using Nominatim (OpenStreetMap) for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RenovationJobCosting/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  }

  // Get tracking sessions
  async getTrackingSessions(jobId?: string): Promise<LocationTrackingSession[]> {
    const sessions = await this.loadTrackingSessions();
    return jobId ? sessions.filter(s => s.jobId === jobId) : sessions;
  }

  // Utility methods
  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      currentSession: this.currentSession,
      watchId: this.watchId,
      geofenceCount: this.geofences.length,
    };
  }

  // Storage methods
  private async saveGeofences() {
    try {
      localStorage.setItem('geofences', JSON.stringify(this.geofences));
    } catch (error) {
      console.error('Failed to save geofences:', error);
    }
  }

  private async loadGeofences() {
    try {
      const stored = localStorage.getItem('geofences');
      if (stored) {
        this.geofences = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load geofences:', error);
    }
  }

  private async saveTrackingSession(session: LocationTrackingSession) {
    try {
      const sessions = await this.loadTrackingSessions();
      sessions.push(session);

      // Keep only last 100 sessions to prevent storage bloat
      if (sessions.length > 100) {
        sessions.splice(0, sessions.length - 100);
      }

      localStorage.setItem('locationTrackingSessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save tracking session:', error);
    }
  }

  private async loadTrackingSessions(): Promise<LocationTrackingSession[]> {
    try {
      const stored = localStorage.getItem('locationTrackingSessions');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load tracking sessions:', error);
      return [];
    }
  }

  // Export data for backup
  async exportLocationData() {
    return {
      geofences: this.geofences,
      sessions: await this.loadTrackingSessions(),
      currentSession: this.currentSession,
    };
  }

  // Cleanup methods
  clearAllData() {
    this.geofences = [];
    localStorage.removeItem('geofences');
    localStorage.removeItem('locationTrackingSessions');

    if (this.isTracking) {
      this.stopLocationTracking();
    }
  }
}

export const locationUtils = new LocationUtils();
export type { LocationData, Geofence, LocationTrackingSession };