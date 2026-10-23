/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, ShieldCheck, ExternalLink, Globe, Satellite, Sparkles } from 'lucide-react';
import { TILE_PROVIDERS } from '../data/tileProviders';
import { TileLayerId } from '../types';

interface LayerSelectorProps {
  currentLayerId: TileLayerId;
  onSelectLayer: (id: TileLayerId) => void;
  showSatelliteOverlay: boolean;
  setShowSatelliteOverlay: (show: boolean) => void;
}

export const LayerSelector: React.FC<LayerSelectorProps> = ({
  currentLayerId,
  onSelectLayer,
  showSatelliteOverlay,
  setShowSatelliteOverlay,
}) => {
  const isSatelliteActive = currentLayerId === 'esri-satellite';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-white">Tile Providers</h3>
        <p className="text-xs text-neutral-400 mt-0.5">
          Click any style below to change the map instantly. Zero API costs.
        </p>
      </div>

      {/* Featured Satellite View Action Card */}
      <div
        onClick={() => onSelectLayer('esri-satellite')}
        className={`p-3.5 rounded-xl border cursor-pointer transition-all relative overflow-hidden flex items-center justify-between ${
          isSatelliteActive
            ? 'border-sky-500 bg-sky-950/40 ring-2 ring-sky-500/40 shadow-lg'
            : 'border-neutral-700 bg-gradient-to-r from-neutral-900 to-neutral-800 hover:border-neutral-600'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isSatelliteActive ? 'bg-sky-500 text-white' : 'bg-neutral-800 text-sky-400 border border-neutral-700'
            }`}
          >
            <Satellite className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">High-Res Satellite View</span>
              <span className="text-[10px] text-sky-400 flex items-center gap-0.5 font-medium">
                <Sparkles className="w-2.5 h-2.5" /> Aerial
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate mt-0.5">
              Click to view global satellite imagery with road labels.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectLayer('esri-satellite');
          }}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition-colors ml-2 ${
            isSatelliteActive
              ? 'bg-sky-500 text-white shadow-xs'
              : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white border border-neutral-700'
          }`}
        >
          {isSatelliteActive ? 'Active' : 'Switch'}
        </button>
      </div>

      {/* All Tile Layers List */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
          Standard & Themed Basemaps
        </div>

        {TILE_PROVIDERS.map((provider) => {
          const isSelected = provider.id === currentLayerId;

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => onSelectLayer(provider.id)}
              className={`w-full p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex items-start gap-3 ${
                isSelected
                  ? 'border-sky-500 bg-sky-950/25 shadow-md ring-1 ring-sky-500/50'
                  : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800/60 hover:border-neutral-700'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected
                    ? 'bg-sky-500 text-white'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                }`}
              >
                {provider.id === 'esri-satellite' ? (
                  <Satellite className="w-4 h-4" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-white truncate">
                      {provider.name}
                    </span>
                    <span className="text-[10px] text-neutral-400">· {provider.badge}</span>
                  </div>

                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center text-white shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                  {provider.description}
                </p>

                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-neutral-400 font-mono">
                  <span>Max Zoom: {provider.maxZoom}</span>
                  <span>·</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Zero API Cost
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Satellite Overlay option if Esri satellite is active */}
      {isSatelliteActive && (
        <div className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">OSM Roads & Labels Overlay</span>
            <input
              type="checkbox"
              id="satellite-overlay-toggle"
              checked={showSatelliteOverlay}
              onChange={(e) => setShowSatelliteOverlay(e.target.checked)}
              className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-neutral-400">
            Overlays OpenStreetMap road outlines, city names, and province borders over satellite imagery.
          </p>
        </div>
      )}

      {/* Free OSM Compliance */}
      <div className="p-3 bg-neutral-900/40 border border-neutral-800/80 rounded-xl text-[11px] text-neutral-400 space-y-1">
        <p>
          All basemaps use OpenStreetMap community geodata and open GIS tiles without subscription limits or billable API endpoints.
        </p>
        <div className="pt-0.5">
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
          >
            OpenStreetMap Copyright & License <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
