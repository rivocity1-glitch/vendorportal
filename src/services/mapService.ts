export interface LngLatTuple {
  lng: number;
  lat: number;
}

export function createLngLat(lng: number, lat: number): LngLatTuple {
  return { lng, lat };
}

export function isValidCoordinate(lng: number, lat: number): boolean {
  return (
    typeof lng === "number" &&
    typeof lat === "number" &&
    !isNaN(lng) &&
    !isNaN(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

export function formatCoordinates(
  lat: number,
  lng: number,
  precision = 6
): string {
  if (!isValidCoordinate(lng, lat)) {
    return "Invalid Coordinates";
  }
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

export function parseCoordinates(input: string): LngLatTuple | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const parts = input.split(",").map((p) => p.trim());
  if (parts.length !== 2) {
    return null;
  }

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (isValidCoordinate(lng, lat)) {
    return { lng, lat };
  }

  return null;
}

export function getInitialCenter(
  lat?: number | null,
  lng?: number | null,
  defaultCenter: LngLatTuple = { lng: 73.8567, lat: 18.5204 }
): LngLatTuple {
  if (
    lat !== undefined &&
    lat !== null &&
    lng !== undefined &&
    lng !== null &&
    isValidCoordinate(lng, lat)
  ) {
    return { lng, lat };
  }
  return defaultCenter;
}