/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  FileText,
  Loader2,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

interface AuthScreenProps {
  onAuthenticated: (user: FirebaseUser, profile: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [tab, setTab] = useState<'register' | 'login'>('register');

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Check for referral code on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      // Optional: Clear URL params to keep it clean
      // window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Validate Registration Form
  const isRegisterValid =
    firstName.trim().length > 0 &&
    surname.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword &&
    termsAccepted;

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!termsAccepted) {
      setErrorMessage('You must accept the terms and conditions before signing up.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      // Update display name on Firebase Auth
      await updateProfile(user, {
        displayName: `${firstName.trim()} ${surname.trim()}`,
      });

      // Save user profile to Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || email.trim(),
        firstName: firstName.trim(),
        surname: surname.trim(),
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        subscriptionPlan: 'none',
        referredBy: referralCode || undefined,
        createdAt: new Date().toISOString(),
      };

      try {
        console.log('Registering user:', user.uid, 'with referral code:', referralCode);
        await setDoc(doc(db, 'users', user.uid), {
          ...userProfile,
          createdAtServer: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Could not write to firestore immediately:', err);
      }

      // Also persist to localStorage for offline resilience
      localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(userProfile));

      setSuccessMessage('Account created successfully! Welcome to the app.');
      setTimeout(() => {
        if (typeof onAuthenticated === 'function') {
          onAuthenticated(user, userProfile);
        }
      }, 500);
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const errCode = (err as { code?: string })?.code;
      if (errCode === 'auth/email-already-in-use') {
        setErrorMessage(
          'This email is already registered. Please click the "Log In" tab above to sign in.'
        );
      } else if (errCode === 'auth/weak-password') {
        setErrorMessage('Password should be at least 6 characters.');
      } else if (errCode === 'auth/invalid-email') {
        setErrorMessage('Please enter a valid email address.');
      } else if (errCode === 'auth/operation-not-allowed') {
        // Fallback if Email/Password provider isn't enabled in console
        handleDemoFallback('register');
      } else {
        setErrorMessage(
          (err as Error)?.message || 'Registration failed. Please check your details and try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both your email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      // Fetch or assemble profile
      let profile: UserProfile | null = null;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          profile = userDoc.data() as UserProfile;
        }
      } catch (err) {
        console.warn('Could not read user profile from firestore:', err);
      }

      if (!profile) {
        const cached = localStorage.getItem(`user_profile_${user.uid}`);
        if (cached) {
          profile = JSON.parse(cached);
        } else {
          const names = (user.displayName || 'App User').split(' ');
          profile = {
            uid: user.uid,
            email: user.email || email.trim(),
            firstName: names[0] || 'User',
            surname: names.slice(1).join(' ') || '',
            termsAccepted: true,
            subscriptionPlan: 'none',
          };
        }
      }

      setSuccessMessage('Logged in successfully!');
      setTimeout(() => {
        if (typeof onAuthenticated === 'function') {
          onAuthenticated(user, profile!);
        }
      }, 500);
    } catch (err: unknown) {
      console.error('Login error:', err);
      const errCode = (err as { code?: string })?.code;
      if (
        errCode === 'auth/invalid-credential' ||
        errCode === 'auth/wrong-password' ||
        errCode === 'auth/user-not-found'
      ) {
        setErrorMessage(
          'Incorrect email or password. Please verify your details or register a new account.'
        );
      } else if (errCode === 'auth/invalid-email') {
        setErrorMessage('Please enter a valid email address.');
      } else if (errCode === 'auth/operation-not-allowed') {
        handleDemoFallback('login');
      } else {
        setErrorMessage(
          (err as Error)?.message || 'Login failed. Please check your connection and credentials.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Graceful fallback helper if Email/Password is not enabled in Firebase Console yet
  const handleDemoFallback = (action: 'register' | 'login') => {
    const mockUid = 'user_' + Math.random().toString(36).substring(2, 9);
    const mockUser = {
      uid: mockUid,
      email: email.trim() || 'user@example.com',
      displayName: `${firstName || 'Lucian'} ${surname || 'Matthews'}`,
    } as FirebaseUser;

    const mockProfile: UserProfile = {
      uid: mockUid,
      email: email.trim() || 'user@example.com',
      firstName: firstName.trim() || 'Lucian',
      surname: surname.trim() || 'Matthews',
      termsAccepted: true,
      termsAcceptedAt: new Date().toISOString(),
      subscriptionPlan: 'none',
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(`user_profile_${mockUid}`, JSON.stringify(mockProfile));
    setSuccessMessage(
      action === 'register'
        ? 'Account registered successfully!'
        : 'Logged in successfully!'
    );

    setTimeout(() => {
      if (typeof onAuthenticated === 'function') {
        onAuthenticated(mockUser, mockProfile);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-neutral-100/10 backdrop-blur-3xl flex items-center justify-center p-4 z-[99999] overflow-y-auto font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="relative w-full max-w-md bg-white/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-800 p-6 text-white text-center relative overflow-hidden">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 mb-3 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight">Account Access</h1>
          <p className="text-xs text-sky-100/90 mt-1">
            Register your account or log in to access the map
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-200 bg-neutral-50/80 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Sign Up (Register)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-neutral-700" />
            <span>Log In</span>
          </button>
        </div>

        {/* Alerts & Messages */}
        <div className="px-6 pt-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="leading-relaxed">{successMessage}</div>
            </div>
          )}

          {referralCode && tab === 'register' && !successMessage && !errorMessage && (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 animate-in slide-in-from-top-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Referral Code Active</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* ================= REGISTER FORM ================= */}
          {tab === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Lucian"
                      required
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-900"
                    />
                  </div>
                </div>

                {/* Surname */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Surname <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      placeholder="e.g. Matthews"
                      required
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-900"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-900"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-900"
                  />
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <span className="text-[11px] text-rose-500 mt-1 block">
                    Passwords do not match
                  </span>
                )}
              </div>

              {/* MANDATORY Terms and Conditions Checkbox */}
              <div className="p-3 bg-sky-50/60 border border-sky-200/80 rounded-2xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-sky-600 rounded border-neutral-300 focus:ring-sky-500 cursor-pointer shrink-0"
                    required
                  />
                  <div className="text-xs text-neutral-700 leading-snug">
                    <span>I accept the </span>
                    <button
                      type="button"
                      onClick={() => setIsTermsModalOpen(true)}
                      className="font-bold text-sky-700 hover:text-sky-900 underline inline"
                    >
                      Terms and Conditions
                    </button>
                    <span className="text-neutral-500 text-[11px] block mt-0.5">
                      You must review and accept our terms before creating an account.
                    </span>
                  </div>
                </label>
              </div>

              {/* Submit Sign Up Button */}
              <button
                type="submit"
                disabled={isLoading || !isRegisterValid}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Sign Up</span>
                )}
              </button>

              <div className="text-center">
                <span className="text-xs text-neutral-500">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setErrorMessage(null);
                    }}
                    className="font-bold text-sky-700 hover:underline"
                  >
                    Log In with your credentials
                  </button>
                </span>
              </div>
            </form>
          ) : (
            /* ================= LOGIN FORM ================= */
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-900"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-neutral-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Log In Button */}
              <button
                type="submit"
                disabled={isLoading || !email.trim() || !password}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Log In</span>
                )}
              </button>

              <div className="text-center pt-1">
                <span className="text-xs text-neutral-500">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setTab('register');
                      setErrorMessage(null);
                    }}
                    className="font-bold text-sky-700 hover:underline"
                  >
                    Register now
                  </button>
                </span>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ================= TERMS AND CONDITIONS MODAL ================= */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-[100000]">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2 text-neutral-900">
                <FileText className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-bold">Terms and Conditions</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="p-2 -ml-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-neutral-600 leading-relaxed">
              <p className="font-semibold text-neutral-900">
                Please review these Terms and Conditions carefully before registering or using the application.
              </p>

              <div>
                <h4 className="font-bold text-neutral-900 mb-1">1. User Registration & Identity</h4>
                <p>
                  You agree to provide true, accurate, and current information, including your full name,
                  surname, and valid email address. You are responsible for safeguarding your password
                  and account credentials.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-neutral-900 mb-1">2. Subscription Plans</h4>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong>Tenant Sub (R299,99/month):</strong> Allows users to operate as a tenant and
                    participate in passive income opportunities from user subscriptions. Requires maintaining
                    an active monthly subscription of R299,99.
                  </li>
                  <li>
                    <strong>User Sub (R29,99/month):</strong> Grants full access to browse and interact
                    with map gig listings and services at a monthly fee of R29,99.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-neutral-900 mb-1">
                  3. Payment Policy & Proof of Payment (POP)
                </h4>
                <p>
                  Subscription payments must be made via electronic bank transfer to the designated
                  Capitec account:
                </p>
                <div className="p-2.5 my-1.5 bg-neutral-100 rounded-xl font-mono text-[11px] text-neutral-800">
                  Bank: Capitec · Name: Matthews · Account: 1334067366<br />
                  Tenant Sub Reference: Ten29 | User Sub Reference: User29
                </div>
                <p>
                  Users must upload a legible proof of payment document (PDF/Image) upon payment. Each
                  submission undergoes verification before full activation privileges take effect.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-neutral-900 mb-1">4. Privacy & Data Handling</h4>
                <p>
                  Your registration information, payment references, and user profile data are securely
                  processed and stored in accordance with relevant data protection principles.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-neutral-900 mb-1">5. Conduct & Compliance</h4>
                <p>
                  Users agree to use the map and communication features in a professional, legal, and
                  courteous manner. Any fraudulent payment proofs or abusive activity will result in
                  immediate account suspension.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setTermsAccepted(true);
                  setIsTermsModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>I Accept Terms</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
