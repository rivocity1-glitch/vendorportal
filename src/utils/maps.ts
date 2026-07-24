/**
 * Formats a distance in kilometers into a human-readable string.
 *
 * @param distanceKm - Distance in kilometers.
 * @returns Formatted string (e.g., "325 m", "1.4 km", "12 km").
 */
export function formatDistance(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return '0 m';
  }

  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }

  if (distanceKm < 10) {
    const formatted = Number.isInteger(distanceKm)
      ? distanceKm.toString()
      : distanceKm.toFixed(1);
    return `${formatted} km`;
  }

  return `${Math.round(distanceKm)} km`;
}

/**
 * Estimates travel time in minutes based on distance and average speed.
 *
 * @param distanceKm - Distance in kilometers.
 * @param averageSpeedKmH - Average speed in kilometers per hour.
 * @returns Estimated time in minutes. Returns 0 if inputs are invalid or speed is non-positive.
 */
export function estimateTravelTime(
  distanceKm: number,
  averageSpeedKmH: number
): number {
  if (
    !Number.isFinite(distanceKm) ||
    !Number.isFinite(averageSpeedKmH) ||
    distanceKm <= 0 ||
    averageSpeedKmH <= 0
  ) {
    return 0;
  }

  const hours = distanceKm / averageSpeedKmH;
  return Math.round(hours * 60);
}

/**
 * Formats duration in minutes into a readable display string.
 *
 * @param minutes - Total duration in minutes.
 * @returns Formatted duration string (e.g., "4 min", "18 min", "1 hr 12 min").
 */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '0 min';
  }

  const roundedMinutes = Math.round(minutes);
  const hrs = Math.floor(roundedMinutes / 60);
  const mins = roundedMinutes % 60;

  if (hrs === 0) {
    return `${mins} min`;
  }

  if (mins === 0) {
    return `${hrs} hr`;
  }

  return `${hrs} hr ${mins} min`;
}

/**
 * Calculates the initial compass bearing in degrees from a start coordinate to an end coordinate.
 *
 * @param startLat - Starting latitude.
 * @param startLng - Starting longitude.
 * @param endLat - Ending latitude.
 * @param endLng - Ending longitude.
 * @returns Compass bearing in degrees (0 to 360).
 */
export function calculateBearing(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): number {
  if (
    !Number.isFinite(startLat) ||
    !Number.isFinite(startLng) ||
    !Number.isFinite(endLat) ||
    !Number.isFinite(endLng)
  ) {
    return 0;
  }

  const startLatRad = (startLat * Math.PI) / 180;
  const endLatRad = (endLat * Math.PI) / 180;
  const dLngRad = ((endLng - startLng) * Math.PI) / 180;

  const y = Math.sin(dLngRad) * Math.cos(endLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(endLatRad) -
    Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(dLngRad);

  const bearingRad = Math.atan2(y, x);
  const bearingDeg = (bearingRad * 180) / Math.PI;

  return (bearingDeg + 360) % 360;
}

export type CompassDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

/**
 * Converts a compass bearing in degrees to an 8-point cardinal/intercardinal direction.
 *
 * @param bearing - Bearing angle in degrees (0 to 360).
 * @returns Direction abbreviation ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW').
 */
export function bearingToDirection(bearing: number): CompassDirection {
  if (!Number.isFinite(bearing)) {
    return 'N';
  }

  const normalized = ((bearing % 360) + 360) % 360;
  const directions: CompassDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(normalized / 45) % 8;

  return directions[index];
}

/**
 * Calculates delivery progress percentage based on total and remaining distances.
 * Clamps result safely between 0 and 100.
 *
 * @param totalDistance - Initial or total distance of the trip.
 * @param remainingDistance - Current remaining distance to destination.
 * @returns Progress percentage as a number between 0 and 100.
 */
export function getDeliveryProgress(
  totalDistance: number,
  remainingDistance: number
): number {
  if (
    !Number.isFinite(totalDistance) ||
    !Number.isFinite(remainingDistance) ||
    totalDistance <= 0
  ) {
    return 0;
  }

  const safeRemaining = Math.max(0, remainingDistance);
  const covered = totalDistance - safeRemaining;
  const percentage = (covered / totalDistance) * 100;

  return Math.min(100, Math.max(0, Math.round(percentage)));
}

/**
 * Formats remaining travel time into an Estimated Time of Arrival (ETA) text string.
 *
 * @param minutes - Remaining duration in minutes.
 * @returns Formatted ETA string (e.g., "Arriving now", "2 min away", "14 min away").
 */
export function formatETA(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 1) {
    return 'Arriving now';
  }

  const formattedTime = formatDuration(minutes);
  return `${formattedTime} away`;
}