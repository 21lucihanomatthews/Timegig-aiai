/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RouteMode, RouteResult, RouteStep } from '../types';

/**
 * Calculates a route between two points using the free, open-source OSRM API (based on OSM data).
 * Fallback to direct geodesic line if network is unavailable.
 */
export async function calculateRoute(
  origin: { lat: number; lng: number; name?: string },
  destination: { lat: number; lng: number; name?: string },
  mode: RouteMode = 'driving'
): Promise<RouteResult> {
  const profileMap: Record<RouteMode, string> = {
    driving: 'driving',
    cycling: 'bike',
    walking: 'foot',
  };
  const profile = profileMap[mode] || 'driving';

  const url = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OSRM responded with status ${res.status}`);
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      // Coordinates in GeoJSON are [lng, lat], Leaflet expects [lat, lng]
      const rawCoords: [number, number][] = primaryRoute.geometry.coordinates;
      const leafCoords: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);

      const steps: RouteStep[] = [];
      if (primaryRoute.legs && primaryRoute.legs[0]?.steps) {
        for (const step of primaryRoute.legs[0].steps) {
          const maneuverType = step.maneuver?.type || 'turn';
          const modifier = step.maneuver?.modifier ? ` ${step.maneuver.modifier}` : '';
          const name = step.name ? ` onto ${step.name}` : '';
          const text = step.maneuver?.instruction || `${maneuverType}${modifier}${name}`;

          steps.push({
            instruction: text.charAt(0).toUpperCase() + text.slice(1),
            distance: step.distance,
            duration: step.duration,
          });
        }
      }

      return {
        coordinates: leafCoords,
        distanceKm: Number((primaryRoute.distance / 1000).toFixed(2)),
        durationMinutes: Math.round(primaryRoute.duration / 60),
        mode,
        steps: steps.length > 0 ? steps : [
          { instruction: 'Follow planned route to destination', distance: primaryRoute.distance, duration: primaryRoute.duration }
        ],
        originName: origin.name || `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`,
        destinationName: destination.name || `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`,
      };
    }
  } catch (err) {
    console.warn('OSRM routing request failed, falling back to direct geodesic path:', err);
  }

  // Graceful fallback: interpolate 20 intermediate points on geodesic arc
  const coords = generateInterpolatedPath(
    [origin.lat, origin.lng],
    [destination.lat, destination.lng],
    16
  );
  const distanceKm = haversineDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const speedKmh = mode === 'driving' ? 65 : mode === 'cycling' ? 18 : 4.5;
  const durationMinutes = Math.round((distanceKm / speedKmh) * 60);

  return {
    coordinates: coords,
    distanceKm: Number(distanceKm.toFixed(2)),
    durationMinutes,
    mode,
    steps: [
      { instruction: `Depart from ${origin.name || 'Origin'}`, distance: 0, duration: 0 },
      { instruction: `Proceed directly along route (${distanceKm.toFixed(1)} km)`, distance: distanceKm * 1000, duration: durationMinutes * 60 },
      { instruction: `Arrive at ${destination.name || 'Destination'}`, distance: 0, duration: 0 },
    ],
    originName: origin.name || `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`,
    destinationName: destination.name || `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`,
  };
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function generateInterpolatedPath(
  p1: [number, number],
  p2: [number, number],
  steps: number
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = p1[0] + (p2[0] - p1[0]) * t;
    const lng = p1[1] + (p2[1] - p1[1]) * t;
    points.push([lat, lng]);
  }
  return points;
}
