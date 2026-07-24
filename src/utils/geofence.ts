import { calculateDistance } from './distance';

/**
 * Calculates the distance in kilometers from a point to a geofence center point.
 *
 * @param pointLat - Latitude of the target point.
 * @param pointLng - Longitude of the target point.
 * @param centerLat - Latitude of the geofence center.
 * @param centerLng - Longitude of the geofence center.
 * @returns The distance in kilometers. Returns 0 for invalid inputs.
 */
export function distanceFromCenter(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number
): number {
  if (
    !Number.isFinite(pointLat) ||
    !Number.isFinite(pointLng) ||
    !Number.isFinite(centerLat) ||
    !Number.isFinite(centerLng)
  ) {
    return 0;
  }

  return calculateDistance(centerLat, centerLng, pointLat, pointLng);
}

/**
 * Checks if a coordinate point is within a geofence radius.
 *
 * @param pointLat - Latitude of the target point.
 * @param pointLng - Longitude of the target point.
 * @param centerLat - Latitude of the geofence center.
 * @param centerLng - Longitude of the geofence center.
 * @param radiusKm - Radius of the geofence in kilometers.
 * @returns True if the point is within or on the radius boundary; false otherwise.
 */
export function isInsideGeofence(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): boolean {
  if (!Number.isFinite(radiusKm) || radiusKm < 0) {
    return false;
  }

  const dist = distanceFromCenter(pointLat, pointLng, centerLat, centerLng);
  return dist <= radiusKm;
}

/**
 * Calculates the remaining distance in meters before leaving the geofence boundary.
 *
 * @param pointLat - Latitude of the target point.
 * @param pointLng - Longitude of the target point.
 * @param centerLat - Latitude of the geofence center.
 * @param centerLng - Longitude of the geofence center.
 * @param radiusKm - Radius of the geofence in kilometers.
 * @returns Remaining distance in meters. Never returns negative values.
 */
export function distanceRemaining(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): number {
  if (!Number.isFinite(radiusKm) || radiusKm < 0) {
    return 0;
  }

  const distKm = distanceFromCenter(pointLat, pointLng, centerLat, centerLng);
  const remainingKm = radiusKm - distKm;

  return Math.max(0, Math.round(remainingKm * 1000));
}

/**
 * Checks whether a customer location is within a vendor's delivery radius.
 *
 * @param vendorLat - Latitude of the vendor.
 * @param vendorLng - Longitude of the vendor.
 * @param customerLat - Latitude of the customer.
 * @param customerLng - Longitude of the customer.
 * @param radiusKm - Vendor's maximum delivery radius in kilometers.
 * @returns True if customer is within delivery radius; false otherwise.
 */
export function isWithinDeliveryRadius(
  vendorLat: number,
  vendorLng: number,
  customerLat: number,
  customerLng: number,
  radiusKm: number
): boolean {
  return isInsideGeofence(customerLat, customerLng, vendorLat, vendorLng, radiusKm);
}

export type GeofenceStatus = 'INSIDE' | 'OUTSIDE' | 'ON_BOUNDARY';

/**
 * Evaluates the geofence status of a location relative to a center point and radius.
 *
 * @param pointLat - Latitude of the target point.
 * @param pointLng - Longitude of the target point.
 * @param centerLat - Latitude of the geofence center.
 * @param centerLng - Longitude of the geofence center.
 * @param radiusKm - Radius of the geofence in kilometers.
 * @param toleranceKm - Optional tolerance range in kilometers for boundary evaluation (default: 0.01 km = 10m).
 * @returns 'INSIDE', 'OUTSIDE', or 'ON_BOUNDARY'.
 */
export function getGeofenceStatus(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  toleranceKm = 0.01
): GeofenceStatus {
  if (!Number.isFinite(radiusKm) || radiusKm < 0) {
    return 'OUTSIDE';
  }

  const dist = distanceFromCenter(pointLat, pointLng, centerLat, centerLng);
  const diff = Math.abs(dist - radiusKm);

  if (diff <= toleranceKm) {
    return 'ON_BOUNDARY';
  }

  return dist < radiusKm ? 'INSIDE' : 'OUTSIDE';
}