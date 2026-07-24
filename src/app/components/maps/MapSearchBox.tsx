import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Loader2,
  MapPin,
  Utensils,
  ShoppingBag,
  Hospital,
  GraduationCap,
  Hotel,
  Building,
  HelpCircle,
} from "lucide-react";
import {
  searchLocation,
  SelectedSearchResult,
} from "../../../services/geocodingService";

export type { SelectedSearchResult };

interface MapSearchBoxProps {
  placeholder?: string;
  onSelectResult: (result: SelectedSearchResult) => void;
}

export const MapSearchBox: React.FC<MapSearchBoxProps> = ({
  placeholder = "Search shop, restaurant or address...",
  onSelectResult,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SelectedSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await searchLocation(query, controller.signal);
        setResults(data);
        setHasSearched(true);
        setIsOpen(true);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Search error:", error);
          setResults([]);
          setHasSearched(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (result: SelectedSearchResult) => {
    setQuery(result.title || result.display_name);
    setIsOpen(false);
    onSelectResult(result);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      handleSelect(results[0]);
    }
  };

  const renderPlaceIcon = (type?: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("restaurant") || t.includes("food") || t.includes("cafe") || t.includes("amenity"))
      return <Utensils className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
    if (t.includes("shop") || t.includes("store") || t.includes("mall"))
      return <ShoppingBag className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
    if (t.includes("hospital") || t.includes("clinic") || t.includes("pharmacy") || t.includes("doctor"))
      return <Hospital className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
    if (t.includes("school") || t.includes("college") || t.includes("university"))
      return <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
    if (t.includes("hotel") || t.includes("lodging"))
      return <Hotel className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
    if (t.includes("building") || t.includes("house"))
      return <Building className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
    return <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full h-10 pl-10 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-slate-100 shadow-xs placeholder:text-slate-400"
        />
        {isLoading && (
          <Loader2 className="absolute right-3.5 w-4 h-4 text-emerald-500 animate-spin" />
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-12 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-1 text-sm">
          {results.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
              {results.map((item, index) => (
                <li
                  key={`${item.latitude}-${item.longitude}-${index}`}
                  onClick={() => handleSelect(item)}
                  className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-start gap-3 transition text-slate-700 dark:text-slate-200"
                >
                  {renderPlaceIcon(item.placeType)}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.title || item.display_name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.display_name}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            hasSearched &&
            !isLoading && (
              <div className="p-4 text-center space-y-1">
                <div className="flex justify-center text-slate-400">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  No matching places found.
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Try searching using a nearby landmark, road or locality.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};