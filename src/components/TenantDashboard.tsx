/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ArrowLeft, 
  User, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  FileText, 
  Eye, 
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Image as ImageIcon
} from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

interface TenantDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export const TenantDashboard: React.FC<TenantDashboardProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Listen for users with 'pending' verification status
    const q = query(collection(db, 'users'), where('verificationStatus', '==', 'pending'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setPendingUsers(users);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleApprove = async (user: UserProfile) => {
    if (!user.uid) return;
    setIsProcessing(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { 
        verificationStatus: 'approved',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSelectedUser(null);
    } catch (error) {
      console.error('Error approving user:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (user: UserProfile) => {
    if (!user.uid || !rejectionReason) return;
    setIsProcessing(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { 
        verificationStatus: 'rejected',
        rejectionReason: rejectionReason,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSelectedUser(null);
      setShowRejectForm(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting user:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 w-full h-full bg-white/70 backdrop-blur-xl z-[10000] flex flex-col pointer-events-auto animate-in fade-in duration-150 overflow-hidden"
    >
      <header className="px-5 py-4 border-b border-neutral-200/50 flex items-center justify-between bg-white/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => selectedUser ? setSelectedUser(null) : onClose()}
            className="p-2 -ml-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-neutral-900 leading-tight">
              {selectedUser ? 'Review Documents' : 'Tenant Dashboard'}
            </h2>
            <p className="text-xs text-neutral-500">
              {selectedUser ? `Verifying ${selectedUser.firstName} ${selectedUser.surname}` : 'Manage user verification requests'}
            </p>
          </div>
        </div>
        {!selectedUser && (
          <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {pendingUsers.length} Pending
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-5">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-neutral-500 mt-4 font-bold uppercase tracking-widest">Loading Requests...</p>
            </div>
          ) : !selectedUser ? (
            /* List View */
            <div className="space-y-3">
              {pendingUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-neutral-100 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-neutral-300" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900">No Pending Verifications</h3>
                  <p className="text-xs text-neutral-500 mt-1">All clear! Check back later for new requests.</p>
                </div>
              ) : (
                pendingUsers.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => setSelectedUser(user)}
                    className="w-full bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between hover:border-emerald-500 transition-all group shadow-sm active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                        {user.selfieUrl || user.profilePictureUrl ? (
                          <img src={user.selfieUrl || user.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-6 h-6 text-neutral-300" />
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-neutral-900">{user.firstName} {user.surname}</div>
                        <div className="text-[10px] text-neutral-500">{user.email}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-[9px] font-bold text-neutral-600 uppercase">
                            {user.subscriptionPlan === 'tenant' ? 'Tenant' : 'User'}
                          </span>
                          <span className="text-[9px] text-neutral-400">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'New'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-emerald-500 transition-colors" />
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Detail View */
            <div className="space-y-6 pb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selfie Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 mb-2 uppercase tracking-wider">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    Selfie Verification
                  </div>
                  <div className="aspect-square rounded-3xl bg-neutral-100 border-2 border-white shadow-lg overflow-hidden">
                    {selectedUser.selfieUrl || selectedUser.profilePictureUrl ? (
                      <img src={selectedUser.selfieUrl || selectedUser.profilePictureUrl} className="w-full h-full object-cover" alt="Selfie" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
                        <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
                        <span className="text-[10px] font-bold">MISSING SELFIE</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ID Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 mb-2 uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-sky-600" />
                    ID / Passport Document
                  </div>
                  <div className="aspect-[1.6/1] md:aspect-square rounded-3xl bg-neutral-100 border-2 border-white shadow-lg overflow-hidden">
                    {selectedUser.idDocumentUrl ? (
                      <img src={selectedUser.idDocumentUrl} className="w-full h-full object-cover" alt="ID Document" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
                        <FileText className="w-10 h-10 mb-2 opacity-20" />
                        <span className="text-[10px] font-bold">MISSING ID</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Proof of Payment Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 mb-2 uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Proof of Payment
                </div>
                <div className="w-full min-h-[200px] rounded-3xl bg-neutral-100 border-2 border-white shadow-lg overflow-hidden relative">
                  {selectedUser.proofOfPaymentUrl ? (
                    <img src={selectedUser.proofOfPaymentUrl} className="w-full h-auto" alt="Proof of Payment" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
                      <CreditCard className="w-10 h-10 mb-2 opacity-20" />
                      <span className="text-[10px] font-bold">MISSING PAYMENT PROOF</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {!showRejectForm ? (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 py-4 bg-white border border-rose-200 text-rose-600 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-rose-50 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedUser)}
                    disabled={isProcessing}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Approve Verification
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-rose-200 rounded-3xl p-5 space-y-4 shadow-sm animate-in slide-in-from-bottom-4">
                  <h4 className="text-sm font-bold text-neutral-900">Reason for Rejection</h4>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. ID image is blurry, Selfie doesn't match ID..."
                    className="w-full h-24 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 py-2 text-xs font-bold text-neutral-500 hover:text-neutral-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(selectedUser)}
                      disabled={isProcessing || !rejectionReason}
                      className="flex-[2] py-2 bg-rose-600 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {isProcessing ? 'Processing...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
