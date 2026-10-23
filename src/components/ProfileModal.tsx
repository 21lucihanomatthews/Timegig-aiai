/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Edit3,
  Check,
  ArrowLeft,
  LogOut,
  Mail,
  Shield,
  Loader2,
  Camera,
  Upload,
  Calendar,
  Phone,
  MapPin,
  Globe,
  Plus,
  Trash2,
  FileText,
  Navigation,
  Briefcase,
  Star,
  Users,
  Award,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { User as FirebaseUser, signOut, updateProfile } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, CASUAL_TRADES, WorkExperience, WorkReference } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  onProfileUpdated?: (updated: UserProfile) => void;
  onLogout?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onProfileUpdated,
  onLogout,
}) => {
  // --- Form State ---
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [location, setLocation] = useState({ address: '', lat: 0, lng: 0 });
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([]);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null);
  
  // New Fields
  const [trades, setTrades] = useState<string[]>([]);
  const [experience, setExperience] = useState<WorkExperience[]>([]);
  const [references, setReferences] = useState<WorkReference[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // --- Camera State ---
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Cleanup camera on unmount or close
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      }
    };
  }, []);


  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser?.uid) return;
      
      setIsLoadingProfile(true);
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setFirstName(data.firstName || '');
          setSurname(data.surname || '');
          setDateOfBirth(data.dateOfBirth || '');
          setContactNumber(data.contactNumber || '');
          setLocation(data.location || { address: '', lat: 0, lng: 0 });
          setSocialLinks(data.socialLinks || []);
          setProfilePictureUrl(data.profilePictureUrl || null);
          setIdDocumentUrl(data.idDocumentUrl || null);
          setTrades(data.trades || []);
          setExperience(data.experience || []);
          setReferences(data.references || []);
          
          // Auto-enable edit mode if mandatory fields are missing
          const isIncomplete = !data.profilePictureUrl || 
                               !data.firstName || 
                               !data.surname || 
                               !data.trades?.length || 
                               !data.experience?.length || 
                               !data.references?.length;
          if (isIncomplete) {
            setIsEditing(true);
          }
        } else {
          setIsEditing(true); // New user starts in edit mode
          if (currentUser.displayName) {
            const parts = currentUser.displayName.split(' ');
            setFirstName(parts[0] || '');
            setSurname(parts.slice(1).join(' ') || '');
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (isOpen) {
      loadProfile();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // --- Camera Logic ---
  const startCamera = async () => {
    setCameraError(null);
    
    // 1. Check for secure context
    if (!window.isSecureContext) {
      setCameraError('Camera access requires a secure (HTTPS) connection. Please open the app via the production URL.');
      return;
    }

    // 2. Check for basic API support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Your browser or environment does not support camera access. This may be due to security restrictions or an outdated browser.');
      return;
    }

    // 3. Check for Iframe/Feature Policy restrictions (if available)
    try {
      const permissionsPolicy = (document as any).permissionsPolicy;
      if (permissionsPolicy && !permissionsPolicy.allowsFeature('camera')) {
        setCameraError('Camera access is blocked by the preview environment (iframe). Please use "Upload Face Picture" or open the app directly in your browser.');
        return;
      }
    } catch (e) {
      console.warn('Feature policy check failed:', e);
    }

    setIsCameraOpen(true);

    // 4. Try requesting camera with standard constraints
    try {
      const constraints = { 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      };
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('First camera attempt failed, trying simpler constraints:', firstErr);
        // Fallback to minimal constraints for better mobile compatibility
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: false 
        });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => {
            console.error('Video play failed:', e);
            setCameraError('Failed to start video preview. Please try the upload option.');
          });
        };
      }
    } catch (err: any) {
      console.error('Final camera access error:', err);
      setIsCameraOpen(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        // If we are in an iframe, this is very likely the cause
        if (window.self !== window.top) {
          setCameraError('Camera access was denied. The preview environment (iframe) often blocks camera permissions. Please use "Upload Face Picture" or open the production link directly.');
        } else {
          setCameraError('Camera access was denied. Please ensure you have granted camera permissions in your browser settings.');
        }
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device detected on this device. Please use the upload option instead.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('The camera is already in use by another application or blocked by system settings.');
      } else if (err.name === 'SecurityError') {
        setCameraError('Camera access is blocked by browser security policy or environment restrictions.');
      } else {
        setCameraError(`Unable to access camera: ${err.message || 'Unknown error'}. Please use the upload option.`);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setProfilePictureUrl(dataUrl);
        stopCamera();
      }
    }
  };

  // --- File Upload Logic ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'id') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === 'profile') setProfilePictureUrl(base64String);
      else setIdDocumentUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  // --- Geolocation Logic ---
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          setLocation({
            address: data.display_name || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
            lat: latitude,
            lng: longitude
          });
        } catch (err) {
          setLocation({
            address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
            lat: latitude,
            lng: longitude
          });
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        alert('Could not get your location. Please ensure location services are enabled.');
      }
    );
  };

  // --- Experience Logic ---
  const addExperience = () => {
    setExperience([...experience, { company: '', role: '', period: '', description: '' }]);
  };

  const updateExperience = (index: number, field: keyof WorkExperience, value: string) => {
    const updated = [...experience];
    updated[index][field] = value;
    setExperience(updated);
  };

  const removeExperience = (index: number) => {
    setExperience(experience.filter((_, i) => i !== index));
  };

  // --- Reference Logic ---
  const addReference = () => {
    setReferences([...references, { name: '', contact: '', relation: '' }]);
  };

  const updateReference = (index: number, field: keyof WorkReference, value: string) => {
    const updated = [...references];
    updated[index][field] = value;
    setReferences(updated);
  };

  const removeReference = (index: number) => {
    setReferences(references.filter((_, i) => i !== index));
  };

  // --- Trade Selection Logic ---
  const toggleTrade = (trade: string) => {
    if (trades.includes(trade)) {
      setTrades(trades.filter(t => t !== trade));
    } else {
      setTrades([...trades, trade]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!profilePictureUrl) {
      alert('Profile picture (Selfie or Upload) is required.');
      return;
    }
    if (!firstName || !surname || !dateOfBirth || !contactNumber || !location.address) {
      alert('Please fill in all required personal information marked with *');
      return;
    }
    if (trades.length === 0) {
      alert('Please select at least one work trade.');
      return;
    }
    if (experience.length === 0 || !experience[0].company || !experience[0].role) {
      alert('Please add at least one work experience detail.');
      return;
    }
    if (references.length === 0 || !references[0].name || !references[0].contact) {
      alert('Please add at least one work reference detail.');
      return;
    }

    setIsSaving(true);
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: `${firstName} ${surname}`,
        });
      }

      const uid = currentUser?.uid;
      if (uid) {
        const updatedData: Partial<UserProfile> = {
          firstName,
          surname,
          dateOfBirth,
          contactNumber,
          location,
          socialLinks,
          profilePictureUrl,
          idDocumentUrl: idDocumentUrl || undefined,
          trades,
          experience,
          references,
          updatedAt: new Date().toISOString(),
          updatedAtServer: serverTimestamp(),
        };

        await updateDoc(doc(db, 'users', uid), updatedData);
        
        onProfileUpdated?.({
          ...(userProfile || { uid, email: currentUser?.email || '', termsAccepted: true }),
          ...updatedData
        } as UserProfile);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsEditing(false); // Locks profile into read-only view
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Error saving profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      setIsLoggingOut(false);
      onLogout?.();
      onClose();
    }
  };

  const userEmail = currentUser?.email || userProfile?.email || 'user@example.com';

  return (
    <div className="fixed inset-0 w-full h-full bg-white/20 backdrop-blur-3xl z-[10000] flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Header */}
      <header className="px-5 py-4 border-b border-neutral-200/50 flex items-center justify-between bg-white/40 backdrop-blur-md shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-neutral-900 leading-tight">My Profile</h2>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Work & Identity Passport</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-neutral-50/20">
        <div className="max-w-2xl mx-auto p-6">
          {isLoadingProfile ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-sky-600 animate-spin" />
              <p className="text-sm font-medium text-neutral-500">Loading your profile details...</p>
            </div>
          ) : !isEditing ? (
            /* --- READ ONLY VIEW (LOCKED PROFILE) --- */
            <div className="space-y-6">
              {/* --- PROFESSIONAL WORKER PASSPORT CARD --- */}
              <div className="relative overflow-hidden bg-white rounded-3xl border border-neutral-200 shadow-xl flex flex-col md:flex-row items-stretch">
                {/* ID Card Side Decoration */}
                <div className="hidden md:block w-3 bg-sky-600 h-full absolute left-0 top-0 bottom-0" />
                
                {/* ID Content */}
                <div className="flex-1 p-8 flex flex-col md:flex-row gap-8 relative z-10">
                  {/* Left: Photo & Badge */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="relative">
                      <div className="w-40 h-48 rounded-2xl overflow-hidden bg-sky-50 border-4 border-white shadow-lg ring-1 ring-neutral-200 flex items-center justify-center">
                        {profilePictureUrl ? (
                          <img src={profilePictureUrl} alt="Passport Photo" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-20 h-20 text-sky-200" />
                        )}
                      </div>
                      <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center shadow-lg">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="mt-6 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">Passport ID</span>
                      <span className="text-xs font-mono font-bold text-neutral-900">
                        WP-{(currentUser?.uid || '0000').substring(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Right: Identity Details */}
                  <div className="flex-1 space-y-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">Worker Identification</h3>
                        <h4 className="text-2xl font-black text-neutral-900 tracking-tight leading-none uppercase">
                          {surname || '---'}, {firstName || '---'}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-neutral-900 text-white rounded text-[8px] font-black uppercase tracking-widest">RSA</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 border-t border-neutral-100 pt-5">
                      <div>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Date of Birth</span>
                        <span className="text-xs font-black text-neutral-800">{dateOfBirth || 'Not Set'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Gender / Status</span>
                        <span className="text-xs font-black text-neutral-800">Verified Professional</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Contact Number</span>
                        <span className="text-xs font-black text-neutral-800">{contactNumber || 'Not Set'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">Valid Thru</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black uppercase tracking-wider ${
                            userProfile?.verificationStatus === 'approved' ? 'text-emerald-600' :
                            userProfile?.verificationStatus === 'pending' ? 'text-amber-500' :
                            userProfile?.verificationStatus === 'rejected' ? 'text-rose-600' :
                            'text-neutral-400'
                          }`}>
                            {userProfile?.verificationStatus === 'approved' ? 'Active' :
                             userProfile?.verificationStatus === 'pending' ? 'Pending' :
                             userProfile?.verificationStatus === 'rejected' ? 'Rejected' :
                             'Inactive'}
                          </span>
                          {userProfile?.verificationStatus === 'approved' && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {userProfile?.verificationStatus === 'rejected' && userProfile.rejectionReason && (
                      <div className="mt-2 p-2 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 animate-in fade-in">
                        <AlertCircle className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-[9px] font-bold text-rose-700 leading-tight">
                          Rejection Reason: {userProfile.rejectionReason}
                        </p>
                      </div>
                    )}

                    <div className="pt-4 flex flex-wrap gap-1.5">
                      {trades.slice(0, 3).map((trade, i) => (
                        <span key={i} className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded text-[9px] font-bold uppercase border border-sky-100">
                          {trade}
                        </span>
                      ))}
                      {trades.length > 3 && (
                        <span className="px-2 py-0.5 bg-neutral-50 text-neutral-500 rounded text-[9px] font-bold uppercase">
                          +{trades.length - 3} More
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Background Pattern (Faded) */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none overflow-hidden flex items-center justify-center">
                   <div className="text-[12rem] font-black rotate-12 -translate-y-12">WP</div>
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 text-neutral-900">
                    <Mail className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">Registered Email</span>
                  </div>
                  <p className="text-xs font-bold text-neutral-700">{userEmail}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3 text-neutral-900">
                    <MapPin className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">Primary Location</span>
                  </div>
                  <p className="text-xs font-bold text-neutral-700 truncate" title={location.address}>
                    {location.address || 'Not set'}
                  </p>
                </div>
              </div>

              {/* Work Experience Read View */}
              <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6 text-neutral-900">
                  <Briefcase className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">Work Experience</span>
                </div>
                <div className="space-y-6">
                  {experience.length > 0 ? experience.map((exp, i) => (
                    <div key={i} className="relative pl-6 border-l-2 border-neutral-100 pb-2 last:pb-0">
                      <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-sky-100 border-2 border-white shadow-sm" />
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-black text-black">{exp.role}</h4>
                        <span className="text-[10px] font-bold text-black uppercase">{exp.period}</span>
                      </div>
                      <p className="text-xs font-bold text-black mb-2">{exp.company}</p>
                      <p className="text-xs text-black leading-relaxed">{exp.description}</p>
                    </div>
                  )) : (
                    <p className="text-xs text-neutral-400 italic text-center">No experience added yet.</p>
                  )}
                </div>
              </div>

              {/* References Read View */}
              <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6 text-neutral-900">
                  <Star className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">References</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {references.length > 0 ? references.map((ref, i) => (
                    <div key={i} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-white text-neutral-400 flex items-center justify-center border border-neutral-200">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-neutral-900">{ref.name}</p>
                          <p className="text-[10px] font-bold text-sky-600 uppercase tracking-tighter">{ref.relation}</p>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-neutral-500">{ref.contact}</p>
                    </div>
                  )) : (
                    <p className="text-xs text-neutral-400 italic col-span-2 text-center">No references provided.</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4 pb-10">
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full py-4 bg-white border-2 border-sky-600 text-sky-600 hover:bg-sky-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-5 h-5" />
                  Edit Profile Passport
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full py-4 border-2 border-rose-100 text-rose-600 hover:bg-rose-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                  Sign Out of Account
                </button>
              </div>
            </div>
          ) : (
            /* --- EDIT FORM (UPDATING PROFILE) --- */
            <form onSubmit={handleSave} className="space-y-10 pb-20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xl font-black text-neutral-900">Edit Your Profile</h3>
                  <p className="text-xs text-neutral-500 mt-1">Complete all required sections to verify your account.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-sm font-bold text-neutral-500 hover:text-neutral-700"
                >
                  Cancel
                </button>
              </div>

              {/* Profile Picture Section (REQUIRED) */}
              <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl border border-neutral-100 shadow-xs">
                <div className="relative">
                  <div className={`w-32 h-32 rounded-full overflow-hidden bg-neutral-100 border-4 ${!profilePictureUrl ? 'border-rose-200' : 'border-white'} shadow-lg flex items-center justify-center group`}>
                    {profilePictureUrl ? (
                      <img src={profilePictureUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-16 h-16 text-neutral-300" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="p-2 bg-white rounded-full text-neutral-900 hover:bg-sky-50 transition-colors"
                        title="Take Selfie"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                      <label className="p-2 bg-white rounded-full text-neutral-900 hover:bg-sky-50 transition-colors cursor-pointer" title="Upload Image">
                        <Upload className="w-5 h-5" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'profile')} />
                      </label>
                    </div>
                  </div>
                </div>
                <p className={`text-[10px] font-black uppercase tracking-tighter text-center ${!profilePictureUrl ? 'text-rose-500' : 'text-neutral-400'}`}>
                  Live Selfie or Face Picture Required *
                </p>

                <div className="flex flex-col gap-3 w-full mt-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full py-3 bg-sky-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:bg-sky-500 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    Capture Live Selfie
                  </button>
                  <label className="w-full py-3 bg-neutral-100 text-neutral-700 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer border border-neutral-200 hover:bg-neutral-200 transition-colors">
                    <Upload className="w-5 h-5" />
                    Upload Face Picture
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'profile')} />
                  </label>
                </div>

                {cameraError && (
                  <div className="mt-2 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-[10px] font-bold text-center animate-in fade-in zoom-in-95">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>

              {/* Personal Information */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-2 text-neutral-900">
                  <User className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">Identity Information</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider mb-2">Name *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white border border-neutral-300 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none font-bold text-neutral-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider mb-2">Surname *</label>
                    <input
                      type="text"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white border border-neutral-300 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none font-bold text-neutral-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider mb-2">Date of Birth *</label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white border border-neutral-300 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none font-bold text-neutral-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider mb-2">Contact Number *</label>
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white border border-neutral-300 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none font-bold text-neutral-900"
                      placeholder="+27..."
                      required
                    />
                  </div>
                </div>
              </section>

              {/* Work Trades (REQUIRED) */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-neutral-900">
                  <Award className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">Select Your Work Trades *</span>
                </div>
                <div className="p-5 bg-white border border-neutral-200 rounded-3xl space-y-6">
                  <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                    {CASUAL_TRADES.map((trade) => (
                      <button
                        key={trade}
                        type="button"
                        onClick={() => toggleTrade(trade)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all border ${
                          trades.includes(trade)
                            ? 'bg-sky-600 text-white border-sky-600 shadow-md scale-[1.02]'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-sky-300 hover:bg-white'
                        }`}
                      >
                        {trade}
                      </button>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-neutral-100">
                    <p className="text-[10px] text-neutral-500 font-medium">
                      Selected: <span className="text-sky-600 font-bold">{trades.length} trades</span>
                    </p>
                  </div>
                </div>
              </section>

              {/* Location (REQUIRED) */}
              <section className="space-y-3">
                <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider">Residential Location *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={location.address}
                      onChange={(e) => setLocation({ ...location, address: e.target.value })}
                      className="w-full pl-11 pr-5 py-3.5 bg-white border border-neutral-300 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none font-bold text-neutral-900"
                      placeholder="Street address, Suburb"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchCurrentLocation}
                    className="px-4 bg-sky-50 text-sky-600 border border-sky-200 rounded-2xl hover:bg-sky-100 transition-colors flex items-center justify-center"
                    title="Use GPS"
                  >
                    <Navigation className="w-5 h-5" />
                  </button>
                </div>
              </section>

              {/* Work Experience Section (REQUIRED) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-neutral-900">
                    <Briefcase className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">Work Experience *</span>
                  </div>
                  <button
                    type="button"
                    onClick={addExperience}
                    className="flex items-center gap-1.5 text-xs font-black text-sky-600 hover:text-sky-700"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Job
                  </button>
                </div>

                {experience.length === 0 && (
                  <div className="p-8 border-2 border-dashed border-rose-100 rounded-3xl text-center">
                    <p className="text-xs font-bold text-rose-500 italic">Please add at least one work experience detail.</p>
                  </div>
                )}

                {experience.map((exp, i) => (
                  <div key={i} className="bg-white p-5 rounded-3xl border border-neutral-200 space-y-4 animate-in slide-in-from-right-4 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Company / Employer"
                        value={exp.company}
                        onChange={(e) => updateExperience(i, 'company', e.target.value)}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Role / Title"
                        value={exp.role}
                        onChange={(e) => updateExperience(i, 'role', e.target.value)}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Period (e.g. 2020 - 2022)"
                        value={exp.period}
                        onChange={(e) => updateExperience(i, 'period', e.target.value)}
                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeExperience(i)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 px-4"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                    <textarea
                      placeholder="What did you do in this role?"
                      value={exp.description}
                      onChange={(e) => updateExperience(i, 'description', e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-sky-500 h-20 resize-none"
                    />
                  </div>
                ))}
              </section>

              {/* Work References Section (REQUIRED) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-neutral-900">
                    <Star className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">References *</span>
                  </div>
                  <button
                    type="button"
                    onClick={addReference}
                    className="flex items-center gap-1.5 text-xs font-black text-sky-600 hover:text-sky-700"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Reference
                  </button>
                </div>

                {references.length === 0 && (
                  <div className="p-8 border-2 border-dashed border-rose-100 rounded-3xl text-center">
                    <p className="text-xs font-bold text-rose-500 italic">Please add at least one work reference.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {references.map((ref, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-neutral-200 space-y-3 animate-in slide-in-from-right-4 duration-200">
                      <input
                        type="text"
                        placeholder="Name"
                        value={ref.name}
                        onChange={(e) => updateReference(i, 'name', e.target.value)}
                        className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Contact Number / Email"
                        value={ref.contact}
                        onChange={(e) => updateReference(i, 'contact', e.target.value)}
                        className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500"
                        required
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Relation (e.g. Manager)"
                          value={ref.relation}
                          onChange={(e) => updateReference(i, 'relation', e.target.value)}
                          className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-[10px] font-bold outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeReference(i)}
                          className="p-2 text-rose-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ID Document Upload */}
              <section className="space-y-3">
                <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider">Identity Document (ID/Passport)</label>
                <div className="relative">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-3xl bg-white hover:bg-neutral-50 hover:border-sky-500 transition-all cursor-pointer group">
                    {idDocumentUrl ? (
                      <div className="flex items-center gap-3">
                        <Check className="w-6 h-6 text-emerald-500" />
                        <span className="text-sm font-bold text-neutral-800">ID Uploaded</span>
                        <span className="text-xs text-sky-600 hover:underline">Change</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-neutral-300 mb-2 group-hover:text-sky-500" />
                        <span className="text-xs font-bold text-neutral-500">Click to upload ID</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'id')} />
                  </label>
                </div>
              </section>

              {/* Social Media Links */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black text-neutral-500 uppercase tracking-wider">Social Media Links</label>
                  <button
                    type="button"
                    onClick={() => setSocialLinks([...socialLinks, { platform: '', url: '' }])}
                    className="text-xs font-black text-sky-600 hover:text-sky-700"
                  >
                    + Add Link
                  </button>
                </div>
                {socialLinks.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <select
                      value={link.platform}
                      onChange={(e) => {
                        const updated = [...socialLinks];
                        updated[i].platform = e.target.value;
                        setSocialLinks(updated);
                      }}
                      className="px-4 py-3 bg-white border border-neutral-300 rounded-2xl font-bold text-xs outline-none"
                    >
                      <option value="">Platform</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="facebook">Facebook</option>
                      <option value="twitter">X / Twitter</option>
                      <option value="instagram">Instagram</option>
                      <option value="website">Website</option>
                    </select>
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => {
                        const updated = [...socialLinks];
                        updated[i].url = e.target.value;
                        setSocialLinks(updated);
                      }}
                      className="flex-1 px-4 py-3 bg-white border border-neutral-300 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="URL..."
                    />
                    <button type="button" onClick={() => setSocialLinks(socialLinks.filter((_, idx) => idx !== i))} className="p-3 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </section>

              {/* Submit Actions */}
              <div className="pt-10 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl font-bold transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Save & Lock Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Camera Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[20000] bg-black flex flex-col animate-in fade-in duration-300">
          <header className="p-4 flex items-center justify-between">
            <h4 className="text-white font-bold">Capture Worker Selfie</h4>
            <button onClick={stopCamera} className="p-2 -ml-2 text-white/70 hover:text-white rounded-full hover:bg-white/10">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </header>
          
          {cameraError && (
            <div className="mx-4 p-4 bg-rose-600 text-white rounded-2xl flex items-center gap-3 text-xs font-bold shadow-2xl animate-in slide-in-from-top-4 duration-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}
          
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-80 rounded-[100px] border-2 border-white/40 ring-[2000px] ring-black/40" />
            </div>
          </div>

          <div className="p-8 flex items-center justify-center gap-8 bg-neutral-900/90 backdrop-blur-md">
            <button
              onClick={stopCamera}
              className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full border-4 border-neutral-900" />
            </button>
            <div className="w-14 h-14" />
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Success Notification */}
      {saveSuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-[30000] flex items-center gap-2 animate-in slide-in-from-bottom-10 duration-500">
          <Check className="w-5 h-5" />
          <span className="text-sm font-bold">Worker Passport Updated!</span>
        </div>
      )}
    </div>
  );
};
