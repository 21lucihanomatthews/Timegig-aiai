/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, Download, Upload, FileCode, CheckCircle2 } from 'lucide-react';
import { MarkerItem, RouteResult } from '../types';
import { exportToGeoJson } from '../utils/geoUtils';

interface GeoJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  markers: MarkerItem[];
  activeRoute: RouteResult | null;
  measurePoints: [number, number][];
  onImportFeatures: (newMarkers: MarkerItem[]) => void;
}

export const GeoJsonModal: React.FC<GeoJsonModalProps> = ({
  isOpen,
  onClose,
  markers,
  activeRoute,
  measurePoints,
  onImportFeatures,
}) => {
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const geoJsonString = exportToGeoJson(markers, activeRoute, measurePoints);

  const handleCopy = () => {
    navigator.clipboard.writeText(geoJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([geoJsonString], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openstreetmap-export-${new Date().toISOString().slice(0, 10)}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
      processImport(content);
    };
    reader.readAsText(file);
  };

  const processImport = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const importedMarkers: MarkerItem[] = [];

      if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
        parsed.features.forEach((feat: Record<string, unknown>, idx: number) => {
          const geom = feat.geometry as { type: string; coordinates: [number, number] } | undefined;
          const props = (feat.properties || {}) as Record<string, string>;

          if (geom && geom.type === 'Point' && Array.isArray(geom.coordinates)) {
            const [lng, lat] = geom.coordinates;
            importedMarkers.push({
              id: `imported-${Date.now()}-${idx}`,
              title: props.title || props.name || `Imported Point ${idx + 1}`,
              category: 'custom',
              lat,
              lng,
              description: props.description || 'Imported from GeoJSON file',
              address: props.address,
              color: '#38bdf8',
              isCustom: true,
            });
          }
        });
      }

      if (importedMarkers.length > 0) {
        onImportFeatures(importedMarkers);
        setImportStatus(`Successfully imported ${importedMarkers.length} point features onto the map!`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setImportStatus('No Point features found in the provided GeoJSON.');
      }
    } catch {
      setImportStatus('Invalid GeoJSON format. Please verify the JSON syntax.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-3xl">
      <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">GeoJSON Spatial Data</h3>
              <p className="text-[11px] text-neutral-400">
                Industry-standard format compatible with QGIS, Mapbox, Leaflet, and turf.js.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center px-5 pt-3 gap-2 border-b border-neutral-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export & View ({markers.length} points)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import GeoJSON</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'export' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  Includes active markers, routing linestrings, and measurement points.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 text-xs text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-80 select-all leading-relaxed">
                {geoJsonString}
              </pre>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 border-2 border-dashed border-neutral-700 rounded-xl text-center bg-neutral-950/40">
                <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                <p className="text-xs font-medium text-neutral-200">
                  Select a .geojson or .json file to load onto OpenStreetMap
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Point features will be automatically converted to interactive markers.
                </p>
                <label className="mt-3 inline-block px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg cursor-pointer transition-colors">
                  Choose File
                  <input
                    type="file"
                    accept=".geojson,.json,application/json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Or paste raw GeoJSON text directly:
                </label>
                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`{\n  "type": "FeatureCollection",\n  "features": [...]\n}`}
                  className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              {importStatus && (
                <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-xl text-xs text-sky-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => processImport(importText)}
                disabled={!importText.trim()}
                className="w-full py-2 text-xs font-semibold text-neutral-950 bg-white hover:bg-neutral-200 disabled:opacity-40 rounded-lg transition-colors"
              >
                Parse & Add to Map
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
