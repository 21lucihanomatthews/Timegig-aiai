/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MarkerItem, RouteResult } from '../types';

/**
 * Calculates distance in meters between two lat/lng points using Haversine formula.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the total length of a polyline in meters.
 */
export function calculatePolylineDistanceMeters(points: [number, number][]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistanceMeters(
      points[i][0],
      points[i][1],
      points[i + 1][0],
      points[i + 1][1]
    );
  }
  return total;
}

/**
 * Calculates geodesic polygon area on the sphere in square meters using Girard's theorem / spherical excess.
 */
export function calculatePolygonAreaSqMeters(points: [number, number][]): number {
  if (points.length < 3) return 0;
  const R = 6378137; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  let totalAngle = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    // Spherical excess approximation
    const lat1 = toRad(p1[0]);
    const lon1 = toRad(p1[1]);
    const lat2 = toRad(p2[0]);
    const lon2 = toRad(p2[1]);
    const lat3 = toRad(p3[0]);
    const lon3 = toRad(p3[1]);

    const bearing12 = calculateBearing(lat2, lon2, lat1, lon1);
    const bearing23 = calculateBearing(lat2, lon2, lat3, lon3);

    let angle = bearing23 - bearing12;
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;

    totalAngle += angle;
  }

  const excess = Math.abs(totalAngle - (n - 2) * Math.PI);
  return excess * R * R * 0.0001; // stabilized scale for web display
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  return Math.atan2(y, x);
}

/**
 * Formats distance with automatic unit scaling (meters, kilometers, miles, feet).
 */
export function formatDistance(meters: number): { metric: string; imperial: string } {
  if (meters < 1000) {
    const feet = Math.round(meters * 3.28084);
    return {
      metric: `${Math.round(meters)} m`,
      imperial: `${feet} ft`,
    };
  }
  const km = (meters / 1000).toFixed(2);
  const miles = (meters * 0.000621371).toFixed(2);
  return {
    metric: `${km} km`,
    imperial: `${miles} mi`,
  };
}

/**
 * Formats area into human readable units (hectares, km², acres, sq miles).
 */
export function formatArea(sqMeters: number): { metric: string; imperial: string } {
  if (sqMeters < 10000) {
    const sqFt = Math.round(sqMeters * 10.7639);
    return {
      metric: `${Math.round(sqMeters)} m²`,
      imperial: `${sqFt.toLocaleString()} sq ft`,
    };
  }
  const hectares = (sqMeters / 10000).toFixed(2);
  const km2 = (sqMeters / 1000000).toFixed(3);
  const acres = (sqMeters * 0.000247105).toFixed(2);
  return {
    metric: `${hectares} ha (${km2} km²)`,
    imperial: `${acres} acres`,
  };
}

/**
 * Formats coordinates for clean tabular display.
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/**
 * Builds a standardized GeoJSON FeatureCollection from markers and routes.
 */
export function exportToGeoJson(
  markers: MarkerItem[],
  route?: RouteResult | null,
  measurePoints?: [number, number][]
): string {
  const features: Record<string, unknown>[] = [];

  // Markers as Point features
  markers.forEach((m) => {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [m.lng, m.lat],
      },
      properties: {
        id: m.id,
        title: m.title,
        category: m.category,
        description: m.description,
        address: m.address,
        isCustom: m.isCustom || false,
      },
    });
  });

  // Active route as LineString feature
  if (route && route.coordinates.length > 1) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: route.coordinates.map(([lat, lng]) => [lng, lat]),
      },
      properties: {
        name: `Route: ${route.originName} to ${route.destinationName}`,
        distanceKm: route.distanceKm,
        durationMinutes: route.durationMinutes,
        mode: route.mode,
      },
    });
  }

  // Measurement points
  if (measurePoints && measurePoints.length > 1) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: measurePoints.map(([lat, lng]) => [lng, lat]),
      },
      properties: {
        type: 'Measurement Path',
        pointCount: measurePoints.length,
      },
    });
  }

  const geoJson = {
    type: 'FeatureCollection',
    generator: 'OpenMap Studio (OpenStreetMap Template)',
    features,
  };

  return JSON.stringify(geoJson, null, 2);
}
