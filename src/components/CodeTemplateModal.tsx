/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, Code, FileText, Layers, ShieldCheck } from 'lucide-react';
import { TILE_PROVIDERS } from '../data/tileProviders';

interface CodeTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeTemplateModal: React.FC<CodeTemplateModalProps> = ({ isOpen, onClose }) => {
  const [activeSnippetTab, setActiveSnippetTab] = useState<'html' | 'react' | 'tiles' | 'nominatim'>('react');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const reactSnippet = `import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function OpenStreetMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // 1. Initialize Leaflet Map centered on London
    const map = L.map(mapContainerRef.current).setView([51.505, -0.09], 13);
    mapInstanceRef.current = map;

    // 2. Add Free OpenStreetMap Tile Layer (Zero API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // 3. Add Sample Marker with Popup
    const marker = L.marker([51.505, -0.09]).addTo(map);
    marker.bindPopup('<b>Hello World!</b><br>OpenStreetMap is 100% free with no API cost.').openPopup();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />;
}`;

  const htmlSnippet = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Free OpenStreetMap Template</title>
  <!-- 1. Leaflet CSS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    body { margin: 0; padding: 0; font-family: sans-serif; }
    #map { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>

  <!-- 2. Leaflet JS -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // Initialize map
    const map = L.map('map').setView([48.8566, 2.3522], 13);

    // Free OpenStreetMap Standard Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Marker
    L.marker([48.8566, 2.3522])
      .addTo(map)
      .bindPopup('<b>Paris, France</b><br>Zero API Costs!')
      .openPopup();
  </script>
</body>
</html>`;

  const tilesSnippet = TILE_PROVIDERS.map((p) => {
    return `// ${p.name} (${p.category})
// No API Key Required
L.tileLayer('${p.url}', {
  maxZoom: ${p.maxZoom},
  attribution: '${p.attribution.replace(/'/g, "\\'")}',
  ${p.subdomains ? `subdomains: ${JSON.stringify(p.subdomains)},` : ''}
}).addTo(map);\n`;
  }).join('\n');

  const nominatimSnippet = `// Free Geocoding with OpenStreetMap Nominatim (No API Key)
async function searchOSM(query) {
  const url = \`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(query)}&limit=5\`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  const data = await response.json();
  // Returns [{ lat: "48.8566", lon: "2.3522", display_name: "Paris, France", ... }]
  return data;
}

// Free Routing with Open Source Routing Machine (OSRM)
async function getRoute(startLng, startLat, endLng, endLat) {
  const url = \`https://router.project-osrm.org/route/v1/driving/\${startLng},\${startLat};\${endLng},\${endLat}?overview=full&geometries=geojson\`;
  const res = await fetch(url);
  const data = await res.json();
  // data.routes[0].geometry.coordinates contains [[lng, lat], ...]
  return data.routes[0];
}`;

  let currentSnippet = reactSnippet;
  if (activeSnippetTab === 'html') currentSnippet = htmlSnippet;
  if (activeSnippetTab === 'tiles') currentSnippet = tilesSnippet;
  if (activeSnippetTab === 'nominatim') currentSnippet = nominatimSnippet;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/20 backdrop-blur-3xl">
      <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Developer Template Snippets</h3>
              <p className="text-[11px] text-neutral-400">
                Plug-and-play OpenStreetMap code with zero subscription fees, tokens, or API billing.
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

        {/* Tab Switcher */}
        <div className="flex items-center px-6 pt-3 gap-2 border-b border-neutral-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSnippetTab('react')}
            className={`pb-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSnippetTab === 'react'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>React + TypeScript</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSnippetTab('html')}
            className={`pb-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSnippetTab === 'html'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>HTML & CDN Script</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSnippetTab('tiles')}
            className={`pb-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSnippetTab === 'tiles'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Free Tile URLs List</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSnippetTab('nominatim')}
            className={`pb-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeSnippetTab === 'nominatim'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Search & Routing APIs</span>
          </button>
        </div>

        {/* Snippet Display */}
        <div className="p-6 flex-1 min-h-0 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              Ready to copy and paste directly into your project:
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-[11px] text-sky-200 overflow-x-auto max-h-[50vh] leading-relaxed selection:bg-sky-500/30">
            {currentSnippet}
          </pre>

          <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl text-xs text-neutral-400">
            <strong className="text-neutral-300">OpenStreetMap License Notice:</strong> Always include the attribution string in your footer or corner. Leaflet automatically injects attribution into the bottom-right corner when provided in the tileLayer options.
          </div>
        </div>
      </div>
    </div>
  );
};
