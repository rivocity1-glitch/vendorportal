export interface StructuredAddress {
  formattedAddress: string;
  addressLine1: string;
  city: string;
  state: string;
  pinCode: string;
}

export interface NominatimAddress {
  road?: string;
  house_number?: string;
  building?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state_district?: string;
  state?: string;
  postcode?: string;
  country?: string;
  amenity?: string;
  shop?: string;
  hotel?: string;
  hospital?: string;
  school?: string;
  [key: string]: string | undefined;
}

export interface SelectedSearchResult {
  latitude: number;
  longitude: number;
  display_name: string;
  title?: string;
  placeType?: string;
  address?: NominatimAddress;
}

/**
 * Normalizes Photon API (GeoJSON) feature to SelectedSearchResult format
 */
function normalizePhotonFeature(feature: any): SelectedSearchResult {
  const [lng, lat] = feature.geometry.coordinates;
  const props = feature.properties || {};

  const title = props.name || props.street || props.district || props.city || "Selected Location";
  const placeType = props.osm_value || props.osm_key || props.type || "place";

  const addressParts = [
    props.housenumber,
    props.street,
    props.district || props.suburb || props.neighbourhood,
    props.city || props.town,
    props.state,
    props.postcode,
    props.country,
  ].filter((item): item is string => Boolean(item && item.trim() && item !== title));

  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : title;

  const address: NominatimAddress = {
    road: props.street,
    house_number: props.housenumber,
    city: props.city || props.town || props.district,
    state: props.state,
    postcode: props.postcode,
    country: props.country,
    amenity: props.name,
  };

  return {
    latitude: lat,
    longitude: lng,
    display_name: fullAddress,
    title,
    placeType,
    address,
  };
}

/**
 * Normalizes raw Nominatim search item to SelectedSearchResult format
 */
function normalizeNominatimItem(item: any): SelectedSearchResult {
  const title = item.name || item.display_name.split(",")[0] || "Selected Location";
  const placeType = item.type || item.class || "place";

  return {
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    display_name: item.display_name,
    title,
    placeType,
    address: item.address || {},
  };
}

/**
 * Search location query: Primary (Photon API) -> Fallback (Nominatim)
 */
export async function searchLocation(
  query: string,
  signal?: AbortSignal
): Promise<SelectedSearchResult[]> {
  if (!query || !query.trim()) return [];

  const trimmedQuery = query.trim();

  // 1. Try Photon API first
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      trimmedQuery
    )}&limit=5`;
    const response = await fetch(photonUrl, { signal });

    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        return data.features.map(normalizePhotonFeature);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    console.warn("Photon search failed, falling back to Nominatim...", error);
  }

  // 2. Fallback to Nominatim API
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmedQuery
    )}&addressdetails=1&limit=5`;
    const response = await fetch(nominatimUrl, {
      signal,
      headers: {
        "Accept-Language": "en",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map(normalizeNominatimItem);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    console.error("Nominatim search error:", error);
  }

  return [];
}

/**
 * Reverse geocoding helper (Nominatim)
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
  const response = await fetch(url, {
    signal,
    headers: {
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error("Reverse geocoding failed");
  }

  return await response.json();
}

/**
 * Extract structured address helper
 */
export function extractStructuredAddress(
  displayName: string,
  addressObj?: NominatimAddress
): StructuredAddress {
  if (!addressObj) {
    return {
      formattedAddress: displayName,
      addressLine1: displayName,
      city: "",
      state: "",
      pinCode: "",
    };
  }

  const line1Parts = [
    addressObj.amenity || addressObj.shop || addressObj.building || addressObj.house_number,
    addressObj.road,
    addressObj.suburb || addressObj.neighbourhood,
  ].filter(Boolean);

  const addressLine1 =
    line1Parts.length > 0 ? line1Parts.join(", ") : displayName.split(",")[0] || displayName;

  const city =
    addressObj.city ||
    addressObj.town ||
    addressObj.village ||
    addressObj.county ||
    addressObj.state_district ||
    "";

  const state = addressObj.state || "";
  const pinCode = addressObj.postcode || "";

  return {
    formattedAddress: displayName,
    addressLine1,
    city,
    state,
    pinCode,
  };
}