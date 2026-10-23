/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Minus,
  Locate,
  Satellite,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  X,
  MapPin,
  Loader2,
} from 'lucide-react';
import { TimeGigMap } from './components/TimeGigMap';
import { SearchPanel } from './components/SearchPanel';
import { BottomMenuBar } from './components/BottomMenuBar';
import { ActivationModal } from './components/ActivationModal';
import { ProfileModal } from './components/ProfileModal';
import { AuthScreen } from './components/AuthScreen';
import { auth } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from './types';
import { GigItem, TIMEGIG_SOUTH_AFRICA_GIGS } from './data/timegigData';

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export default function App() {
  const [gigs] = useState<GigItem[]>(TIMEGIG_SOUTH_AFRICA_GIGS);
  const [isSatellite, setIsSatellite] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Map camera target (for smooth flyTo upon GPS lock or search)
  const [targetLocation, setTargetLocation] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);

  // Active search result marker
  const [searchMarker, setSearchMarker] = useState<{
    lat: number;
    lng: number;
    title: string;
    subtitle: string;
  } | null>(null);

  // Selected gig for detail / application modal
  const [selectedGig, setSelectedGig] = useState<GigItem | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [applySubmitted, setApplySubmitted] = useState<boolean>(false);

  // Authentication state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Bottom menu bar state: 'activation' | 'profile' | null
  const [activeBottomTab, setActiveBottomTab] = useState<'activation' | 'profile' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Try to load profile from Firestore
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            // Check local storage for offline fallback
            const cached = localStorage.getItem(`user_profile_${currentUser.uid}`);
            if (cached) {
              setUserProfile(JSON.parse(cached));
            }
          }
        } catch (err) {
          console.warn('Profile fetch error:', err);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthenticated = (firebaseUser: FirebaseUser, profile: UserProfile) => {
    setUser(firebaseUser);
    setUserProfile(profile);
  };

  const handleSelectBottomTab = (tab: 'activation' | 'profile') => {
    setActiveBottomTab((prev) => (prev === tab ? null : tab));
  };

  // Request actual user GPS location in South Africa
  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const loc: UserLocation = {
          lat: latitude,
          lng: longitude,
          accuracy,
          timestamp: pos.timestamp,
        };

        setUserLocation(loc);
        setIsLocating(false);
        setLocationError(null);

        // Center map on user's actual GPS location
        setTargetLocation({
          lat: latitude,
          lng: longitude,
          zoom: 14,
        });
      },
      (err) => {
        setIsLocating(false);
        // Important: Never silently replace with Johannesburg or another incorrect location
        setUserLocation(null);

        let msg = 'GPS access unavailable. Please enable browser location permissions to find gigs near you.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser or search your suburb.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'GPS location request timed out. Please click retry.';
        }
        setLocationError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Handle location search selection (any street, suburb, city, or province in South Africa)
  const handleSelectLocation = (
    lat: number,
    lng: number,
    displayName: string,
    bbox?: [string, string, string, string],
    details?: { title: string; subtitle: string; province?: string; country?: string }
  ) => {
    const title = details?.title || displayName.split(',')[0];
    const subtitle = details?.subtitle || displayName;

    setSearchMarker({
      lat,
      lng,
      title,
      subtitle,
    });

    let zoomLevel = 15;
    if (bbox) {
      const latDiff = Math.abs(parseFloat(bbox[1]) - parseFloat(bbox[0]));
      if (latDiff > 4) zoomLevel = 6;
      else if (latDiff > 1) zoomLevel = 9;
      else if (latDiff > 0.1) zoomLevel = 12;
      else zoomLevel = 15;
    }

    setTargetLocation({
      lat,
      lng,
      zoom: zoomLevel,
    });
  };

  // Apply for gig handler
  const handleApplyGig = (gig: GigItem) => {
    setSelectedGig(gig);
    setIsApplyModalOpen(true);
    setApplySubmitted(false);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    if (targetLocation) {
      setTargetLocation((prev) => (prev ? { ...prev, zoom: (prev.zoom || 14) + 1 } : null));
    }
  };

  const handleZoomOut = () => {
    if (targetLocation) {
      setTargetLocation((prev) => (prev ? { ...prev, zoom: (prev.zoom || 14) - 1 } : null));
    }
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-sky-600 animate-spin" />
        <p className="text-neutral-400 mt-4 text-xs font-bold tracking-widest uppercase">Initializing Map...</p>
      </div>
    );
  }

      {/* 0. Authentication Overlay (if not logged in) */}
      {!user && (
        <AuthScreen onAuthenticated={handleAuthenticated} />
      )}

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans select-none">
      {/* 1. Full-Screen Edge-to-Edge OpenStreetMap Map using React-Leaflet */}
      <div className="w-full h-full z-0">
        <TimeGigMap
          gigs={gigs}
          userLocation={userLocation}
          targetLocation={targetLocation}
          selectedGig={selectedGig}
          onSelectGig={(gig) => setSelectedGig(gig)}
          onApplyGig={handleApplyGig}
          searchMarker={searchMarker}
          isSatellite={isSatellite}
        />
      </div>

      {/* 2. Permanently Visible Crisp White Floating Search Bar */}
      <div
        className="search-floating-container absolute top-10 sm:top-12 left-1/2 -translate-x-1/2 w-full max-w-md sm:max-w-lg lg:max-w-xl px-4 pointer-events-auto"
        style={{ zIndex: 9999 }}
      >
        <SearchPanel onSelectLocation={handleSelectLocation} />
      </div>

      {/* 3. Permanently Visible Crisp White Zoom & Location Controls on Right */}
      <div
        className="zoom-floating-container absolute top-28 sm:top-32 right-4 sm:right-6 flex flex-col gap-2.5 pointer-events-auto"
        style={{ zIndex: 9999 }}
      >
        {/* Zoom Controls */}
        <div className="bg-white border-2 border-neutral-300 rounded-2xl overflow-hidden flex flex-col divide-y-2 divide-neutral-200 shadow-2xl">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-12 h-12 flex items-center justify-center text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={handleZoomOut}
            className="w-12 h-12 flex items-center justify-center text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Re-center on User GPS Location */}
        <button
          type="button"
          onClick={requestLocation}
          className="w-12 h-12 rounded-2xl border-2 bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-300 shadow-2xl flex items-center justify-center transition-colors"
          title="Center on My GPS Location"
          aria-label="Center on My GPS Location"
        >
          <Locate className={`w-6 h-6 ${isLocating ? 'animate-spin text-sky-600' : ''}`} />
        </button>

        {/* Small Icon to Change Map to Satellite View (Placed directly under the last icon) */}
        <button
          type="button"
          onClick={() => setIsSatellite((prev) => !prev)}
          className={`w-12 h-12 rounded-2xl border-2 shadow-2xl flex items-center justify-center transition-all ${
            isSatellite
              ? 'bg-neutral-900 text-sky-400 border-neutral-800 ring-2 ring-sky-500/50'
              : 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-300'
          }`}
          title={isSatellite ? 'Switch to Standard Map View' : 'Switch to Satellite View'}
          aria-label={isSatellite ? 'Switch to Standard Map View' : 'Switch to Satellite View'}
        >
          <Satellite className={`w-5 h-5 ${isSatellite ? 'text-sky-400' : 'text-neutral-700'}`} />
        </button>
      </div>

      {/* 5. Clear GPS Retry & Permission Card (Positioned above bottom menu bar) */}
      {locationError && (
        <div
          className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 max-w-sm sm:max-w-md w-[calc(100%-2rem)] bg-white/80 backdrop-blur-lg border-2 border-amber-300/50 rounded-2xl p-4 shadow-2xl flex items-start gap-3 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200"
          style={{ zIndex: 9999 }}
        >
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-neutral-900">Location Access</div>
            <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
              {locationError}
            </p>
          </div>
          <button
            type="button"
            onClick={requestLocation}
            className="px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors shrink-0 flex items-center gap-1 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry GPS</span>
          </button>
        </div>
      )}

      {/* 6. Bottom Menu Bar with Activation and Profile Features */}
      <BottomMenuBar
        activeTab={activeBottomTab}
        onSelectTab={handleSelectBottomTab}
      />

      {/* 7. Activation Feature Modal */}
      <ActivationModal
        isOpen={activeBottomTab === 'activation'}
        onClose={() => setActiveBottomTab(null)}
        onActivationComplete={() => setActiveBottomTab('profile')}
        currentUser={user}
        userProfile={userProfile}
        onProfileUpdated={(updated) => setUserProfile(updated)}
      />

      {/* 8. Profile Feature Modal */}
      <ProfileModal
        isOpen={activeBottomTab === 'profile'}
        onClose={() => setActiveBottomTab(null)}
        currentUser={user}
        userProfile={userProfile}
        onProfileUpdated={(updated) => setUserProfile(updated)}
        onLogout={() => {
          setUser(null);
          setUserProfile(null);
        }}
      />

      {/* 9. Gig Application / Details Modal */}
      {isApplyModalOpen && selectedGig && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          style={{ zIndex: 10000 }}
        >
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-neutral-200/50 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-neutral-100/50 flex items-start justify-between bg-white/30 backdrop-blur-md">
              <div>
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                  {selectedGig.category}
                </span>
                <h3 className="text-base font-bold text-neutral-900 mt-0.5">
                  {selectedGig.title}
                </h3>
                <div className="text-lg font-extrabold text-emerald-600 font-mono mt-1">
                  R {selectedGig.payZar.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-neutral-500 font-sans">
                    /{selectedGig.rateType}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-neutral-700">
              <div>
                <span className="font-semibold text-neutral-900 block mb-1">
                  Location & Area
                </span>
                <div className="flex items-center gap-1 text-neutral-600">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span>
                    {selectedGig.area}, {selectedGig.city}, {selectedGig.province}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-neutral-900 block mb-1">
                  Gig Description
                </span>
                <p className="text-neutral-600 leading-relaxed">
                  {selectedGig.description}
                </p>
              </div>

              <div>
                <span className="font-semibold text-neutral-900 block mb-1">
                  Required Skills
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedGig.skillsRequired.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium text-[11px]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {applySubmitted ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">
                    Application sent to {selectedGig.clientName}! You will be contacted shortly.
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setApplySubmitted(true)}
                  className="w-full py-2.5 text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors shadow-md"
                >
                  Send Application
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
