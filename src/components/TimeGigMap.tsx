/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Wrench,
  Camera,
  Code2,
  PartyPopper,
  Home,
  Truck,
  Star,
  Clock,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import { GigItem } from '../data/timegigData';
import { haversineDistanceMeters, formatDistance } from '../utils/geoUtils';

// Fix Leaflet default icon paths in bundlers / Vercel deployment
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface TimeGigMapProps {
  gigs: GigItem[];
  userLocation: UserLocation | null;
  targetLocation: { lat: number; lng: number; zoom?: number } | null;
  selectedGig: GigItem | null;
  onSelectGig: (gig: GigItem) => void;
  onApplyGig: (gig: GigItem) => void;
  searchMarker: { lat: number; lng: number; title: string; subtitle: string } | null;
  isSatellite?: boolean;
}

// Controller component to smoothly center/fly map when target location changes
function MapViewController({
  target,
}: {
  target: { lat: number; lng: number; zoom?: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom || 15, {
      duration: 1.4,
      easeLinearity: 0.25,
    });
  }, [map, target]);

  return null;
}

export const TimeGigMap: React.FC<TimeGigMapProps> = ({
  gigs,
  userLocation,
  targetLocation,
  selectedGig,
  onSelectGig,
  onApplyGig,
  searchMarker,
  isSatellite = false,
}) => {
  // Center of South Africa as default viewport when GPS has not yet resolved
  const defaultSouthAfricaCenter: [number, number] = [-29.0, 25.0];
  const defaultZoom = 6;

  // Custom User Location Puck Icon
  const userLocationIcon = L.divIcon({
    className: 'timegig-user-puck',
    html: `
      <div class="relative flex items-center justify-center cursor-pointer" style="width: 44px; height: 44px;">
        <div class="radar-ring absolute inset-0 rounded-full bg-sky-500 opacity-60"></div>
        <div class="absolute w-7 h-7 rounded-full bg-sky-500/30 animate-ping"></div>
        <div class="relative w-5 h-5 rounded-full bg-sky-600 border-[3px] border-white shadow-2xl flex items-center justify-center">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });

  // Custom Search Location Icon
  const searchPinIcon = L.divIcon({
    className: 'search-location-pin',
    html: `
      <div class="search-pin-animated flex flex-col items-center cursor-pointer" style="width: 36px; height: 42px;">
        <div class="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xl border-2 border-white ring-2 ring-rose-500/40">
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="w-1.5 h-1.5 bg-rose-600 rounded-full mt-0.5"></div>
      </div>
    `,
    iconSize: [36, 42],
    iconAnchor: [18, 40],
    popupAnchor: [0, -38],
  });

  // Category Icon & Color Mapping for Gigs
  const getCategoryTheme = (category: GigItem['category']) => {
    switch (category) {
      case 'Trades':
        return { color: '#0284c7', bg: 'bg-sky-600', text: 'text-sky-600', icon: Wrench };
      case 'Creative':
        return { color: '#8b5cf6', bg: 'bg-purple-600', text: 'text-purple-600', icon: Camera };
      case 'Tech':
        return { color: '#10b981', bg: 'bg-emerald-600', text: 'text-emerald-600', icon: Code2 };
      case 'Events':
        return { color: '#f59e0b', bg: 'bg-amber-600', text: 'text-amber-600', icon: PartyPopper };
      case 'Home':
        return { color: '#06b6d4', bg: 'bg-cyan-600', text: 'text-cyan-600', icon: Home };
      default:
        return { color: '#64748b', bg: 'bg-slate-600', text: 'text-slate-600', icon: Truck };
    }
  };

  const createGigIcon = (gig: GigItem, isSelected: boolean) => {
    const theme = getCategoryTheme(gig.category);

    return L.divIcon({
      className: 'timegig-marker',
      html: `
        <div class="relative flex flex-col items-center cursor-pointer transition-transform ${
          isSelected ? 'scale-125 z-50' : 'hover:scale-110'
        }" style="width: 72px;">
          <!-- Price Tag Pill -->
          <div class="px-2 py-0.5 rounded-full text-[11px] font-bold text-white shadow-lg border border-white whitespace-nowrap" style="background-color: ${theme.color};">
            R ${gig.payZar.toLocaleString()}
          </div>
          <!-- Pin Beacon Point -->
          <div class="w-2 h-2 rounded-full border border-white shadow-sm mt-0.5" style="background-color: ${theme.color};"></div>
        </div>
      `,
      iconSize: [72, 34],
      iconAnchor: [36, 32],
      popupAnchor: [0, -32],
    });
  };

  return (
    <div className="relative w-full h-full select-none">
      <MapContainer
        center={defaultSouthAfricaCenter}
        zoom={defaultZoom}
        zoomControl={false}
        attributionControl={false} // OpenStreetMap contributors hidden per request
        className="w-full h-full"
      >
        {/* Public Free Map Tiles - Zero API Key & Zero API Costs */}
        {isSatellite ? (
          <TileLayer
            key="satellite-layer"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            key="osm-streets-layer"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

        {/* View Controller for Camera Moves */}
        <MapViewController target={targetLocation} />

        {/* User GPS Location in South Africa */}
        {userLocation && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={userLocation.accuracy}
              pathOptions={{
                color: '#0284c7',
                weight: 1.5,
                opacity: 0.7,
                fillColor: '#38bdf8',
                fillOpacity: 0.15,
              }}
            />
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userLocationIcon}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="p-1 font-sans min-w-[180px]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    <span>Your Actual GPS Location</span>
                  </div>
                  <div className="text-[11px] text-neutral-300 font-mono">
                    {userLocation.lat.toFixed(5)}°, {userLocation.lng.toFixed(5)}°
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1">
                    GPS Accuracy: &plusmn;{Math.round(userLocation.accuracy)} meters
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Search Result Location Pin */}
        {searchMarker && (
          <Marker
            position={[searchMarker.lat, searchMarker.lng]}
            icon={searchPinIcon}
            zIndexOffset={950}
          >
            <Popup>
              <div className="p-1 font-sans min-w-[200px]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="truncate">{searchMarker.title}</span>
                </div>
                <div className="text-[11px] text-neutral-300 line-clamp-2 mb-1">
                  {searchMarker.subtitle}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono">
                  {searchMarker.lat.toFixed(5)}°, {searchMarker.lng.toFixed(5)}°
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* TimeGiG Gig Location Markers */}
        {gigs.map((gig) => {
          const isSelected = selectedGig?.id === gig.id;
          const theme = getCategoryTheme(gig.category);
          const Icon = theme.icon;

          // Compute distance from user if GPS granted
          let distanceLabel = '';
          if (userLocation) {
            const meters = haversineDistanceMeters(
              userLocation.lat,
              userLocation.lng,
              gig.lat,
              gig.lng
            );
            distanceLabel = formatDistance(meters).metric;
          }

          return (
            <Marker
              key={gig.id}
              position={[gig.lat, gig.lng]}
              icon={createGigIcon(gig, isSelected)}
              eventHandlers={{
                click: () => onSelectGig(gig),
              }}
            >
              <Popup>
                <div className="p-1 font-sans min-w-[240px]">
                  {/* Category & Urgency */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-sky-400 flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      <span>{gig.category}</span>
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {gig.postedAt}
                    </span>
                  </div>

                  {/* Gig Title */}
                  <h4 className="text-sm font-bold text-white mb-1 leading-snug">
                    {gig.title}
                  </h4>

                  {/* Compensation in ZAR */}
                  <div className="text-base font-extrabold text-emerald-400 font-mono mb-2">
                    R {gig.payZar.toLocaleString()}{' '}
                    <span className="text-[11px] font-normal text-neutral-400 font-sans">
                      /{gig.rateType}
                    </span>
                  </div>

                  {/* Area and Distance */}
                  <div className="flex items-center gap-1.5 text-xs text-neutral-300 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">
                      {gig.area}, {gig.city}
                    </span>
                    {distanceLabel && (
                      <span className="text-sky-400 font-mono text-[11px] ml-auto shrink-0">
                        {distanceLabel} away
                      </span>
                    )}
                  </div>

                  {/* Description snippet */}
                  <p className="text-[11px] text-neutral-300 line-clamp-2 mb-2 leading-relaxed">
                    {gig.description}
                  </p>

                  {/* Client Info & Apply Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{gig.clientRating.toFixed(1)}</span>
                      <span>· {gig.clientName}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onApplyGig(gig)}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm"
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
