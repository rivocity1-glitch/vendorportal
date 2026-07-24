import React, { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css" with { type: "css" };
import { Navigation } from "lucide-react";
import { MapSearchBox, SelectedSearchResult } from "./MapSearchBox";
import {
  reverseGeocode,
  extractStructuredAddress,
  StructuredAddress,
} from "../../../services/geocodingService";
import {
  isValidCoordinate,
  formatCoordinates,
  getInitialCenter,
} from "../../../services/mapService";

export interface ConfirmLocationPayload extends StructuredAddress {
  latitude: number;
  longitude: number;
}

export interface StoreLocationPickerProps {
  open: boolean;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onClose: () => void;
  onConfirm: (location: ConfirmLocationPayload) => void;
}

const RASTER_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-positron": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-positron-layer",
      type: "raster",
      source: "carto-positron",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const StoreLocationPicker: React.FC<StoreLocationPickerProps> = ({
  open,
  initialLatitude,
  initialLongitude,
  onClose,
  onConfirm,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const reverseGeocodeControllerRef = useRef<AbortController | null>(null);

  const initialCenter = getInitialCenter(initialLatitude, initialLongitude);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialCenter.lat,
    lng: initialCenter.lng,
  });

  const [addressDetails, setAddressDetails] = useState<StructuredAddress>({
    formattedAddress: "",
    addressLine1: "",
    city: "",
    state: "",
    pinCode: "",
  });

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Helper to update popup contents
  const updatePopup = useCallback((title: string, address: string, lng: number, lat: number) => {
    if (!mapRef.current) return;

    if (!popupRef.current) {
      popupRef.current = new maplibregl.Popup({
        offset: 25,
        closeButton: false,
        className: "custom-map-popup",
      });
    }

    const htmlContent = `
      <div style="font-family: inherit; padding: 4px 6px;">
        <div style="font-weight: 700; font-size: 12px; color: #0f172a; margin-bottom: 2px;">${title}</div>
        <div style="font-size: 11px; color: #475569; max-width: 220px; line-height: 1.3;">${address}</div>
      </div>
    `;

    popupRef.current
      .setLngLat([lng, lat])
      .setHTML(htmlContent)
      .addTo(mapRef.current);
  }, []);

  const performReverseGeocode = useCallback(
    async (lat: number, lng: number, customTitle?: string) => {
      if (reverseGeocodeControllerRef.current) {
        reverseGeocodeControllerRef.current.abort();
      }

      const controller = new AbortController();
      reverseGeocodeControllerRef.current = controller;
      setIsGeocoding(true);

      try {
        const result = await reverseGeocode(lat, lng, controller.signal);
        if (result) {
          const structured = extractStructuredAddress(
            result.display_name,
            result.address
          );
          setAddressDetails(structured);

          const title = customTitle || structured.addressLine1 || "Selected Location";
          updatePopup(title, structured.formattedAddress, lng, lat);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          const fallbackAddr = formatCoordinates(lat, lng);
          setAddressDetails({
            formattedAddress: fallbackAddr,
            addressLine1: fallbackAddr,
            city: "",
            state: "",
            pinCode: "",
          });
          updatePopup("Selected Location", fallbackAddr, lng, lat);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsGeocoding(false);
        }
      }
    },
    [updatePopup]
  );

  const updatePosition = useCallback(
    (lng: number, lat: number, shouldGeocode = true, customTitle?: string) => {
      if (!isValidCoordinate(lng, lat)) return;
      setCoords({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      }
      if (shouldGeocode) {
        performReverseGeocode(lat, lng, customTitle);
      }
    },
    [performReverseGeocode]
  );

  useEffect(() => {
    if (!open || !mapContainerRef.current) return;

    const startCenter = getInitialCenter(initialLatitude, initialLongitude);
    setCoords({ lat: startCenter.lat, lng: startCenter.lng });

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: RASTER_MAP_STYLE,
      center: [startCenter.lng, startCenter.lat],
      zoom: 15,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      "top-right"
    );

    const marker = new maplibregl.Marker({
      draggable: true,
      color: "#10B981",
    })
      .setLngLat([startCenter.lng, startCenter.lat])
      .addTo(map);

    markerRef.current = marker;

    marker.on("dragend", () => {
      const lngLat = marker.getLngLat();
      updatePosition(lngLat.lng, lngLat.lat, true);
    });

    map.on("click", (e) => {
      updatePosition(e.lngLat.lng, e.lngLat.lat, true);
    });

    map.on("load", () => {
      map.resize();
    });

    const resizeTimer = setTimeout(() => {
      map.resize();
    }, 200);

    mapRef.current = map;

    performReverseGeocode(startCenter.lat, startCenter.lng);

    return () => {
      clearTimeout(resizeTimer);
      if (reverseGeocodeControllerRef.current) {
        reverseGeocodeControllerRef.current.abort();
      }
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [open, initialLatitude, initialLongitude, updatePosition, performReverseGeocode]);

  const handleSearchResultSelect = (result: SelectedSearchResult) => {
    const { latitude, longitude, display_name, title, address } = result;

    const structured = extractStructuredAddress(display_name, address);
    setAddressDetails(structured);

    updatePosition(longitude, latitude, false);

    const placeName = title || structured.addressLine1 || "Selected Location";
    updatePopup(placeName, display_name, longitude, latitude);

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 18,
        speed: 1.2,
        curve: 1.4,
        essential: true,
      });
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updatePosition(longitude, latitude, true, "Current Location");

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 18,
            speed: 1.2,
            essential: true,
          });
        }
        setIsLocating(false);
      },
      (error) => {
        console.error("GPS error:", error);
        alert("Unable to retrieve your current location. Please check browser permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    onConfirm({
      latitude: coords.lat,
      longitude: coords.lng,
      formattedAddress:
        addressDetails.formattedAddress || formatCoordinates(coords.lat, coords.lng),
      addressLine1: addressDetails.addressLine1,
      city: addressDetails.city,
      state: addressDetails.state,
      pinCode: addressDetails.pinCode,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6">
      <div className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold">Pick Store Location</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag marker or click anywhere on the map to select your coordinates
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Search Overlay */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 z-10 shrink-0">
          <MapSearchBox
            placeholder="Search your shop, restaurant or full address..."
            onSelectResult={handleSearchResultSelect}
          />
        </div>

        {/* Map Canvas Container */}
        <div className="relative flex-1 min-h-[350px] w-full bg-slate-100 dark:bg-slate-950">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

          {/* Floating GPS Location Button */}
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={isLocating}
            title="Use current location"
            className="absolute bottom-6 right-3 z-10 p-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            <Navigation className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isLocating ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Address & Coordinates Info Bar */}
        {addressDetails.formattedAddress && (
          <div className="px-6 py-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2 shrink-0">
            <span className="truncate">
              <strong>Address:</strong> {addressDetails.formattedAddress}
            </span>
            {isGeocoding && (
              <span className="shrink-0 text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                Updating address...
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg w-full sm:w-auto text-center sm:text-left">
            Coordinates:{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formatCoordinates(coords.lat, coords.lng)}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};