/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  Navigation,
  Compass,
  Search,
  Landmark,
  Trees,
  Building2,
  Atom,
  Tag,
} from 'lucide-react';
import { MarkerItem, PoiCategory } from '../types';
import { SAMPLE_PRESETS } from '../data/samplePresets';

interface PoiSidebarProps {
  markers: MarkerItem[];
  selectedMarkerId: string | null;
  onSelectMarker: (marker: MarkerItem) => void;
  onDeleteMarker: (id: string) => void;
  onLoadPreset: (presetId: string) => void;
  onStartAddPin: () => void;
  onRouteToMarker: (marker: MarkerItem) => void;
}

export const PoiSidebar: React.FC<PoiSidebarProps> = ({
  markers,
  selectedMarkerId,
  onSelectMarker,
  onDeleteMarker,
  onLoadPreset,
  onStartAddPin,
  onRouteToMarker,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePresetId, setActivePresetId] = useState<string>('world-wonders');

  const filteredMarkers = markers.filter((m) => {
    const matchesCategory = filterCategory === 'all' || m.category === filterCategory;
    const matchesSearch =
      !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.address && m.address.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: PoiCategory) => {
    switch (category) {
      case 'monument':
        return <Landmark className="w-3.5 h-3.5 text-amber-400" />;
      case 'nature':
        return <Trees className="w-3.5 h-3.5 text-emerald-400" />;
      case 'city':
        return <Building2 className="w-3.5 h-3.5 text-sky-400" />;
      case 'culture':
        return <Atom className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Tag className="w-3.5 h-3.5 text-pink-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Points of Interest</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {markers.length} places loaded on map
          </p>
        </div>

        <button
          type="button"
          onClick={onStartAddPin}
          className="px-2.5 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-1 shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Drop Pin</span>
        </button>
      </div>

      {/* Preset Switcher */}
      <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2">
        <div className="text-[11px] font-medium text-neutral-300 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          <span>Explore Preset Collections</span>
        </div>
        <div className="grid grid-cols-1 gap-1">
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setActivePresetId(preset.id);
                onLoadPreset(preset.id);
              }}
              className={`px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors flex items-center justify-between ${
                activePresetId === preset.id
                  ? 'bg-neutral-800 text-sky-400 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <span>{preset.name}</span>
              <span className="text-[10px] text-neutral-500 font-mono">
                {preset.markers.length} spots
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search within markers */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter loaded places..."
          className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* Category filter segmented tabs (functional interactive buttons) */}
      <div className="flex flex-wrap gap-1 p-1 bg-neutral-900/90 border border-neutral-800 rounded-lg">
        {[
          { id: 'all', label: 'All' },
          { id: 'monument', label: 'Monuments' },
          { id: 'nature', label: 'Nature' },
          { id: 'culture', label: 'Culture' },
          { id: 'city', label: 'Cities' },
          { id: 'custom', label: 'Custom' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterCategory(tab.id)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
              filterCategory === tab.id
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Markers List */}
      <div className="space-y-1.5 max-h-[calc(100vh-420px)] overflow-y-auto pr-0.5">
        {filteredMarkers.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
            No places match the selected filter.
          </div>
        ) : (
          filteredMarkers.map((marker) => {
            const isSelected = marker.id === selectedMarkerId;

            return (
              <div
                key={marker.id}
                className={`p-2.5 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'border-sky-500/80 bg-sky-950/20 shadow-sm ring-1 ring-sky-500/30'
                    : 'border-neutral-800 bg-neutral-900/40 hover:bg-neutral-800/40 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectMarker(marker)}
                    className="flex items-start gap-2 text-left flex-1 min-w-0"
                  >
                    <div className="mt-0.5 shrink-0">{getCategoryIcon(marker.category)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-neutral-200 hover:text-sky-400 transition-colors truncate">
                        {marker.title}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate mt-0.5 font-mono">
                        {marker.lat.toFixed(4)}°, {marker.lng.toFixed(4)}°
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Route to here"
                      onClick={() => onRouteToMarker(marker)}
                      className="p-1 text-neutral-400 hover:text-sky-400 hover:bg-neutral-800 rounded transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                    {marker.isCustom && (
                      <button
                        type="button"
                        title="Delete marker"
                        onClick={() => onDeleteMarker(marker.id)}
                        className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {marker.description && (
                  <p className="text-[11px] text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {marker.description}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
