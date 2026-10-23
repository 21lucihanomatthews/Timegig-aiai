/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Building2,
  UserCheck,
  TrendingUp,
  CheckCircle2,
  ArrowLeft,
  Copy,
  Check,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  Landmark,
} from 'lucide-react';

import { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

interface ActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivationComplete?: () => void;
  isDutyActive?: boolean;
  onToggleDuty?: () => void;
  currentUser?: FirebaseUser | null;
  userProfile?: UserProfile | null;
  onProfileUpdated?: (updated: UserProfile) => void;
}

type SubscriptionType = 'tenant' | 'user';

export const ActivationModal: React.FC<ActivationModalProps> = ({
  isOpen,
  onClose,
  onActivationComplete,
  currentUser,
  userProfile,
  onProfileUpdated,
}) => {
  // Step: 'select' -> 'selfie' -> 'id-document' -> 'transfer' -> 'submitted'
  const [step, setStep] = useState<'select' | 'selfie' | 'id-document' | 'transfer' | 'submitted'>('select');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>('tenant');

  // Selfie / Face Image state
  const [faceImage, setFaceImage] = useState<string | null>(userProfile?.selfieUrl || userProfile?.profilePictureUrl || null);
  
  // ID Document state
  const [idImage, setIdImage] = useState<string | null>(userProfile?.idDocumentUrl || null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeCapture, setActiveCapture] = useState<'selfie' | 'id'>('selfie');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Proof of Payment state
  const [popFile, setPopFile] = useState<File | null>(null);
  const [popFileName, setPopFileName] = useState<string>('');
  const [popImage, setPopImage] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Cleanup camera on unmount or close
  React.useEffect(() => {
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


  // 3-second circle loader state
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Copy feedback state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleSelectPlan = (plan: SubscriptionType) => {
    setSelectedPlan(plan);
    setUploadError(null);
    setStep('selfie');
  };

  // --- Camera Logic ---
  const startCamera = async (mode: 'selfie' | 'id' = 'selfie') => {
    setActiveCapture(mode);
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
        setCameraError('Camera access is blocked by the preview environment (iframe). Please use the upload option or open the app directly in your browser.');
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
          facingMode: mode === 'selfie' ? 'user' : 'environment',
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
          video: { facingMode: mode === 'selfie' ? 'user' : 'environment' }, 
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
          setCameraError('Camera access was denied. The preview environment (iframe) often blocks camera permissions. Please use the upload option or open the production link directly.');
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
        if (activeCapture === 'selfie') {
          setFaceImage(dataUrl);
        } else {
          setIdImage(dataUrl);
        }
        stopCamera();
      }
    }
  };

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFaceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setIdImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPopFile(file);
      setPopFileName(file.name);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPopImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      const sizeKb = Math.round(file.size / 1024);
      setFileSize(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
      setUploadError(null);
    }
  };

  const handleSubmitPOP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!popFile && !popFileName) {
      setUploadError('Please select and upload your Proof of Payment document before submitting.');
      return;
    }

    setUploadError(null);
    setIsLoading(true);

    const isTenantPlan = selectedPlan === 'tenant';
    const chosenRef = isTenantPlan ? 'Ten29' : 'User29';
    const amount = isTenantPlan ? 299.99 : 29.99;
    const paymentId = 'pay_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    try {
      if (currentUser?.uid) {
        // Update payment record
        await setDoc(doc(db, 'payments', paymentId), {
          id: paymentId,
          userId: currentUser.uid,
          userEmail: currentUser.email || userProfile?.email || 'user@example.com',
          subscriptionType: selectedPlan,
          paymentReference: chosenRef,
          amountZar: amount,
          documentName: popFileName || 'pop_receipt.pdf',
          documentSize: fileSize || '1.2 MB',
          bank: 'Capitec',
          accountName: 'Matthews',
          accountNumber: '1334067366',
          status: 'pending',
          createdAt: new Date().toISOString(),
        });

        // Update user profile with verification documents
        const userDocRef = doc(db, 'users', currentUser.uid);
        const updatedProfileData: Partial<UserProfile> = {
          verificationStatus: 'pending',
          requestedPlan: selectedPlan,
          updatedAt: new Date().toISOString(),
        };

        if (faceImage) {
          updatedProfileData.profilePictureUrl = faceImage;
          updatedProfileData.selfieUrl = faceImage;
        }
        if (idImage) {
          updatedProfileData.idDocumentUrl = idImage;
        }
        if (popImage) {
          updatedProfileData.proofOfPaymentUrl = popImage;
        }

        await setDoc(userDocRef, updatedProfileData, { merge: true });
        
        if (onProfileUpdated && userProfile) {
          onProfileUpdated({
            ...userProfile,
            ...updatedProfileData,
          } as UserProfile);
        }
      }
    } catch (saveErr) {
      console.warn('Could not persist data to firestore:', saveErr);
    }

    // Exactly 3 seconds circular loading as requested
    setTimeout(() => {
      setIsLoading(false);
      setStep('submitted');
    }, 3000);
  };

  const handleResetAndClose = () => {
    const wasSubmitted = step === 'submitted';
    setStep('select');
    setPopFile(null);
    setPopFileName('');
    setPopImage(null);
    setIsLoading(false);
    onClose();
    if (wasSubmitted && onActivationComplete) {
      onActivationComplete();
    }
  };

  const isTenant = selectedPlan === 'tenant';
  const planName = isTenant ? 'Tenant Sub' : 'User Sub';
  const planPrice = isTenant ? 'R299,99' : 'R29,99';
  const paymentRef = isTenant ? 'Ten29' : 'User29';

  return (
    <div
      className="fixed inset-0 w-full h-full bg-white/20 backdrop-blur-3xl z-[10000] flex flex-col pointer-events-auto animate-in fade-in duration-150 overflow-hidden"
      style={{ zIndex: 10000 }}
    >
      {/* 1. Full Screen Top Navigation Header */}
      <header className="px-5 py-4 border-b border-neutral-200/50 flex items-center justify-between bg-white/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (step === 'select') {
                  handleResetAndClose();
                } else {
                  if (step === 'submitted') {
                    handleResetAndClose();
                  } else if (step === 'transfer') {
                    setStep('id-document');
                  } else if (step === 'id-document') {
                    setStep('selfie');
                  } else {
                    setStep('select');
                  }
                }
              }}
              className="p-2 -ml-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors"
              title="Back"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

          <div>
            <h2 className="text-base font-bold text-neutral-900 leading-tight">
              {step === 'select' && 'Account Activation'}
              {step === 'selfie' && 'Face Verification'}
              {step === 'id-document' && 'ID Document'}
              {step === 'transfer' && 'Bank Transfer Payment'}
              {step === 'submitted' && 'Activation Submitted'}
            </h2>
            <p className="text-xs text-neutral-500">
              {step === 'select' && 'Choose your monthly subscription option'}
              {step === 'selfie' && 'Capture or upload your profile face picture'}
              {step === 'id-document' && 'Capture or upload your ID Document'}
              {step === 'transfer' && 'Pay via Capitec Bank Transfer & Upload Proof'}
              {step === 'submitted' && 'Your documents are being reviewed'}
            </p>
          </div>
        </div>

      </header>

      {/* 2. Full Screen Scrollable Body Content */}
      <main className="flex-1 overflow-y-auto p-5 sm:p-8 flex flex-col items-center">
        {userProfile && userProfile.referralVerified && userProfile.subscriptionEnd && new Date(userProfile.subscriptionEnd).getTime() > Date.now() ? (
          <div className="my-auto py-12 text-center text-neutral-500">
            <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900">Account Already Active</h3>
            <p className="text-xs mt-2">Your account is verified and your subscription is active until {new Date(userProfile.subscriptionEnd).toLocaleDateString()}.</p>
          </div>
        ) : (
        <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
          {/* ================= STEP 1: SELECT SUBSCRIPTION ================= */}
          {step === 'select' && (
            <div className="space-y-4 my-auto py-4">
              <div className="text-center mb-6">
                <span className="text-[11px] font-bold tracking-wider uppercase text-sky-700 bg-sky-100/70 px-3 py-1 rounded-full">
                  Step 1 of 2 · Choose Subscription
                </span>
                <h3 className="text-xl font-black text-neutral-900 mt-2.5">
                  Select Your Subscription Plan
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Choose between Tenant Sub for passive income or User Sub for standard app access.
                </p>
              </div>

              {/* Tenant Sub Box (Smaller Box) */}
              <div
                onClick={() => handleSelectPlan('tenant')}
                className="cursor-pointer rounded-2xl p-4 border-2 border-neutral-200 hover:border-emerald-600 hover:bg-emerald-50/20 hover:shadow-md transition-all group bg-white relative"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-neutral-900">Tenant Sub</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Passive Income
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-emerald-700 font-mono">
                      R299,99
                    </div>
                    <div className="text-[10px] text-neutral-400 font-medium">/ month</div>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                  Become a tenant and earn a monthly passive income from user subscriptions.
                  R299,99 monthly subscription fee to keep Tenant account active.
                </p>

                <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-700 group-hover:underline">
                    Reference: Ten29
                  </span>
                  <button
                    type="button"
                    className="py-1.5 px-3.5 bg-emerald-600 group-hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    Select Tenant Sub →
                  </button>
                </div>
              </div>

              {/* User Sub Box (Smaller Box) */}
              <div
                onClick={() => handleSelectPlan('user')}
                className="cursor-pointer rounded-2xl p-4 border-2 border-neutral-200 hover:border-sky-600 hover:bg-sky-50/20 hover:shadow-md transition-all group bg-white relative"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-neutral-900">User Sub</span>
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                          App Access
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-sky-700 font-mono">
                      R29,99
                    </div>
                    <div className="text-[10px] text-neutral-400 font-medium">/ month</div>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                  Use the app and pay a monthly subscription fee of R29,99.
                </p>

                <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-sky-700 group-hover:underline">
                    Reference: User29
                  </span>
                  <button
                    type="button"
                    className="py-1.5 px-3.5 bg-sky-600 group-hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    Select User Sub →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: FACE VERIFICATION (SELFIE) ================= */}
          {step === 'selfie' && (
            <div className="space-y-6 my-auto py-4 w-full">
              <div className="text-center mb-6">
                <span className="text-[11px] font-bold tracking-wider uppercase text-sky-700 bg-sky-100/70 px-3 py-1 rounded-full">
                  Step 2 of 4 · Face Identification
                </span>
                <h3 className="text-xl font-black text-neutral-900 mt-2.5">
                  Your Profile Picture
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Please capture a live selfie or upload a clear face picture.
                </p>
              </div>

              <div className="flex flex-col items-center gap-6 bg-white p-8 rounded-3xl border border-neutral-100 shadow-xs">
                <div className="relative">
                  <div className={`w-40 h-40 rounded-full overflow-hidden bg-neutral-100 border-4 ${!faceImage ? 'border-rose-200' : 'border-white'} shadow-xl flex items-center justify-center group relative`}>
                    {faceImage ? (
                      <img src={faceImage} alt="Face Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-neutral-300">
                        <UserCheck className="w-16 h-16" />
                        <span className="text-[10px] font-bold uppercase mt-2">No Image</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => startCamera('selfie')}
                        className="p-3 bg-white rounded-full text-neutral-900 hover:bg-sky-50 transition-colors shadow-lg"
                        title="Take Selfie"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      <label className="p-3 bg-white rounded-full text-neutral-900 hover:bg-sky-50 transition-colors cursor-pointer shadow-lg" title="Upload Image">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFaceUpload} />
                      </label>
                    </div>
                  </div>
                  
                  {faceImage && (
                    <div className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center shadow-lg">
                      <Check className="w-5 h-5 text-white stroke-[3]" />
                    </div>
                  )}
                </div>

                {!faceImage && (
                  <div className="flex flex-col gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => startCamera('selfie')}
                      className="w-full py-3 bg-sky-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Capture Live Selfie
                    </button>
                    <label className="w-full py-3 bg-neutral-100 text-neutral-700 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer border border-neutral-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload Face Picture
                      <input type="file" className="hidden" accept="image/*" onChange={handleFaceUpload} />
                    </label>
                  </div>
                )}

                {faceImage && (
                  <button
                    type="button"
                    onClick={() => setStep('id-document')}
                    className="w-full py-3.5 bg-sky-600 text-white rounded-2xl font-black shadow-xl hover:bg-sky-500 transition-all flex items-center justify-center gap-2"
                  >
                    Continue to ID Document
                    <ArrowLeft className="w-5 h-5 rotate-180" />
                  </button>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-[11px] font-bold text-center">
                  {cameraError}
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2.5: ID DOCUMENT ================= */}
          {step === 'id-document' && (
            <div className="space-y-6 my-auto py-4 w-full">
              <div className="text-center mb-6">
                <span className="text-[11px] font-bold tracking-wider uppercase text-sky-700 bg-sky-100/70 px-3 py-1 rounded-full">
                  Step 3 of 4 · Identity Document
                </span>
                <h3 className="text-xl font-black text-neutral-900 mt-2.5">
                  Upload ID or Passport
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Please capture a photo of your ID or upload a clear copy.
                </p>
              </div>

              <div className="flex flex-col items-center gap-6 bg-white p-8 rounded-3xl border border-neutral-100 shadow-xs">
                <div className="relative w-full aspect-[1.6/1]">
                  <div className={`w-full h-full rounded-2xl overflow-hidden bg-neutral-100 border-4 ${!idImage ? 'border-rose-200' : 'border-white'} shadow-xl flex items-center justify-center group relative`}>
                    {idImage ? (
                      <img src={idImage} alt="ID Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-neutral-300">
                        <FileText className="w-16 h-16" />
                        <span className="text-[10px] font-bold uppercase mt-2">No ID Image</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => startCamera('id')}
                        className="p-3 bg-white rounded-full text-neutral-900 hover:bg-sky-50 transition-colors shadow-lg"
                        title="Take Photo"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      <label className="p-3 bg-white rounded-full text-neutral-900 hover:bg-sky-50 transition-colors cursor-pointer shadow-lg" title="Upload Image">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <input type="file" className="hidden" accept="image/*" onChange={handleIdUpload} />
                      </label>
                    </div>
                  </div>
                  
                  {idImage && (
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center shadow-lg z-10">
                      <Check className="w-5 h-5 text-white stroke-[3]" />
                    </div>
                  )}
                </div>

                {!idImage && (
                  <div className="flex flex-col gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => startCamera('id')}
                      className="w-full py-3 bg-sky-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Capture ID Document
                    </button>
                    <label className="w-full py-3 bg-neutral-100 text-neutral-700 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer border border-neutral-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload ID Document
                      <input type="file" className="hidden" accept="image/*" onChange={handleIdUpload} />
                    </label>
                  </div>
                )}

                {idImage && (
                  <button
                    type="button"
                    onClick={() => setStep('transfer')}
                    className="w-full py-3.5 bg-sky-600 text-white rounded-2xl font-black shadow-xl hover:bg-sky-500 transition-all flex items-center justify-center gap-2"
                  >
                    Continue to Payment
                    <ArrowLeft className="w-5 h-5 rotate-180" />
                  </button>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-[11px] font-bold text-center">
                  {cameraError}
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 3: BANK TRANSFER & UPLOAD ================= */}
          {step === 'transfer' && !isLoading && (
            <div className="space-y-5 py-2 w-full">
              <div className="text-center mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-sky-700 bg-sky-100/70 px-3 py-1 rounded-full">
                  Step 4 of 4 · Finalize Payment
                </span>
              </div>
              {/* Selected Plan & Face Identity Highlight */}
              <div className="p-3.5 rounded-2xl bg-neutral-900 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  {faceImage && (
                    <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden shrink-0">
                      <img src={faceImage} alt="Face" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                      Identity Verified
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{planName}</h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {planPrice}
                  </span>
                  <span className="text-xs text-neutral-400 block">monthly fee</span>
                </div>
              </div>

              {/* Capitec Bank Transfer Details Card */}
              <div className="bg-neutral-50 rounded-2xl p-4.5 border border-neutral-200 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-sky-700" />
                    <span className="text-xs font-bold text-neutral-900">
                      Capitec Bank Transfer Details
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Direct EFT
                  </span>
                </div>

                {/* Bank Name */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-medium">Bank:</span>
                  <span className="font-bold text-neutral-900">Capitec</span>
                </div>

                {/* Account Name */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-medium">Account Name:</span>
                  <span className="font-bold text-neutral-900">Matthews</span>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-neutral-500 font-medium block">Account Number:</span>
                    <span className="text-sm font-black text-neutral-900 font-mono tracking-wider">
                      1334067366
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('1334067366', 'acc')}
                    className="py-1 px-2.5 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1 border border-sky-200"
                  >
                    {copiedField === 'acc' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Reference */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-200/80">
                  <div>
                    <span className="text-neutral-500 font-medium block">
                      Required Payment Reference:
                    </span>
                    <span className="text-sm font-black text-sky-700 font-mono tracking-wider">
                      {paymentRef}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(paymentRef, 'ref')}
                    className="py-1 px-2.5 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1 border border-sky-200"
                  >
                    {copiedField === 'ref' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Upload Proof of Payment Document */}
              <form onSubmit={handleSubmitPOP} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-900 mb-1.5">
                    Upload Proof of Payment Document:
                  </label>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    Attach your bank transfer confirmation slip (PDF, PNG, or JPG).
                  </p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,image/png,image/jpeg,image/webp,.doc,.docx"
                    className="hidden"
                  />

                  {!popFileName ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-neutral-300 hover:border-sky-500 bg-neutral-50/60 hover:bg-sky-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white text-sky-600 flex items-center justify-center shadow-sm border border-neutral-200 mb-2 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-6 h-6 stroke-[2]" />
                      </div>
                      <span className="text-xs font-bold text-neutral-800">
                        Click to select proof of payment
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-0.5">
                        Supports PDF, PNG, JPG receipts (Max 10MB)
                      </span>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/60 border border-emerald-300 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-neutral-900 block truncate">
                            {popFileName}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium">
                            Ready to submit · {fileSize}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-1 px-2.5 text-xs font-semibold text-neutral-700 hover:text-neutral-950 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium mt-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>Submit Proof of Payment</span>
                </button>
              </form>
            </div>
          )}

          {/* ================= 3 SECONDS CIRCLE LOADING ================= */}
          {isLoading && (
            <div className="my-auto py-12 flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in duration-200">
              {/* Spinning Circle Animation */}
              <div className="relative flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-neutral-200 border-t-sky-600 animate-spin" />
                <div className="absolute">
                  <Loader2 className="w-8 h-8 text-sky-600 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-neutral-900">
                  Processing Proof of Payment...
                </h4>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                  Verifying your Capitec transfer document and recording reference{' '}
                  <span className="font-mono font-bold text-sky-700">{paymentRef}</span>.
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 rounded-full text-[11px] text-neutral-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                <span>Verifying transfer (3 seconds)</span>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SUBMITTED CONFIRMATION ================= */}
          {step === 'submitted' && (
            <div className="my-auto py-8 flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="text-xl font-black text-neutral-900">
                  Proof of Payment Submitted!
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Thank you! Your proof of payment for{' '}
                  <strong className="text-neutral-900">{planName}</strong> ({planPrice}) has been
                  received successfully.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="w-full bg-neutral-50 rounded-2xl p-4.5 border border-neutral-200 text-left space-y-2.5 text-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Subscription:</span>
                  <span className="font-bold text-neutral-900">{planName}</span>
                </div>
                {faceImage && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Identity Photo:</span>
                    <div className="w-8 h-8 rounded-full border border-neutral-200 overflow-hidden shadow-sm">
                      <img src={faceImage} alt="Identity" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Monthly Amount:</span>
                  <span className="font-bold text-emerald-600 font-mono">{planPrice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Bank & Account:</span>
                  <span className="font-bold text-neutral-900">Capitec · Matthews</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Payment Reference:</span>
                  <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {paymentRef}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Uploaded Document:</span>
                  <span className="font-medium text-neutral-800 truncate max-w-[180px]">
                    {popFileName}
                  </span>
                </div>
                <div className="pt-1 border-t border-neutral-200 flex items-center justify-between">
                  <span className="text-neutral-500">Status:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Pending Approval & Active
                  </span>
                </div>
              </div>

              <div className="w-full pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors shadow-sm"
                >
                  Return to Map
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </main>

      {/* Camera Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[20000] bg-black flex flex-col animate-in fade-in duration-300">
          <header className="p-4 flex items-center justify-between">
            <h4 className="text-white font-bold">Capture Identification Selfie</h4>
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
    </div>
  );
};
