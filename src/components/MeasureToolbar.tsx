/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Ruler, Pentagon, RotateCcw, Trash2, Info } from 'lucide-react';
import { ActiveTool, MeasurementState } from '../types';
import { formatDistance, formatArea } from '../utils/geoUtils';

interface MeasureToolbarProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  measurement: MeasurementState;
  onClearMeasurement: () => void;
  onUndoLastPoint: () => void;
}

export const MeasureToolbar: React.FC<MeasureToolbarProps> = ({
  activeTool,
  setActiveTool,
  measurement,
  onClearMeasurement,
  onUndoLastPoint,
}) => {
  const isDistance = activeTool === 'measure-distance';
  const isArea = activeTool === 'measure-area';

  const distFormatted = formatDistance(measurement.totalDistanceMeters);
  const areaFormatted = formatArea(measurement.enclosedAreaSqMeters);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Geospatial Measurement</h3>
        <p className="text-xs text-neutral-400 mt-0.5">
          Click points directly on the map to calculate real-world distances or areas.
        </p>
      </div>

      {/* Measurement Mode Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTool('measure-distance')}
          className={`py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            isDistance
              ? 'bg-neutral-800 text-sky-400 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Distance (Path)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool('measure-area')}
          className={`py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            isArea
              ? 'bg-neutral-800 text-sky-400 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Pentagon className="w-3.5 h-3.5" />
          <span>Area (Polygon)</span>
        </button>
      </div>

      {/* Metric Display Card */}
      <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>Active Measurements</span>
          <span className="font-mono tabular-nums">{measurement.points.length} points placed</span>
        </div>

        {/* Primary Metric */}
        {isDistance ? (
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 text-center">
            <div className="text-[11px] text-neutral-400 font-medium">Total Path Distance</div>
            <div className="text-xl font-bold text-sky-400 font-mono tabular-nums mt-0.5">
              {distFormatted.metric}
            </div>
            <div className="text-[11px] text-neutral-400 font-mono tabular-nums mt-0.5">
              {distFormatted.imperial}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800/80 text-center">
            <div className="text-[11px] text-neutral-400 font-medium">Enclosed Polygon Area</div>
            <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
              {areaFormatted.metric}
            </div>
            <div className="text-[11px] text-neutral-400 font-mono tabular-nums mt-0.5">
              {areaFormatted.imperial}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onUndoLastPoint}
            disabled={measurement.points.length === 0}
            className="flex-1 py-1.5 px-3 text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo Point</span>
          </button>

          <button
            type="button"
            onClick={onClearMeasurement}
            disabled={measurement.points.length === 0}
            className="flex-1 py-1.5 px-3 text-xs text-rose-300 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/40 disabled:opacity-40 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Guide Note */}
      <div className="p-3 bg-neutral-900/40 border border-neutral-800/60 rounded-xl text-[11px] text-neutral-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <p>
          Click anywhere on the map to drop measurement vertices. Distances are computed using great-circle Haversine geodetics on the WGS84 ellipsoid.
        </p>
      </div>
    </div>
  );
};
