/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, Landmark, Trees, Building2, Atom, Tag } from 'lucide-react';
import { PoiCategory } from '../types';
import { reverseGeocode } from '../services/nominatim';

interface AddMarkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  onSaveMarker: (data: {
    title: string;
    category: PoiCategory;
    description: string;
    color: string;
    address: string;
  }) => void;
}

const COLOR_OPTIONS = [
  '#38bdf8', // sky
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
];

export const AddMarkerModal: React.FC<AddMarkerModalProps> = ({
  isOpen,
  onClose,
  lat,
  lng,
  onSaveMarker,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PoiCategory>('custom');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#38bdf8');
  const [address, setAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDescription('');
    setAddress('');
    setIsGeocoding(true);

    const controller = new AbortController();
    reverseGeocode(lat, lng, controller.signal)
      .then((res) => {
        if (res) {
          const parts = res.displayName.split(',');
          setTitle(parts[0] || 'Custom Location');
          setAddress(res.displayName);
        } else {
          setTitle(`Pin at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      })
      .finally(() => {
        setIsGeocoding(false);
      });

    return () => controller.abort();
  }, [isOpen, lat, lng]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveMarker({
      title: title.trim(),
      category,
      description: description.trim(),
      color,
      address,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Add Custom Place</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Coordinates Header */}
          <div className="flex items-center justify-between text-xs text-neutral-400 bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800 font-mono">
            <span>Latitude: {lat.toFixed(5)}°</span>
            <span>Longitude: {lng.toFixed(5)}°</span>
          </div>

          {/* Place Title */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Place Title
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My Favorite Cafe or Viewpoint"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-sky-500"
              />
              {isGeocoding && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400 absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
            {address && (
              <p className="text-[11px] text-neutral-400 mt-1 truncate">
                {address}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'custom', label: 'Custom', icon: Tag },
                { id: 'monument', label: 'Monument', icon: Landmark },
                { id: 'nature', label: 'Nature', icon: Trees },
                { id: 'city', label: 'City', icon: Building2 },
                { id: 'culture', label: 'Culture', icon: Atom },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as PoiCategory)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500 text-sky-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color accent */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Marker Pin Color
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-125 border-white' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Notes or Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add personal notes, parking tips, opening hours, or coordinates..."
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-white hover:bg-neutral-200 rounded-lg transition-colors shadow-xs"
            >
              Save Pin to Map
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
