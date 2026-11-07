import { GPSCoordinate, GPSErrorCode, IGPSTracker } from '../types';

export interface GPSErrorPayload {
  code: GPSErrorCode;
  message: string;
}

export class GPSTrackerService implements IGPSTracker {
  private watchId: number | null = null;
  private isTrackingActive = false;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }

  public getCurrentPosition(): Promise<GPSCoordinate> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject({
          code: 'unsupported' as GPSErrorCode,
          message: 'Geolocation is not supported by your browser.',
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(this.normalizePosition(position));
        },
        (error) => {
          reject(this.normalizeError(error));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }

  public startTracking(
    onPosition: (pos: GPSCoordinate) => void,
    onError: (error: GPSErrorPayload) => void
  ): void {
    if (!this.isSupported()) {
      onError({
        code: 'unsupported',
        message: 'Geolocation is not supported by this browser.',
      });
      return;
    }

    // Clean up any existing watch to prevent duplicate location subscriptions
    this.stopTracking();

    try {
      this.isTrackingActive = true;
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!this.isTrackingActive) return;
          const coord = this.normalizePosition(position);
          onPosition(coord);
        },
        (error) => {
          if (!this.isTrackingActive) return;
          const errPayload = this.normalizeError(error);
          onError(errPayload);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        }
      );
    } catch (e) {
      this.isTrackingActive = false;
      onError({
        code: 'position_unavailable',
        message: 'Unable to start GPS tracking. Please check your browser settings.',
      });
    }
  }

  public stopTracking(): void {
    this.isTrackingActive = false;
    if (this.watchId !== null) {
      try {
        navigator.geolocation.clearWatch(this.watchId);
      } catch {
        // ignore
      }
      this.watchId = null;
    }
  }

  public isWatching(): boolean {
    return this.isTrackingActive && this.watchId !== null;
  }

  private normalizePosition(position: GeolocationPosition): GPSCoordinate {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading,
      timestamp: position.timestamp || Date.now(),
    };
  }

  private normalizeError(error: GeolocationPositionError): GPSErrorPayload {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return {
          code: 'permission_denied',
          message: 'Location permission is required to record your run.',
        };
      case error.POSITION_UNAVAILABLE:
        return {
          code: 'position_unavailable',
          message: 'Unable to detect your location. Please try again.',
        };
      case error.TIMEOUT:
        return {
          code: 'timeout',
          message: 'GPS is taking longer than expected. Move to an open area.',
        };
      default:
        return {
          code: 'position_unavailable',
          message: 'Unable to detect your location. Please try again.',
        };
    }
  }
}

export const gpsTrackerService = new GPSTrackerService();
