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

  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Listen for users with 'pending' verification status
    const q = query(collection(db, 'users'), where('verificationStatus', '==', 'pending'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      // Sort by creation date if available
      users.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
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
        subscriptionPlan: user.requestedPlan || 'user',
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
      className="fixed inset-0 w-full h-full bg-neutral-100/40 backdrop-blur-3xl z-[10000] flex flex-col pointer-events-auto animate-in fade-in duration-150 overflow-hidden"
    >
      <header className="px-5 py-4 border-b border-neutral-200/50 flex items-center justify-between bg-white/60 backdrop-blur-md shrink-0">
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
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
              {selectedUser ? `${selectedUser.firstName} ${selectedUser.surname}` : 'Verification Management'}
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
              <p className="text-xs text-neutral-500 mt-4 font-bold uppercase tracking-widest">Syncing Requests...</p>
            </div>
          ) : !selectedUser ? (
            /* List View */
            <div className="space-y-3">
              {pendingUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-20 h-20 rounded-[2.5rem] bg-white border border-neutral-200 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/5">
                    <ShieldCheck className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-black text-neutral-900">Queue is Empty</h3>
                  <p className="text-xs text-neutral-500 mt-2 max-w-[200px]">All users are verified. New requests will appear here as they come in.</p>
                </div>
              ) : (
                pendingUsers.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => setSelectedUser(user)}
                    className="w-full bg-white/80 border border-neutral-200 rounded-3xl p-4 flex items-center justify-between hover:border-emerald-500 hover:bg-white transition-all group shadow-sm active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0 shadow-inner">
                        {user.selfieUrl || user.profilePictureUrl ? (
                          <img src={user.selfieUrl || user.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-7 h-7 text-neutral-300" />
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-black text-neutral-900 uppercase tracking-tight">
                          {user.firstName} {user.surname}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-medium mb-1.5">{user.email}</div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            user.requestedPlan === 'tenant' 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                            : 'bg-sky-100 text-sky-700 border border-sky-200'
                          }`}>
                            {user.requestedPlan === 'tenant' ? 'Tenant Plan' : 'User Plan'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">Review</span>
                      <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Detail View */
            <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selfie Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-neutral-500 mb-1 uppercase tracking-[0.15em]">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    Selfie Identity
                  </div>
                  <div 
                    onClick={() => (selectedUser.selfieUrl || selectedUser.profilePictureUrl) && setZoomedImage(selectedUser.selfieUrl || selectedUser.profilePictureUrl || null)}
                    className="aspect-square rounded-[2rem] bg-white border border-neutral-200 shadow-xl overflow-hidden cursor-zoom-in group active:scale-95 transition-transform"
                  >
                    {selectedUser.selfieUrl || selectedUser.profilePictureUrl ? (
                      <div className="w-full h-full relative">
                        <img src={selectedUser.selfieUrl || selectedUser.profilePictureUrl} className="w-full h-full object-cover" alt="Selfie" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300">
                        <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ID Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black text-neutral-500 mb-1 uppercase tracking-[0.15em]">
                    <FileText className="w-4 h-4 text-sky-600" />
                    Identity Document
                  </div>
                  <div 
                    onClick={() => selectedUser.idDocumentUrl && setZoomedImage(selectedUser.idDocumentUrl)}
                    className="aspect-[1.6/1] md:aspect-square rounded-[2rem] bg-white border border-neutral-200 shadow-xl overflow-hidden cursor-zoom-in group active:scale-95 transition-transform"
                  >
                    {selectedUser.idDocumentUrl ? (
                      <div className="w-full h-full relative">
                        <img src={selectedUser.idDocumentUrl} className="w-full h-full object-cover" alt="ID Document" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300">
                        <FileText className="w-12 h-12 mb-2 opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No Document</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Proof of Payment Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black text-neutral-500 mb-1 uppercase tracking-[0.15em]">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Proof of Payment (Capitec)
                </div>
                <div 
                  onClick={() => selectedUser.proofOfPaymentUrl && setZoomedImage(selectedUser.proofOfPaymentUrl)}
                  className="w-full min-h-[160px] rounded-[2rem] bg-white border border-neutral-200 shadow-xl overflow-hidden relative cursor-zoom-in group active:scale-[0.98] transition-transform"
                >
                  {selectedUser.proofOfPaymentUrl ? (
                    <div className="w-full h-full relative">
                      <img src={selectedUser.proofOfPaymentUrl} className="w-full h-auto max-h-[400px] object-contain mx-auto" alt="Proof of Payment" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                        <Eye className="w-10 h-10 text-neutral-900 opacity-0 group-hover:opacity-30 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-300">
                      <CreditCard className="w-12 h-12 mb-2 opacity-50" />
                      <span className="text-[10px] font-black uppercase tracking-widest">No Proof Uploaded</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {!showRejectForm ? (
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 py-4.5 bg-white border border-rose-200 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm hover:bg-rose-50 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedUser)}
                    disabled={isProcessing}
                    className="flex-[1.5] py-4.5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Verify Account
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-rose-200 rounded-[2rem] p-6 space-y-4 shadow-xl animate-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-2 text-rose-600 mb-1">
                    <XCircle className="w-5 h-5" />
                    <h4 className="text-sm font-black uppercase tracking-tight">Decline Verification</h4>
                  </div>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a clear reason (e.g. 'ID photo is blurry', 'Payment reference mismatch')..."
                    className="w-full h-28 p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all outline-none resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(selectedUser)}
                      disabled={isProcessing || !rejectionReason}
                      className="flex-[2] py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/20 disabled:opacity-50 hover:bg-rose-500 transition-colors"
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

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[20000] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={() => setZoomedImage(null)}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <img 
            src={zoomedImage} 
            alt="Zoomed document" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
