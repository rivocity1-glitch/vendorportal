import React, { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Lock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Store,
  X,
  Zap,
} from "lucide-react";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { supabase } from "../../../lib/supabase";
import { VendorTerms } from "../legal/VendorTerms";

interface ProductCategory {
  id: string;
  name: string;
  requires_drug_license: boolean;
}

interface RegisterProps {
  onNavigateToLogin: () => void;
}

interface LocationResult {
  latitude: number;
  longitude: number;
  displayName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
}

const DEFAULT_LOCATION = {
  latitude: 18.5204,
  longitude: 73.8567,
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isCoordinateLike(value: string): boolean {
  const text = value.trim();

  if (!text) return true;

  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(text)) {
    return true;
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return true;
  }

  if (/^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]+$/i.test(text)) {
    return true;
  }

  return false;
}

function uniqueReadable(values: Array<unknown>): string[] {
  const output: string[] = [];

  values.forEach((value) => {
    const text = cleanText(value);

    if (!text || isCoordinateLike(text)) return;

    if (!output.some((item) => item.toLowerCase() === text.toLowerCase())) {
      output.push(text);
    }
  });

  return output;
}

function buildReadableLocation(
  data: any,
  fallbackLatitude: number,
  fallbackLongitude: number
): LocationResult {
  const address = data?.address || {};

  const houseNumber = cleanText(address.house_number);
  const road = cleanText(address.road || address.pedestrian || address.street);
  const building = cleanText(data?.name);

  const line1Parts = uniqueReadable([
    houseNumber,
    road,
  ]);

  const addressLine1 =
    line1Parts.join(" ") ||
    uniqueReadable([building])[0] ||
    uniqueReadable([
      address.neighbourhood,
      address.suburb,
      address.city_district,
    ])[0] ||
    "Selected store location";

  const addressLine2 = uniqueReadable([
    address.neighbourhood,
    address.suburb,
    address.city_district,
    address.residential,
  ]).join(", ");

  const city =
    cleanText(address.city) ||
    cleanText(address.town) ||
    cleanText(address.village) ||
    cleanText(address.municipality) ||
    cleanText(address.county);

  const state = cleanText(address.state);
  const pinCode = cleanText(address.postcode);

  const displayParts = uniqueReadable([
    addressLine1,
    addressLine2,
    city,
    state,
    pinCode,
  ]);

  return {
    latitude: fallbackLatitude,
    longitude: fallbackLongitude,
    displayName: displayParts.join(", "),
    addressLine1,
    addressLine2,
    city,
    state,
    pinCode,
  };
}

export function Register({ onNavigateToLogin }: RegisterProps) {
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [category, setCategory] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [drugLicense20, setDrugLicense20] = useState("");
  const [drugLicense20C, setDrugLicense20C] = useState("");
  const [drugLicense21, setDrugLicense21] = useState("");
  const [drugLicense21C, setDrugLicense21C] = useState("");
  const [drugLicenseExpiry, setDrugLicenseExpiry] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [readableLocation, setReadableLocation] = useState("");

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [legalCompleted, setLegalCompleted] = useState(false);

  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [generatedShopCode, setGeneratedShopCode] = useState("");

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  const shopNameRef = useRef<HTMLInputElement>(null);
  const ownerNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const drugLicense20Ref = useRef<HTMLInputElement>(null);
  const drugLicenseExpiryRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();

    return () => {
      markerRef.current?.remove();
      mapRef.current?.remove();
    };
  }, []);

  const selectedCategoryObj = categories.find(
    (item) => String(item.id) === String(category)
  );

  const isMedicalCategory = (item?: ProductCategory | null) =>
    item?.requires_drug_license === true ||
    item?.name?.trim().toLowerCase() === "medical";

  const isMedicalSelected = isMedicalCategory(selectedCategoryObj);

  useEffect(() => {
    if (!isMedicalSelected) {
      setDrugLicense20("");
      setDrugLicense20C("");
      setDrugLicense21("");
      setDrugLicense21C("");
      setDrugLicenseExpiry("");
    }
  }, [isMedicalSelected]);

  async function loadCategories() {
    setCategoriesLoading(true);

    const { data, error: categoryError } = await supabase
      .from("product_categories")
      .select("id,name,requires_drug_license")
      .eq("status", "active")
      .order("display_order", { ascending: true });

    if (categoryError) {
      setError(`Could not load store categories: ${categoryError.message}`);
    } else {
      setCategories((data || []) as ProductCategory[]);
    }

    setCategoriesLoading(false);
  }

  function setPhoneValue(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
  }

  function formattedPhone(): string {
    return phone ? `+91${phone}` : "";
  }

  function setLocationFields(location: LocationResult) {
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    setReadableLocation(location.displayName);

    setAddressLine1(location.addressLine1 || "");
    setAddressLine2(location.addressLine2 || "");
    setCity(location.city || "");
    setState(location.state || "");
    setPinCode(location.pinCode || "");
  }

  async function reverseGeocode(
    lat: number,
    lng: number
  ): Promise<LocationResult> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(
        lng
      )}&format=json&addressdetails=1`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Could not resolve the selected location.");
    }

    const data = await response.json();

    return buildReadableLocation(data, lat, lng);
  }

  async function useBrowserLocation() {
    if (!navigator.geolocation) {
      setError(
        "Location services are not available in this browser. Please choose the store location on the map."
      );
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          const result = await reverseGeocode(lat, lng);
          setLocationFields(result);

          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [lng, lat],
              zoom: 17,
              essential: true,
            });

            markerRef.current?.setLngLat([lng, lat]);
          }
        } catch (locationError: any) {
          console.error("Location detection error:", locationError);

          setError(
            locationError?.message ||
              "Location detected, but the readable address could not be generated."
          );
        } finally {
          setLocationLoading(false);
        }
      },
      (positionError) => {
        console.error("Browser location error:", positionError);

        setError(
          "Unable to access your current location. You can select the exact store location manually on the map."
        );

        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  async function handleMapLocation(
    lat: number,
    lng: number
  ) {
    setLocationLoading(true);
    setError("");

    try {
      const result = await reverseGeocode(lat, lng);
      setLocationFields(result);
    } catch (locationError: any) {
      console.error("Map reverse geocoding error:", locationError);

      setLatitude(lat);
      setLongitude(lng);

      setError(
        "Exact location selected, but the readable address could not be generated. Please enter the address details manually."
      );
    } finally {
      setLocationLoading(false);
    }
  }

  function initializeMap() {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = latitude ?? DEFAULT_LOCATION.latitude;
    const initialLng = longitude ?? DEFAULT_LOCATION.longitude;

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: [initialLng, initialLat],
      zoom: latitude !== null ? 17 : 5,
      attributionControl: {},
    });

    map.addControl(
      new NavigationControl(),
      "top-right"
    );

    const marker = new Marker({
      color: "#DC2626",
      draggable: true,
    })
      .setLngLat([initialLng, initialLat])
      .addTo(map);

    marker.on("dragend", () => {
      const lngLat = marker.getLngLat();
      void handleMapLocation(lngLat.lat, lngLat.lng);
    });

    map.on("click", (event) => {
      marker.setLngLat([
        event.lngLat.lng,
        event.lngLat.lat,
      ]);

      void handleMapLocation(
        event.lngLat.lat,
        event.lngLat.lng
      );
    });

    mapRef.current = map;
    markerRef.current = marker;

    window.setTimeout(() => {
      map.resize();
    }, 100);
  }

  useEffect(() => {
    if (!mapOpen) return;

    const timer = window.setTimeout(() => {
      initializeMap();

      if (mapRef.current) {
        mapRef.current.resize();

        if (latitude !== null && longitude !== null) {
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 17,
            essential: true,
          });

          markerRef.current?.setLngLat([
            longitude,
            latitude,
          ]);
        }
      }
    }, 100);

    return () => window.clearTimeout(timer);
  }, [mapOpen, latitude, longitude]);

  function closeMap() {
    markerRef.current?.remove();
    markerRef.current = null;

    mapRef.current?.remove();
    mapRef.current = null;

    setMapOpen(false);
  }

  const benefitItems: Array<{
    icon: LucideIcon;
    title: string;
    description: string;
  }> = [
    {
      icon: Store,
      title: "Local commerce network",
      description: "Reach customers across your city.",
    },
    {
      icon: MapPin,
      title: "Exact store location",
      description:
        "Pin your physical store precisely for delivery calculations.",
    },
    {
      icon: ShieldCheck,
      title: "Admin reviewed",
      description:
        "Every vendor application is reviewed before activation.",
    },
  ];

  function triggerValidationError(
    message: string,
    inputRef: React.RefObject<
      HTMLInputElement | HTMLSelectElement | null
    >
  ) {
    setError(message);
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function validateForm(): boolean {
    if (!legalCompleted) {
      setError(
        "Please read and accept the Vendor Terms & Conditions and Privacy Policy."
      );
      return false;
    }

    if (!shopName.trim()) {
      triggerValidationError(
        "Please enter your Shop Name.",
        shopNameRef
      );
      return false;
    }

    if (!ownerName.trim()) {
      triggerValidationError(
        "Please enter the Owner / Licence Holder Name.",
        ownerNameRef
      );
      return false;
    }

    if (!email.trim()) {
      triggerValidationError(
        "Please enter your Email Address.",
        emailRef
      );
      return false;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.trim()
      )
    ) {
      triggerValidationError(
        "Please enter a valid Email Address.",
        emailRef
      );
      return false;
    }

    if (phone.length !== 10) {
      triggerValidationError(
        "Enter a valid Indian mobile number with exactly 10 digits after +91.",
        phoneRef
      );
      return false;
    }

    if (!category) {
      triggerValidationError(
        "Please select a Store Category.",
        categoryRef
      );
      return false;
    }

    if (!addressLine1.trim() || !city.trim() || !state.trim() || !pinCode.trim()) {
      triggerValidationError(
        "Please complete the physical store address.",
        addressRef
      );
      return false;
    }

    if (!/^\d{6}$/.test(pinCode.trim())) {
      setError("Please enter a valid 6-digit PIN code.");
      return false;
    }

    if (latitude === null || longitude === null) {
      setError(
        "Please pin the exact physical store location on the map before registering."
      );
      return false;
    }

    if (isMedicalSelected) {
      if (!drugLicense20.trim()) {
        triggerValidationError(
          "Drug Licence Form 20 is required for medical stores.",
          drugLicense20Ref
        );
        return false;
      }

      if (!drugLicenseExpiry) {
        triggerValidationError(
          "Drug Licence expiry date is required.",
          drugLicenseExpiryRef
        );
        return false;
      }

      const expiry = new Date(
        `${drugLicenseExpiry}T23:59:59`
      );

      if (Number.isNaN(expiry.getTime())) {
        setError("Please enter a valid Drug Licence expiry date.");
        return false;
      }

      if (expiry.getTime() < Date.now()) {
        setError("The Drug Licence expiry date cannot be in the past.");
        return false;
      }
    }

    if (!password) {
      triggerValidationError(
        "Please create a password.",
        passwordRef
      );
      return false;
    }

    if (!confirmPassword) {
      triggerValidationError(
        "Please confirm your password.",
        confirmPasswordRef
      );
      return false;
    }

    if (password !== confirmPassword) {
      triggerValidationError(
        "Passwords do not match.",
        confirmPasswordRef
      );
      return false;
    }

    if (password.length < 6) {
      triggerValidationError(
        "Password must be at least 6 characters long.",
        passwordRef
      );
      return false;
    }

    return true;
  }

  async function handleRegister(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccessMessage("");

    if (!validateForm()) return;

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = formattedPhone();

    const licenseParts = [
      drugLicense20.trim()
        ? `20: ${drugLicense20.trim()}`
        : "",
      drugLicense20C.trim()
        ? `20C: ${drugLicense20C.trim()}`
        : "",
      drugLicense21.trim()
        ? `21: ${drugLicense21.trim()}`
        : "",
      drugLicense21C.trim()
        ? `21C: ${drugLicense21C.trim()}`
        : "",
    ].filter(Boolean);

    const combinedDrugLicense = licenseParts.join(", ");

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: undefined,
        },
      });

      if (authError) {
        throw new Error(
          `Authentication setup failed: ${authError.message}`
        );
      }

      if (!authData?.user) {
        throw new Error(
          "Could not initialize the vendor authentication account."
        );
      }

      const uniqueSuffix =
        Math.floor(
          1000 + Math.random() * 9000
        );

      const shopCode = `RIVO-${uniqueSuffix}`;

      const {
        data: vendorData,
        error: vendorError,
      } = await supabase
        .from("vendors")
        .insert({
          auth_user_id: authData.user.id,
          shop_name: shopName.trim(),
          owner_name: ownerName.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          shop_code: shopCode,
          status: "pending",
          category_id: category,
        })
        .select("id,shop_code")
        .single();

      if (vendorError || !vendorData) {
        throw new Error(
          `Vendor account provisioning failed: ${
            vendorError?.message ||
            "No vendor record was returned."
          }`
        );
      }

      const {
        error: profileError,
      } = await supabase
        .from("vendor_profiles")
        .insert({
          vendor_id: vendorData.id,
          categories: [category],
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim() || null,
          city: city.trim(),
          state: state.trim(),
          pin_code: pinCode.trim(),
          store_status: "open",
          latitude,
          longitude,
          drug_license: isMedicalSelected ? combinedDrugLicense || null : null,
          drug_license_expiry: isMedicalSelected ? drugLicenseExpiry : null,
        });

      if (profileError) {
        throw new Error(
          `Vendor profile setup failed: ${profileError.message}`
        );
      }

      setGeneratedShopCode(
        vendorData.shop_code || shopCode
      );

      setSuccessMessage(
        `Registration submitted successfully. Your vendor code is ${
          vendorData.shop_code || shopCode
        }.`
      );

      setRegistrationComplete(true);
    } catch (registrationError: any) {
      console.error(
        "Vendor registration error:",
        registrationError
      );

      setError(
        registrationError?.message ||
          "Vendor registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="bg-white border border-neutral-200 rounded-3xl shadow-xl p-7 md:p-9">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-[#2ECC71] flex items-center justify-center shadow-lg shadow-[#2ECC71]/20">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-[#0F172A] text-center">
              Registration Submitted
            </h1>

            <p className="text-sm text-neutral-500 text-center mt-2 leading-relaxed">
              Your RivoCity Vendor Portal application is now
              awaiting admin approval.
            </p>

            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-[11px] uppercase tracking-wider font-black text-emerald-700">
                Your Vendor Code
              </p>

              <p className="text-2xl font-black text-[#0F172A] mt-1 tracking-wide">
                {generatedShopCode}
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#2ECC71] mt-0.5 shrink-0" />

                <div>
                  <h2 className="text-sm font-black text-[#0F172A]">
                    Complete your store setup after approval
                  </h2>

                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    Once your account is approved, open Store
                    Management and Profile and check every section.
                    Add anything you missed during registration.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {[
                  "Check your store address and exact location.",
                  "Complete your store profile and business information.",
                  "Add your bank details in Store Management.",
                  "Review your business hours, delivery radius and store settings.",
                  "Make sure all required information is filled before accepting orders.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-xs text-neutral-600"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {isMedicalSelected && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />

                  <div>
                    <h2 className="text-sm font-black text-amber-900">
                      Medical licence reminder
                    </h2>

                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Review your medical licence information in
                      your profile after approval and make sure all
                      required details are complete.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onNavigateToLogin}
              className="w-full h-12 mt-7 rounded-xl bg-[#2ECC71] hover:bg-[#27AE60] text-white font-bold text-sm transition-all shadow-lg shadow-[#2ECC71]/15 flex items-center justify-center gap-2"
            >
              Go to Login
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-12 overflow-x-hidden">
      {/* LEFT BRAND PANEL */}
      <div className="lg:col-span-4 relative bg-[#0F172A] p-8 md:p-12 hidden lg:flex flex-col justify-between text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2ECC71] flex items-center justify-center shadow-lg shadow-[#2ECC71]/20">
            <Zap className="w-5 h-5 text-white" />
          </div>

          <div>
            <span className="text-xl font-black tracking-tight">
              Rivo.City
            </span>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold leading-none mt-0.5">
              Vendor Portal
            </p>
          </div>
        </div>

        <div className="relative space-y-8 my-auto max-w-sm">
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight leading-tight">
              Scale your store&apos;s reach within your city.
            </h2>

            <p className="text-neutral-400 font-light text-sm leading-relaxed">
              Join the RivoCity local commerce network and
              connect your physical store with customers nearby.
            </p>
          </div>

          <div className="space-y-4">
            {benefitItems.map(
              ({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex items-start gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon
                      className="w-4 h-4 text-[#2ECC71]"
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold">{title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="relative text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
          RivoCity Vendor Network · 2026
        </div>
      </div>

      {/* FORM AREA */}
      <div className="lg:col-span-8 min-h-screen">
        <div className="max-w-3xl mx-auto px-5 py-8 md:px-10 md:py-12">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">
                Create Vendor Account
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Register your physical store on the RivoCity Vendor Portal.
              </p>
            </div>

            <button
              type="button"
              onClick={onNavigateToLogin}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-[#2ECC71] transition-colors"
            >
              Already registered?
              <span className="text-[#2ECC71]">
                Sign In
              </span>
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 leading-relaxed">
                {error}
              </p>
              <button
                type="button"
                onClick={() => setError("")}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#2ECC71] shrink-0" />
              <p className="text-sm text-emerald-800">
                {successMessage}
              </p>
            </div>
          )}

          <form
            onSubmit={handleRegister}
            className="space-y-5"
          >
            {/* STORE INFORMATION */}
            <section className="bg-white border border-neutral-200 rounded-2xl p-5 md:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-[#2ECC71]" />
                </div>

                <div>
                  <h2 className="text-sm font-black text-[#0F172A]">
                    Store Information
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Basic information about your business.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Field
                  label="Shop Name *"
                  inputRef={shopNameRef}
                  value={shopName}
                  onChange={setShopName}
                  placeholder="Your store name"
                />

                <Field
                  label={isMedicalSelected ? "Owner / Licence Holder Name *" : "Owner Name *"}
                  inputRef={ownerNameRef}
                  value={ownerName}
                  onChange={setOwnerName}
                  placeholder="Owner / licence holder name"
                />

                <Field
                  label="Email Address *"
                  inputRef={emailRef}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="owner@example.com"
                />

                <div>
                  <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">
                    Mobile Number *
                  </label>

                  <div className="flex">
                    <div className="h-11 px-3 rounded-l-xl border border-r-0 border-neutral-200 bg-neutral-50 flex items-center text-sm font-bold text-neutral-600">
                      +91
                    </div>

                    <input
                      ref={phoneRef}
                      value={phone}
                      onChange={(event) =>
                        setPhoneValue(event.target.value)
                      }
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="0000000000"
                      className="w-full h-11 rounded-r-xl border border-neutral-200 bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#2ECC71] transition-colors"
                    />
                  </div>

                  <p className="text-[10px] text-neutral-400 mt-1.5">
                    Indian mobile number: +91 followed by exactly 10 digits.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">
                    Store Category *
                  </label>

                  <select
                    ref={categoryRef}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    disabled={categoriesLoading}
                    className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#2ECC71]"
                  >
                    <option value="">
                      {categoriesLoading
                        ? "Loading categories..."
                        : "Select category"}
                    </option>

                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* MEDICAL LICENCE DETAILS (DYNAMICALLY SHOWN) */}
            {isMedicalSelected && (
              <section className="bg-white border border-amber-200 rounded-2xl p-5 md:p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                  </div>

                  <div>
                    <h2 className="text-sm font-black text-[#0F172A]">
                      Medical Drug Licence Details
                    </h2>

                    <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                      Drug licence forms and validity details required for Medical category stores.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Field
                    label="Drug Licence 20 *"
                    inputRef={drugLicense20Ref}
                    value={drugLicense20}
                    onChange={setDrugLicense20}
                    placeholder="e.g. MH-PUN-123456"
                  />

                  <Field
                    label="Drug Licence 20C"
                    value={drugLicense20C}
                    onChange={setDrugLicense20C}
                    placeholder="e.g. MH-PUN-123457 (Optional)"
                  />

                  <Field
                    label="Drug Licence 21"
                    value={drugLicense21}
                    onChange={setDrugLicense21}
                    placeholder="e.g. MH-PUN-123458 (Optional)"
                  />

                  <Field
                    label="Drug Licence 21C"
                    value={drugLicense21C}
                    onChange={setDrugLicense21C}
                    placeholder="e.g. MH-PUN-123459 (Optional)"
                  />

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">
                      Drug Licence Expiry Date *
                    </label>

                    <input
                      ref={drugLicenseExpiryRef}
                      type="date"
                      value={drugLicenseExpiry}
                      onChange={(event) =>
                        setDrugLicenseExpiry(
                          event.target.value
                        )
                      }
                      min={new Date()
                        .toISOString()
                        .slice(0, 10)}
                      className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#2ECC71]"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* LOCATION */}
            <section className="bg-white border border-neutral-200 rounded-2xl p-5 md:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[#2ECC71]" />
                </div>

                <div>
                  <h2 className="text-sm font-black text-[#0F172A]">
                    Exact Store Location
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Pin the actual physical store location for delivery calculations.
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  className="w-full h-11 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  {latitude !== null
                    ? "Change Store Location"
                    : "Choose Store Location"}
                </button>
              </div>

              {readableLocation ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#2ECC71] mt-0.5 shrink-0" />

                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-black text-emerald-700">
                        Store Location Selected
                      </p>

                      <p className="text-sm font-semibold text-[#0F172A] mt-1 leading-relaxed">
                        {readableLocation}
                      </p>

                      <p className="text-[10px] text-emerald-700 mt-2">
                        Exact coordinates are stored securely for logistics and are not displayed here.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-center">
                  <MapPin className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-neutral-600">
                    Store location not selected yet
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Use the map to place the red pin exactly on your store.
                  </p>
                </div>
              )}

              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <Field
                  label="Address Line 1 *"
                  inputRef={addressRef}
                  value={addressLine1}
                  onChange={setAddressLine1}
                  placeholder="Shop / Building / Street"
                />

                <Field
                  label="Address Line 2"
                  value={addressLine2}
                  onChange={setAddressLine2}
                  placeholder="Area / Locality"
                />

                <Field
                  label="City *"
                  value={city}
                  onChange={setCity}
                  placeholder="City"
                />

                <Field
                  label="State *"
                  value={state}
                  onChange={setState}
                  placeholder="State"
                />

                <Field
                  label="PIN Code *"
                  value={pinCode}
                  onChange={(value) =>
                    setPinCode(
                      value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  placeholder="6-digit PIN"
                  inputMode="numeric"
                />
              </div>
            </section>

            {/* PASSWORD */}
            <section className="bg-white border border-neutral-200 rounded-2xl p-5 md:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-[#2ECC71]" />
                </div>

                <div>
                  <h2 className="text-sm font-black text-[#0F172A]">
                    Account Security
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Create your Vendor Portal password.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <PasswordField
                  label="Password *"
                  inputRef={passwordRef}
                  value={password}
                  onChange={setPassword}
                  visible={showPassword}
                  onToggle={() =>
                    setShowPassword((value) => !value)
                  }
                  placeholder="Minimum 6 characters"
                />

                <PasswordField
                  label="Confirm Password *"
                  inputRef={confirmPasswordRef}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  visible={showConfirmPassword}
                  onToggle={() =>
                    setShowConfirmPassword(
                      (value) => !value
                    )
                  }
                  placeholder="Re-enter password"
                />
              </div>
            </section>

            {/* LEGAL */}
            <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                  Legal Verification
                </span>

                {legalCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-[#2ECC71]">
                    <CheckCircle2 className="w-3 h-3" />
                    Accepted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-200 text-neutral-600">
                    Pending
                  </span>
                )}
              </div>

              {!legalCompleted ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    Legal acknowledgement required before registration.
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowTermsModal(true)
                    }
                    className="px-4 h-9 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-colors"
                  >
                    Read Terms & Conditions
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#2ECC71]">
                    <CheckCircle2 className="w-4 h-4" />
                    Terms & Conditions accepted
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-[#2ECC71]">
                    <CheckCircle2 className="w-4 h-4" />
                    Privacy Policy accepted
                  </div>
                </div>
              )}
            </section>

            <button
              type="submit"
              disabled={loading || !legalCompleted}
              className="w-full h-12 rounded-xl bg-[#2ECC71] hover:bg-[#27AE60] text-white font-bold text-sm shadow-lg shadow-[#2ECC71]/15 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Submit Vendor Application
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center sm:hidden">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-xs font-medium text-neutral-500"
              >
                Already have an account?
                <span className="text-[#2ECC71] font-bold ml-1">
                  Sign In
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MAP MODAL */}
      {mapOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-neutral-200">
              <div>
                <h2 className="text-sm font-black text-[#0F172A]">
                  Choose Exact Store Location
                </h2>

                <p className="text-xs text-neutral-500 mt-1">
                  Place the red pin exactly on your physical store. You can also use your current location.
                </p>
              </div>

              <button
                type="button"
                onClick={closeMap}
                className="w-9 h-9 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-500 hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <div
                ref={mapContainerRef}
                className="w-full h-[55vh] min-h-[360px]"
              />

              <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => void useBrowserLocation()}
                  disabled={locationLoading}
                  className="h-10 px-4 rounded-xl bg-white shadow-lg border border-neutral-200 text-xs font-bold text-[#0F172A] hover:border-[#2ECC71]"
                >
                  {locationLoading
                    ? "Finding location..."
                    : "Use My Current Location"}
                </button>

                {readableLocation && (
                  <div className="flex-1 min-w-0 rounded-xl bg-white/95 backdrop-blur shadow-lg border border-neutral-200 px-4 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider font-black text-[#2ECC71]">
                      Selected Location
                    </p>

                    <p className="text-xs font-semibold text-[#0F172A] truncate">
                      {readableLocation}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-neutral-200">
              <p className="text-[10px] text-neutral-400">
                Coordinates are hidden from the vendor UI and stored only for logistics.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (
                    latitude === null ||
                    longitude === null
                  ) {
                    setError(
                      "Please select the exact store location before confirming."
                    );
                    return;
                  }

                  closeMap();
                }}
                disabled={
                  latitude === null ||
                  longitude === null ||
                  locationLoading
                }
                className="h-10 px-5 rounded-xl bg-[#2ECC71] hover:bg-[#27AE60] text-white text-xs font-bold disabled:opacity-40"
              >
                {locationLoading
                  ? "Resolving Location..."
                  : "Confirm Location"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTermsModal && (
        <VendorTerms
          onClose={() =>
            setShowTermsModal(false)
          }
          onBack={() =>
            setShowTermsModal(false)
          }
          onAcknowledgeComplete={() => {
            setShowTermsModal(false);
            setLegalCompleted(true);
          }}
        />
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  inputRef,
}: FieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>

      <input
        ref={inputRef}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-[#0F172A] outline-none focus:border-[#2ECC71] transition-colors"
      />
    </div>
  );
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
  inputRef,
}: PasswordFieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-3 pr-11 text-sm text-[#0F172A] outline-none focus:border-[#2ECC71] transition-colors"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#0F172A]"
          aria-label={
            visible
              ? "Hide password"
              : "Show password"
          }
        >
          {visible ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}