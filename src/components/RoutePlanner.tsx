/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Navigation,
  Car,
  Bike,
  Footprints,
  Loader2,
  Trash2,
  ArrowUpDown,
  CornerDownRight,
  Clock,
  Compass,
} from 'lucide-react';
import { RouteMode, RouteResult, MarkerItem } from '../types';
import { calculateRoute } from '../services/osrm';

interface RoutePlannerProps {
  markers: MarkerItem[];
  activeRoute: RouteResult | null;
  setActiveRoute: (route: RouteResult | null) => void;
  onFlyToRoute: () => void;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  markers,
  activeRoute,
  setActiveRoute,
  onFlyToRoute,
}) => {
  const [mode, setMode] = useState<RouteMode>('driving');
  const [originId, setOriginId] = useState<string>(markers[0]?.id || '');
  const [destinationId, setDestinationId] = useState<string>(markers[1]?.id || '');
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSwap = () => {
    const temp = originId;
    setOriginId(destinationId);
    setDestinationId(temp);
  };

  const handleComputeRoute = async () => {
    const originMarker = markers.find((m) => m.id === originId);
    const destMarker = markers.find((m) => m.id === destinationId);

    if (!originMarker || !destMarker) {
      setErrorMsg('Please select both an origin and a destination.');
      return;
    }
    if (originMarker.id === destMarker.id) {
      setErrorMsg('Origin and destination must be different.');
      return;
    }

    setErrorMsg(null);
    setIsCalculating(true);

    try {
      const result = await calculateRoute(
        { lat: originMarker.lat, lng: originMarker.lng, name: originMarker.title },
        { lat: destMarker.lat, lng: destMarker.lng, name: destMarker.title },
        mode
      );
      setActiveRoute(result);
      onFlyToRoute();
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Failed to calculate route. Using geodesic path.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Route Directions</h3>
        <p className="text-xs text-neutral-400 mt-0.5">
          Free turn-by-turn routing powered by Open Source Routing Machine (OSRM).
        </p>
      </div>

      {/* Mode Selector Buttons */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
        <button
          type="button"
          onClick={() => setMode('driving')}
          className={`py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'driving'
              ? 'bg-neutral-800 text-sky-400 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Drive</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('cycling')}
          className={`py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'cycling'
              ? 'bg-neutral-800 text-sky-400 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>Cycle</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('walking')}
          className={`py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'walking'
              ? 'bg-neutral-800 text-sky-400 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Footprints className="w-3.5 h-3.5" />
          <span>Walk</span>
        </button>
      </div>

      {/* Waypoint Selectors */}
      <div className="space-y-2 p-3 bg-neutral-900/70 border border-neutral-800 rounded-xl relative">
        {/* Origin */}
        <div>
          <label className="text-[11px] font-medium text-neutral-400 block mb-1">
            Origin
          </label>
          <select
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">Select origin point...</option>
            {markers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.category})
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-1">
          <button
            type="button"
            onClick={handleSwap}
            className="p-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors shadow-xs"
            title="Swap origin and destination"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Destination */}
        <div>
          <label className="text-[11px] font-medium text-neutral-400 block mb-1">
            Destination
          </label>
          <select
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
          >
            <option value="">Select destination point...</option>
            {markers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.category})
              </option>
            ))}
          </select>
        </div>

        {errorMsg && <p className="text-xs text-rose-400 pt-1">{errorMsg}</p>}

        <button
          type="button"
          onClick={handleComputeRoute}
          disabled={isCalculating || !originId || !destinationId}
          className="w-full mt-2 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:hover:bg-sky-600 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          {isCalculating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Calculating Route...</span>
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5" />
              <span>Compute Free Route</span>
            </>
          )}
        </button>
      </div>

      {/* Active Route Results */}
      {activeRoute && (
        <div className="space-y-3 p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div>
              <div className="text-xs font-semibold text-white">Route Summary</div>
              <div className="text-[11px] text-neutral-400">
                {activeRoute.originName} &rarr; {activeRoute.destinationName}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveRoute(null)}
              className="p-1 text-neutral-400 hover:text-rose-400 rounded transition-colors"
              title="Clear Route"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-neutral-950 rounded-lg border border-neutral-800/80">
              <div className="text-[10px] text-neutral-400 flex items-center justify-center gap-1">
                <Compass className="w-3 h-3 text-sky-400" /> Distance
              </div>
              <div className="text-sm font-semibold text-white font-mono tabular-nums mt-0.5">
                {activeRoute.distanceKm} km
              </div>
            </div>
            <div className="p-2 bg-neutral-950 rounded-lg border border-neutral-800/80">
              <div className="text-[10px] text-neutral-400 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> Est. Time
              </div>
              <div className="text-sm font-semibold text-white font-mono tabular-nums mt-0.5">
                {activeRoute.durationMinutes > 60
                  ? `${Math.floor(activeRoute.durationMinutes / 60)}h ${activeRoute.durationMinutes % 60}m`
                  : `${activeRoute.durationMinutes} min`}
              </div>
            </div>
          </div>

          {/* Turn-by-Turn Steps */}
          {activeRoute.steps && activeRoute.steps.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-medium text-neutral-400">Turn-by-Turn Directions</div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-xs divide-y divide-neutral-800/40">
                {activeRoute.steps.map((step, idx) => (
                  <div key={idx} className="pt-1.5 first:pt-0 flex items-start gap-2">
                    <CornerDownRight className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-neutral-200">{step.instruction}</div>
                      {step.distance > 0 && (
                        <div className="text-[10px] text-neutral-400 font-mono tabular-nums">
                          {step.distance >= 1000
                            ? `${(step.distance / 1000).toFixed(1)} km`
                            : `${Math.round(step.distance)} m`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
