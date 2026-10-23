/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Plus,
  Minus,
  Locate,
  Maximize2,
  Minimize2,
  RotateCcw,
  Satellite,
  Map as MapIcon,
} from 'lucide-react';
import {
  TileLayerId,
  MarkerItem,
  ActiveTool,
  RouteResult,
  MeasurementState,
} from '../types';
import { TILE_PROVIDERS } from '../data/tileProviders';
import { formatCoordinates } from '../utils/geoUtils';

interface MapContainerProps {
  currentLayerId: TileLayerId;
  setCurrentLayerId: (id: TileLayerId) => void;
  showSatelliteOverlay: boolean;
  markers: MarkerItem[];
  selectedMarkerId: string | null;
  onSelectMarker: (marker: MarkerItem) => void;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  activeRoute: RouteResult | null;
  measurement: MeasurementState;
  onAddMeasurementPoint: (lat: number, lng: number) => void;
  onMapClickToAddPin: (lat: number, lng: number) => void;
  onRouteToMarker: (marker: MarkerItem) => void;
  onDeleteMarker: (id: string) => void;
  focusedLocation: { lat: number; lng: number; zoom?: number; timestamp: number } | null;
  searchMarker: { lat: number; lng: number; title: string; subtitle: string } | null;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  currentLayerId,
  setCurrentLayerId,
  showSatelliteOverlay,
  markers,
  selectedMarkerId,
  onSelectMarker,
  activeTool,
  setActiveTool,
  activeRoute,
  measurement,
  onAddMeasurementPoint,
  onMapClickToAddPin,
  onRouteToMarker,
  onDeleteMarker,
  focusedLocation,
  searchMarker,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const measureLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const searchResultMarkerRef = useRef<L.Marker | null>(null);

  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(4);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [prevNonSatelliteLayer, setPrevNonSatelliteLayer] = useState<TileLayerId>('osm-standard');

  // Initialize Map (with attributionControl: false to completely hide OpenStreetMap contributors)
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    const map = L.map(containerRef.current, {
      center: [48.8566, 2.3522],
      zoom: 5,
      zoomControl: false, // Custom white controls
      attributionControl: false, // Completely hide leaflet / OSM contributors
    });
    mapInstanceRef.current = map;

    // Create layer groups
    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = L.layerGroup().addTo(map);
    measureLayerGroupRef.current = L.layerGroup().addTo(map);

    // Track mouse coordinates
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    // Track zoom level
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    // ResizeObserver ensures smooth re-rendering
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Base Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const provider = TILE_PROVIDERS.find((p) => p.id === currentLayerId) || TILE_PROVIDERS[0];

    // Remove old base layer
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    // Add new base layer
    const newBaseLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains || ['a', 'b', 'c'],
    }).addTo(map);
    newBaseLayer.bringToBack();
    baseTileLayerRef.current = newBaseLayer;

    // Handle satellite OSM overlay if active
    if (overlayTileLayerRef.current) {
      map.removeLayer(overlayTileLayerRef.current);
      overlayTileLayerRef.current = null;
    }

    if (currentLayerId === 'esri-satellite' && showSatelliteOverlay) {
      const overlay = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c', 'd'],
          opacity: 0.9,
        }
      ).addTo(map);
      overlayTileLayerRef.current = overlay;
    }
  }, [currentLayerId, showSatelliteOverlay]);

  // Click Handler on Map depending on activeTool
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (activeTool === 'add-pin') {
        onMapClickToAddPin(lat, lng);
      } else if (activeTool === 'measure-distance' || activeTool === 'measure-area') {
        onAddMeasurementPoint(lat, lng);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [activeTool, onAddMeasurementPoint, onMapClickToAddPin]);

  // Handle Focused Location (e.g. from Nominatim search or POI click)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusedLocation) return;

    map.flyTo([focusedLocation.lat, focusedLocation.lng], focusedLocation.zoom || 14, {
      duration: 1.4,
      easeLinearity: 0.25,
    });
  }, [focusedLocation]);

  // Search Pin Marker Rendering
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (searchResultMarkerRef.current) {
      map.removeLayer(searchResultMarkerRef.current);
      searchResultMarkerRef.current = null;
    }

    if (searchMarker) {
      const pinHtml = `
        <div class="search-pin-animated flex flex-col items-center cursor-pointer" style="width: 36px; height: 42px;">
          <div class="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xl border-2 border-white ring-2 ring-rose-500/40">
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div class="w-1.5 h-1.5 bg-rose-600 rounded-full mt-0.5"></div>
        </div>
      `;

      const pinIcon = L.divIcon({
        className: 'search-location-pin',
        html: pinHtml,
        iconSize: [36, 42],
        iconAnchor: [18, 40],
        popupAnchor: [0, -38],
      });

      const marker = L.marker([searchMarker.lat, searchMarker.lng], {
        icon: pinIcon,
        zIndexOffset: 950,
      }).addTo(map);

      marker
        .bindPopup(`
          <div style="font-family: inherit; min-width: 200px; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 9999px; background: #e11d48;"></span>
              <strong style="color: #ffffff; font-size: 13px;">${searchMarker.title}</strong>
            </div>
            <div style="font-size: 11px; color: #cbd5e1; line-height: 1.4; margin-bottom: 6px;">
              ${searchMarker.subtitle}
            </div>
            <div style="font-family: monospace; font-size: 10px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">
              ${searchMarker.lat.toFixed(5)}°, ${searchMarker.lng.toFixed(5)}°
            </div>
          </div>
        `)
        .openPopup();

      searchResultMarkerRef.current = marker;
    }
  }, [searchMarker]);

  // Render Markers on Map
  useEffect(() => {
    const layerGroup = markersLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!layerGroup || !map) return;

    layerGroup.clearLayers();

    markers.forEach((marker) => {
      const isSelected = marker.id === selectedMarkerId;
      const pinColor = marker.color || '#38bdf8';

      // Modern SVG Pin divIcon with pulse
      const iconHtml = `
        <div class="custom-pin relative flex items-center justify-center cursor-pointer" style="width: 34px; height: 34px;">
          ${
            isSelected
              ? `<div class="radar-ring absolute inset-0 rounded-full" style="background-color: ${pinColor}; opacity: 0.4;"></div>`
              : ''
          }
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white/90 transition-transform ${
            isSelected ? 'scale-115 ring-2 ring-white' : ''
          }" style="background-color: ${pinColor};">
            <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `;

      const divIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: iconHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 32],
        popupAnchor: [0, -32],
      });

      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: divIcon,
        riseOnHover: true,
      });

      // Construct interactive popup
      const popupDiv = document.createElement('div');
      popupDiv.className = 'p-1 text-neutral-100 max-w-xs';
      popupDiv.innerHTML = `
        <div class="font-semibold text-sm text-white mb-0.5">${marker.title}</div>
        <div class="text-[11px] text-neutral-400 font-mono mb-2">${marker.lat.toFixed(4)}°, ${marker.lng.toFixed(4)}°</div>
        ${
          marker.description
            ? `<div class="text-xs text-neutral-300 mb-2 leading-relaxed">${marker.description}</div>`
            : ''
        }
        ${
          marker.address
            ? `<div class="text-[11px] text-neutral-400 mb-3">${marker.address}</div>`
            : ''
        }
        <div class="flex items-center gap-1.5 pt-2 border-t border-neutral-800">
          <button id="btn-route-${marker.id}" class="px-2.5 py-1 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors flex items-center gap-1">
            Directions
          </button>
          ${
            marker.isCustom
              ? `<button id="btn-del-${marker.id}" class="px-2.5 py-1 text-xs text-rose-300 hover:text-white hover:bg-rose-950/60 rounded-md transition-colors">
                  Delete
                </button>`
              : ''
          }
        </div>
      `;

      leafletMarker.bindPopup(popupDiv);
      leafletMarker.on('popupopen', () => {
        const routeBtn = document.getElementById(`btn-route-${marker.id}`);
        if (routeBtn) {
          routeBtn.onclick = () => {
            onRouteToMarker(marker);
            map.closePopup();
          };
        }
        const delBtn = document.getElementById(`btn-del-${marker.id}`);
        if (delBtn) {
          delBtn.onclick = () => {
            onDeleteMarker(marker.id);
            map.closePopup();
          };
        }
      });

      leafletMarker.on('click', () => {
        onSelectMarker(marker);
      });

      leafletMarker.addTo(layerGroup);
    });
  }, [markers, selectedMarkerId, onSelectMarker, onRouteToMarker, onDeleteMarker]);

  // Render Active Route Polyline
  useEffect(() => {
    const routeGroup = routeLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!routeGroup || !map) return;

    routeGroup.clearLayers();

    if (activeRoute && activeRoute.coordinates.length > 1) {
      L.polyline(activeRoute.coordinates, {
        color: '#0284c7',
        weight: 7,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeGroup);

      const routeLine = L.polyline(activeRoute.coordinates, {
        color: '#38bdf8',
        weight: 4,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeGroup);

      const startCoord = activeRoute.coordinates[0];
      const endCoord = activeRoute.coordinates[activeRoute.coordinates.length - 1];

      const startIcon = L.divIcon({
        className: 'route-flag-start',
        html: `
          <div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] shadow-md border-2 border-white">
            A
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const endIcon = L.divIcon({
        className: 'route-flag-end',
        html: `
          <div class="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-[10px] shadow-md border-2 border-white">
            B
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker(startCoord, { icon: startIcon }).addTo(routeGroup);
      L.marker(endCoord, { icon: endIcon }).addTo(routeGroup);

      map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
    }
  }, [activeRoute]);

  // Render Measurement Polylines & Polygons
  useEffect(() => {
    const measureGroup = measureLayerGroupRef.current;
    if (!measureGroup) return;

    measureGroup.clearLayers();

    const { points } = measurement;
    if (points.length === 0) return;

    points.forEach((pt, idx) => {
      const dotIcon = L.divIcon({
        className: 'measure-vertex',
        html: `
          <div class="w-3.5 h-3.5 rounded-full bg-white border-2 border-sky-500 shadow-md flex items-center justify-center text-[9px] font-bold text-sky-800">
            ${idx + 1}
          </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker(pt, { icon: dotIcon }).addTo(measureGroup);
    });

    if (points.length >= 2) {
      if (activeTool === 'measure-area' && points.length >= 3) {
        L.polygon(points, {
          color: '#10b981',
          weight: 2.5,
          fillColor: '#10b981',
          fillOpacity: 0.25,
          dashArray: '4, 4',
        }).addTo(measureGroup);
      } else {
        L.polyline(points, {
          color: '#38bdf8',
          weight: 3,
          dashArray: '6, 6',
        }).addTo(measureGroup);
      }
    }
  }, [measurement, activeTool]);

  // Automatic & Manual User Location Tracking
  const handleLocateMe = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;

        if (userLocationMarkerRef.current) {
          map.removeLayer(userLocationMarkerRef.current);
        }
        if (accuracyCircleRef.current) {
          map.removeLayer(accuracyCircleRef.current);
        }

        const circle = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#0284c7',
          weight: 1.5,
          opacity: 0.7,
          fillColor: '#38bdf8',
          fillOpacity: 0.15,
        }).addTo(map);
        accuracyCircleRef.current = circle;

        const userIcon = L.divIcon({
          className: 'user-loc-pin',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer" style="width: 44px; height: 44px;">
              <div class="radar-ring absolute inset-0 rounded-full bg-sky-400 opacity-60"></div>
              <div class="absolute w-7 h-7 rounded-full bg-sky-500/30 animate-ping"></div>
              <div class="relative w-5 h-5 rounded-full bg-sky-500 border-[3px] border-white shadow-xl flex items-center justify-center">
                <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          popupAnchor: [0, -22],
        });

        const marker = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: inherit; min-width: 170px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 9999px; background: #38bdf8;"></span>
              <strong style="color: #ffffff; font-size: 13px;">Your Exact Location</strong>
            </div>
            <div style="font-family: monospace; font-size: 11px; color: #a1a1aa; margin-bottom: 4px;">
              ${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°
            </div>
            <div style="font-size: 11px; color: #71717a;">
              Accuracy: <span style="font-family: monospace; color: #38bdf8;">&plusmn;${Math.round(accuracy)}m</span>
            </div>
          </div>
        `).openPopup();

        userLocationMarkerRef.current = marker;
        map.flyTo([latitude, longitude], 16, { duration: 1.5 });
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation notice:', err.message);
      },
      { timeout: 9000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    handleLocateMe();
  }, [handleLocateMe]);

  // Toggle Satellite View
  const handleToggleSatellite = () => {
    if (currentLayerId === 'esri-satellite') {
      setCurrentLayerId(prevNonSatelliteLayer);
    } else {
      setPrevNonSatelliteLayer(currentLayerId);
      setCurrentLayerId('esri-satellite');
    }
  };

  const handleResetView = () => {
    mapInstanceRef.current?.flyTo([30.0, 10.0], 3, { duration: 1.2 });
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const isSatelliteActive = currentLayerId === 'esri-satellite';

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Leaflet DOM container */}
      <div
        ref={containerRef}
        className={`w-full h-full ${
          activeTool === 'add-pin'
            ? 'cursor-crosshair'
            : activeTool === 'measure-distance' || activeTool === 'measure-area'
            ? 'cursor-cell'
            : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Floating White Controls on Right Side (Satellite View + Crisp White Zoom Feature + Location) */}
      <div className="absolute top-8 sm:top-10 right-4 z-20 flex flex-col gap-2.5 shadow-2xl">
        {/* Satellite View Toggle Icon Button (Crisp White with Active State) */}
        <button
          type="button"
          onClick={handleToggleSatellite}
          className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all ${
            isSatelliteActive
              ? 'bg-sky-600 text-white border-sky-500 shadow-sky-600/30 shadow-lg ring-2 ring-sky-500/40'
              : 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-200 shadow-lg'
          }`}
          title={isSatelliteActive ? 'Switch to Street Map View' : 'Switch to Satellite View'}
          aria-label={isSatelliteActive ? 'Switch to Street Map View' : 'Switch to Satellite View'}
        >
          {isSatelliteActive ? (
            <MapIcon className="w-5 h-5 text-white" />
          ) : (
            <Satellite className="w-5 h-5 text-neutral-700" />
          )}
        </button>

        {/* Crisp White Zoom Feature Cluster (+ / -) */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden flex flex-col divide-y divide-neutral-200 shadow-xl">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-11 h-11 flex items-center justify-center text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={handleZoomOut}
            className="w-11 h-11 flex items-center justify-center text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Crisp White Locate Me, Reset, Fullscreen */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden flex flex-col divide-y divide-neutral-200 shadow-xl">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="w-11 h-11 flex items-center justify-center text-neutral-800 hover:text-sky-600 hover:bg-neutral-100 transition-colors disabled:opacity-50"
            title="Show My Exact Location"
            aria-label="Show My Exact Location"
          >
            <Locate className={`w-5 h-5 ${isLocating ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleResetView}
            className="w-11 h-11 flex items-center justify-center text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
            title="Reset Global View"
            aria-label="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-11 h-11 flex items-center justify-center text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mode Banner Indicator if activeTool is not explore */}
      {activeTool !== 'explore' && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 bg-neutral-900/95 backdrop-blur-md border border-sky-500/50 rounded-full px-4 py-1.5 shadow-xl flex items-center gap-2.5 text-xs">
          <span className="text-white font-medium">Interactive tool active</span>
          <button
            type="button"
            onClick={() => setActiveTool('explore')}
            className="ml-2 text-neutral-400 hover:text-white text-[11px] underline font-medium"
          >
            Done
          </button>
        </div>
      )}

      {/* Bottom Coordinates & Zoom HUD */}
      <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-3 bg-neutral-900/90 backdrop-blur-md border border-neutral-800/80 px-3 py-1.5 rounded-lg text-xs font-mono tabular-nums text-neutral-300 shadow-lg">
        {cursorCoords ? (
          <span>{formatCoordinates(cursorCoords.lat, cursorCoords.lng)}</span>
        ) : (
          <span className="text-neutral-500">Move mouse to inspect coordinates</span>
        )}
        <span className="text-neutral-600">|</span>
        <span className="text-neutral-400">Zoom: {currentZoom}</span>
        {isSatelliteActive && (
          <>
            <span className="text-neutral-600">|</span>
            <span className="text-sky-400 font-sans font-bold text-[10px] uppercase">Satellite</span>
          </>
        )}
      </div>
    </div>
  );
};
