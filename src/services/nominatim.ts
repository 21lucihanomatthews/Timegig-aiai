/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NominatimResult } from '../types';

// Simple in-memory cache to respect Nominatim policy and speed up queries
const searchCache = new Map<string, NominatimResult[]>();
const reverseCache = new Map<string, { displayName: string; address?: Record<string, string> }>();

/**
 * Search places and addresses using OpenStreetMap's free Nominatim geocoding service.
 * No API key required.
 */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<NominatimResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const cacheKey = trimmed.toLowerCase();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    trimmed
  )}&limit=6&addressdetails=1`;

  try {
    const response = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data: NominatimResult[] = await response.json();
    searchCache.set(cacheKey, data);
    return data;
  } catch (err: unknown) {
    if (signal?.aborted) return [];
    console.warn('Geocoding search failed:', err);
    return [];
  }
}

/**
 * Reverse geocode latitude and longitude to a human-readable address.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<{ displayName: string; address?: Record<string, string> } | null> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (reverseCache.has(cacheKey)) {
    return reverseCache.get(cacheKey)!;
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;

  try {
    const response = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding error: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.display_name) return null;

    const result = {
      displayName: data.display_name,
      address: data.address,
    };
    reverseCache.set(cacheKey, result);
    return result;
  } catch (err: unknown) {
    if (signal?.aborted) return null;
    console.warn('Reverse geocode failed:', err);
    return null;
  }
}
