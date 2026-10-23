/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, MapPin, Building, Trees, Landmark, ArrowRight } from 'lucide-react';
import { searchAddress } from '../services/nominatim';
import { NominatimResult } from '../types';

interface SearchPanelProps {
  onSelectLocation: (
    lat: number,
    lng: number,
    displayName: string,
    bbox?: [string, string, string, string],
    details?: { title: string; subtitle: string; province?: string; country?: string }
  ) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  onSelectLocation,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced geocoding search for street, area, province, location
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const res = await searchAddress(trimmed, controller.signal);
      setResults(res);
      setIsLoading(false);
      setIsOpen(true);
      setSelectedIndex(-1);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Click outside listener (only closes the dropdown, the search bar always stays 100% visible)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: NominatimResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    const addr = item.address || {};
    const streetOrArea =
      addr.road || addr.suburb || addr.neighbourhood || item.display_name.split(',')[0];
    const city = addr.city || addr.town || addr.village || '';
    const province = addr.state || addr.province || addr.region || '';
    const country = addr.country || '';

    const subtitleParts = [city, province, country].filter(Boolean);
    const subtitle = subtitleParts.join(', ') || item.display_name;

    onSelectLocation(lat, lng, item.display_name, item.boundingbox, {
      title: streetOrArea,
      subtitle,
      province,
      country,
    });
    setIsOpen(false);
    setQuery(streetOrArea);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else if (results.length > 0) {
        handleSelect(results[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getResultIcon = (type: string, category: string) => {
    if (category === 'natural' || type === 'park') return <Trees className="w-4 h-4 text-emerald-600" />;
    if (category === 'tourism' || category === 'historic') return <Landmark className="w-4 h-4 text-amber-600" />;
    if (category === 'building' || category === 'highway') return <Building className="w-4 h-4 text-sky-600" />;
    return <MapPin className="w-4 h-4 text-rose-600" />;
  };

  const quickPlaces = [
    { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, title: 'Tokyo', subtitle: 'Kanto Region, Japan' },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278, title: 'London', subtitle: 'Greater London, United Kingdom' },
    { name: 'New York, USA', lat: 40.7128, lng: -74.006, title: 'New York City', subtitle: 'New York State, USA' },
    { name: 'Paris, France', lat: 48.8566, lng: 2.3522, title: 'Paris', subtitle: 'Île-de-France, France' },
  ];

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Crisp White Floating Search Input Bar - Always Visibly Prominent */}
      <div className="relative flex items-center bg-white text-neutral-900 border-2 border-neutral-300 hover:border-neutral-400 focus-within:border-sky-600 focus-within:ring-4 focus-within:ring-sky-500/20 rounded-2xl shadow-2xl transition-all duration-150">
        <div className="pl-4 pr-2 text-neutral-500 shrink-0">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
          ) : (
            <Search className="w-5 h-5 text-neutral-600" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || query.length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search any street, area, province, or location..."
          className="w-full py-3.5 pr-10 bg-transparent text-sm sm:text-base text-neutral-900 placeholder:text-neutral-500 font-medium focus:outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-neutral-200 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-neutral-100 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
          {results.length > 0 ? (
            <div className="py-1">
              <div className="px-4 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between bg-neutral-50">
                <span>Location Matches</span>
                <span className="text-[10px] text-sky-600 font-mono">OpenStreetMap Search</span>
              </div>
              {results.map((item, idx) => {
                const addr = item.address || {};
                const primary =
                  addr.road ||
                  addr.suburb ||
                  addr.neighbourhood ||
                  item.display_name.split(',')[0];
                const secondary = [
                  addr.city || addr.town || addr.village,
                  addr.state || addr.province || addr.region,
                  addr.country,
                ]
                  .filter(Boolean)
                  .join(', ') || item.display_name;

                return (
                  <button
                    key={`${item.place_id}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors ${
                      selectedIndex === idx
                        ? 'bg-sky-50 text-neutral-900'
                        : 'hover:bg-neutral-50 text-neutral-800'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-neutral-100">
                      {getResultIcon(item.type, item.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">
                        {primary}
                      </div>
                      <div className="text-xs text-neutral-500 truncate mt-0.5">
                        {secondary}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0 self-center opacity-0 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          ) : query.length >= 2 && !isLoading ? (
            <div className="px-4 py-4 text-center text-xs text-neutral-500">
              No matching street or province found. Try a different spelling or nearby town name.
            </div>
          ) : null}

          {/* Quick jump suggestions */}
          <div className="p-3 bg-neutral-50 border-t border-neutral-100">
            <div className="text-[10px] text-neutral-400 mb-1.5 px-1 font-bold uppercase tracking-wider">
              Popular Quick Jumps
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {quickPlaces.map((place) => (
                <button
                  key={place.name}
                  type="button"
                  onClick={() => {
                    onSelectLocation(place.lat, place.lng, place.name, undefined, {
                      title: place.title,
                      subtitle: place.subtitle,
                    });
                    setIsOpen(false);
                    setQuery(place.title);
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg text-left transition-colors truncate shadow-xs"
                >
                  {place.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
