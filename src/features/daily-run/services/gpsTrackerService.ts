import { GPSCoordinate, GPSErrorCode, IGPSTracker, LocationPermissionState } from '../types';

export interface GPSErrorPayload {
  code: GPSErrorCode;
  message: string;
}

export class GPSTrackerService implements IGPSTracker {
  private activeWatchId: number | null = null;
  private standbyWatchId: number | null = null;
  private isRecordingActive = false;
  private isStandbyActive = false;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Checks the current browser location permission state without triggering a prompt
   */
  public async checkPermissionState(): Promise<LocationPermissionState> {
    if (!this.isSupported()) {
      return 'unsupported';
    }

    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
      try {
        // Query geolocation permission
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (status.state === 'granted') return 'granted';
        if (status.state === 'denied') return 'denied';
        return 'prompt';
      } catch {
        // Fallback if query throws or isn't supported for geolocation
        return 'prompt';
      }
    }

    return 'prompt';
  }

  /**
   * One-time position lookup with high accuracy
   */
  public getCurrentPosition(timeoutMs = 12000): Promise<GPSCoordinate> {
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
          timeout: timeoutMs,
          maximumAge: 5000,
        }
      );
    });
  }

  /**
   * Standby / Preview location tracking:
   * Keeps track of user's current GPS location and accuracy circle while viewing the Run screen (idle),
   * WITHOUT recording running segments, accumulating distance, or writing to storage.
   */
  public startStandbyTracking(
    onPosition: (pos: GPSCoordinate) => void,
    onError?: (error: GPSErrorPayload) => void
  ): void {
    if (!this.isSupported()) {
      if (onError) {
        onError({
          code: 'unsupported',
          message: 'Geolocation is not supported by this browser.',
        });
      }
      return;
    }

    // If active run is already recording, do not start standby
    if (this.isRecordingActive) {
      return;
    }

    this.stopStandbyTracking();
    this.isStandbyActive = true;

    // Immediate initial fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!this.isStandbyActive) return;
        onPosition(this.normalizePosition(pos));
      },
      (err) => {
        if (!this.isStandbyActive) return;
        if (onError) onError(this.normalizeError(err));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );

    // Continuous updates while Run screen is visible
    try {
      this.standbyWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!this.isStandbyActive) return;
          onPosition(this.normalizePosition(pos));
        },
        (err) => {
          if (!this.isStandbyActive) return;
          if (onError) onError(this.normalizeError(err));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    } catch (e) {
      this.isStandbyActive = false;
      if (onError) {
        onError({
          code: 'position_unavailable',
          message: 'Unable to start GPS position updates.',
        });
      }
    }
  }

  public stopStandbyTracking(): void {
    this.isStandbyActive = false;
    if (this.standbyWatchId !== null) {
      try {
        navigator.geolocation.clearWatch(this.standbyWatchId);
      } catch {
        // ignore
      }
      this.standbyWatchId = null;
    }
  }

  /**
   * Active run recording tracking:
   * Starts high-frequency, zero-cached-age GPS watching for the active running session.
   */
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

    // Stop standby watching as active recording takes precedence
    this.stopStandbyTracking();
    this.stopTracking();

    try {
      this.isRecordingActive = true;
      this.activeWatchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!this.isRecordingActive) return;
          const coord = this.normalizePosition(position);
          onPosition(coord);
        },
        (error) => {
          if (!this.isRecordingActive) return;
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
      this.isRecordingActive = false;
      onError({
        code: 'position_unavailable',
        message: 'Unable to start active GPS recording. Please check your browser settings.',
      });
    }
  }

  public stopTracking(): void {
    this.isRecordingActive = false;
    if (this.activeWatchId !== null) {
      try {
        navigator.geolocation.clearWatch(this.activeWatchId);
      } catch {
        // ignore
      }
      this.activeWatchId = null;
    }
  }

  public stopAll(): void {
    this.stopStandbyTracking();
    this.stopTracking();
  }

  public isWatching(): boolean {
    return (this.isRecordingActive && this.activeWatchId !== null) ||
           (this.isStandbyActive && this.standbyWatchId !== null);
  }

  private normalizePosition(position: GeolocationPosition): GPSCoordinate {
    return {
      latitude: Number(position.coords.latitude.toFixed(6)),
      longitude: Number(position.coords.longitude.toFixed(6)),
      altitude: position.coords.altitude != null ? Number(position.coords.altitude.toFixed(1)) : null,
      accuracy: position.coords.accuracy != null ? Math.round(position.coords.accuracy) : null,
      speed: position.coords.speed != null && position.coords.speed >= 0 ? Number(position.coords.speed.toFixed(2)) : null,
      heading: position.coords.heading != null && !isNaN(position.coords.heading) ? Math.round(position.coords.heading) : null,
      timestamp: position.timestamp || Date.now(),
    };
  }

  private normalizeError(error: GeolocationPositionError): GPSErrorPayload {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return {
          code: 'permission_denied',
          message: 'Location permission was denied. Please allow location access in your browser or device settings to track your run.',
        };
      case error.POSITION_UNAVAILABLE:
        return {
          code: 'position_unavailable',
          message: 'GPS location is currently unavailable. Please verify Location Services are enabled on your device.',
        };
      case error.TIMEOUT:
        return {
          code: 'timeout',
          message: 'GPS satellite search timed out. Move to an outdoor area with an unobstructed view of the sky.',
        };
      default:
        return {
          code: 'position_unavailable',
          message: 'Unable to detect your GPS position. Please try again.',
        };
    }
  }
}

export const gpsTrackerService = new GPSTrackerService();
