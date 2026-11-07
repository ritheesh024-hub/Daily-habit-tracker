/**
 * Formats seconds into HH:MM:SS format
 * Example: 0 -> "00:00:00", 65 -> "00:01:05", 3661 -> "01:01:01"
 */
export function formatRunDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0 || isNaN(totalSeconds)) {
    return '00:00:00';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats distance in kilometers to 2 decimal places
 * Example: 0 -> "0.00", 5.234 -> "5.23"
 */
export function formatRunDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || isNaN(km)) {
    return '0.00';
  }
  return km.toFixed(2);
}

/**
 * Formats running pace in minutes and seconds per kilometer
 * Example: null -> "--", 5.5 -> "5'30\" /km"
 */
export function formatRunPace(paceMinPerKm: number | null | undefined): string {
  if (paceMinPerKm === null || paceMinPerKm === undefined || isNaN(paceMinPerKm) || paceMinPerKm <= 0 || !isFinite(paceMinPerKm)) {
    return '--';
  }

  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);

  if (secs === 60) {
    return `${mins + 1}'00"`;
  }

  return `${mins}'${secs.toString().padStart(2, '0')}"`;
}

/**
 * Formats speed in km/h
 * Example: null -> "--", 11.2 -> "11.2"
 */
export function formatRunSpeed(speedKmh: number | null | undefined): string {
  if (speedKmh === null || speedKmh === undefined || isNaN(speedKmh) || speedKmh <= 0 || !isFinite(speedKmh)) {
    return '--';
  }
  return speedKmh.toFixed(1);
}

/**
 * Formats burned calories
 * Example: null -> "--", 340 -> "340"
 */
export function formatRunCalories(calories: number | null | undefined): string {
  if (calories === null || calories === undefined || isNaN(calories) || calories <= 0) {
    return '--';
  }
  return Math.round(calories).toString();
}

/**
 * Generates an automatic title based on time of day
 */
export function getDefaultRunTitle(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Morning Run';
  if (hour < 17) return 'Afternoon Run';
  if (hour < 21) return 'Evening Run';
  return 'Night Run';
}
