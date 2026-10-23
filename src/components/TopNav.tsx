/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, MapPin, Navigation, Ruler, Code2, Download, Compass } from 'lucide-react';
import { ActiveTool } from '../types';

interface TopNavProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  activeSidebarTab: 'markers' | 'layers' | 'route' | 'measure';
  setActiveSidebarTab: (tab: 'markers' | 'layers' | 'route' | 'measure') => void;
  onOpenCodeModal: () => void;
  onOpenGeoJsonModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTool,
  setActiveTool,
  isSidebarOpen,
  setIsSidebarOpen,
  activeSidebarTab,
  setActiveSidebarTab,
  onOpenCodeModal,
  onOpenGeoJsonModal,
}) => {
  const handleTabClick = (tab: 'markers' | 'layers' | 'route' | 'measure') => {
    if (isSidebarOpen && activeSidebarTab === tab) {
      setIsSidebarOpen(false);
    } else {
      setActiveSidebarTab(tab);
      setIsSidebarOpen(true);
    }
  };

  return (
    <header className="h-14 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-8 z-30 shrink-0">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <Compass className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            OpenMap Studio
          </span>
          <span className="text-xs text-neutral-400 hidden sm:inline whitespace-nowrap">
            OpenStreetMap Engine
          </span>
        </div>
      </div>

      {/* Zone 2: 4-5 Concise Single-Line Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 sm:gap-2 text-xs font-medium text-neutral-400">
        <button
          type="button"
          onClick={() => handleTabClick('layers')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            isSidebarOpen && activeSidebarTab === 'layers'
              ? 'bg-neutral-800 text-white'
              : 'hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
          <span>Tile Layers</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('markers')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            isSidebarOpen && activeSidebarTab === 'markers'
              ? 'bg-neutral-800 text-white'
              : 'hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-neutral-400" />
          <span>Places & Markers</span>
        </button>

        <button
          type="button"
          onClick={() => {
            handleTabClick('route');
            setActiveTool('route');
          }}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            isSidebarOpen && activeSidebarTab === 'route'
              ? 'bg-neutral-800 text-white'
              : 'hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Navigation className="w-3.5 h-3.5 text-neutral-400" />
          <span>Route Planner</span>
        </button>

        <button
          type="button"
          onClick={() => {
            handleTabClick('measure');
            if (activeTool !== 'measure-distance' && activeTool !== 'measure-area') {
              setActiveTool('measure-distance');
            }
          }}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            isSidebarOpen && activeSidebarTab === 'measure'
              ? 'bg-neutral-800 text-white'
              : 'hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Ruler className="w-3.5 h-3.5 text-neutral-400" />
          <span>Measure</span>
        </button>

        <button
          type="button"
          onClick={onOpenCodeModal}
          className="px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-sky-300 hover:bg-sky-950/30 text-sky-400"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Code Template</span>
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenGeoJsonModal}
          className="px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-neutral-100 hover:bg-white rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>GeoJSON Data</span>
        </button>
      </div>
    </header>
  );
};
