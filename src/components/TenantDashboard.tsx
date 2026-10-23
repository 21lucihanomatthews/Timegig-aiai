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
  Image as ImageIcon,
  LayoutDashboard,
  Users,
  Receipt,
  Search
} from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

interface TenantDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  userProfile: UserProfile | null;
}

type TenantTab = 'overview' | 'verification' | 'referrals' | 'tenant-pop' | 'user-pop';

export const TenantDashboard: React.FC<TenantDashboardProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile
}) => {
  const [activeTab, setActiveTab] = useState<TenantTab>('overview');
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentUser?.email === '21lucihanomatthews@gmail.com';
  const isTenant = userProfile?.subscriptionPlan === 'tenant';

  useEffect(() => {
    if (!isOpen) return;

    // Listen for users with 'pending' verification status
    let pendingQuery;
    if (isAdmin) {
      pendingQuery = query(collection(db, 'users'), where('verificationStatus', '==', 'pending'));
    } else {
      pendingQuery = query(collection(db, 'users'), where('verificationStatus', '==', 'pending'), where('referredBy', '==', currentUser.uid));
    }
    
    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      users.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setPendingUsers(users);
      setLoading(false);
    });

    // Listen for all users for stats
    let allUsersQuery;
    if (isAdmin) {
      allUsersQuery = collection(db, 'users');
    } else {
      allUsersQuery = query(collection(db, 'users'), where('referredBy', '==', currentUser.uid));
    }

    const unsubscribeAll = onSnapshot(allUsersQuery, (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      console.log('DEBUG [TenantDashboard] All users fetched:', users.length);
      setAllUsers(users);
    });

    return () => {
      unsubscribePending();
      unsubscribeAll();
    };
  }, [isOpen, currentUser]);

  const handleApprove = async (user: UserProfile) => {
    if (!user.uid) return;
    setIsProcessing(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const subEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await setDoc(userRef, { 
        verificationStatus: 'approved',
        subscriptionPlan: user.requestedPlan || 'user',
        subscriptionEnd: subEnd,
        referralVerified: true,
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

  console.log('Dashboard currentUser:', currentUser);

  const stats = {
    total: allUsers.length,
    pending: pendingUsers.length,
    approved: allUsers.filter(u => u.verificationStatus === 'approved').length,
    tenants: allUsers.filter(u => u.subscriptionPlan === 'tenant').length,
    revenue: allUsers.filter(u => u.verificationStatus === 'approved').length * 150 // Mock revenue: R150 per approved user
  };

  console.log('DEBUG [TenantDashboard] Current User UID:', currentUser?.uid);
  const referrals = allUsers.filter(u => u.referredBy === currentUser?.uid);
  console.log('DEBUG [TenantDashboard] Referrals count:', referrals.length);
  console.log('DEBUG [TenantDashboard] All users referredBy values:', allUsers.map(u => u.referredBy));
  
  const tenantPops = allUsers.filter(u => u.proofOfPaymentUrl && u.requestedPlan === 'tenant');
  const userPops = allUsers.filter(u => u.proofOfPaymentUrl && u.requestedPlan === 'user');

  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Overview';
      case 'verification': return selectedUser ? 'Review Documents' : 'Verification';
      case 'referrals': return 'Referrals';
      case 'tenant-pop': return 'Tenant PoP';
      case 'user-pop': return 'User PoP';
      default: return 'Tenant Dashboard';
    }
  };

  const getTabIcon = () => {
    switch (activeTab) {
      case 'overview': return <LayoutDashboard className="w-5 h-5 text-emerald-600" />;
      case 'verification': return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case 'referrals': return <Users className="w-5 h-5 text-emerald-600" />;
      case 'tenant-pop': return <Receipt className="w-5 h-5 text-emerald-600" />;
      case 'user-pop': return <CreditCard className="w-5 h-5 text-emerald-600" />;
      default: return <Building2 className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-white/20 backdrop-blur-3xl z-[10000] flex flex-col pointer-events-auto animate-in fade-in duration-150 overflow-hidden">
      <header className="px-5 py-4 border-b border-neutral-200/50 flex items-center justify-between bg-white/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedUser) {
                setSelectedUser(null);
              } else {
                onClose();
              }
            }}
            className="p-2 -ml-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl">
              {getTabIcon()}
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 leading-tight">
                {getTabTitle()}
              </h2>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                {selectedUser ? `${selectedUser.firstName} ${selectedUser.surname}` : 'Management Console'}
              </p>
            </div>
          </div>
        </div>
        {!selectedUser && activeTab === 'verification' && pendingUsers.length > 0 && (
          <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {pendingUsers.length} Pending
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-5 pb-24">
        <div className="max-w-2xl mx-auto">
          {loading && activeTab === 'verification' ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-xs text-neutral-500 mt-4 font-bold uppercase tracking-widest">Syncing Requests...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/80 border border-neutral-200 p-5 rounded-[2rem] shadow-sm">
                      <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Users</div>
                      <div className="text-3xl font-black text-neutral-900">{stats.total}</div>
                    </div>
                    <div className="bg-white/80 border border-neutral-200 p-5 rounded-[2rem] shadow-sm">
                      <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Pending</div>
                      <div className="text-3xl font-black text-emerald-600">{stats.pending}</div>
                    </div>
                    <div className="bg-white/80 border border-neutral-200 p-5 rounded-[2rem] shadow-sm">
                      <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Approved</div>
                      <div className="text-3xl font-black text-sky-600">{stats.approved}</div>
                    </div>
                    <div className="bg-white/80 border border-neutral-200 p-5 rounded-[2rem] shadow-sm">
                      <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Revenue</div>
                      <div className="text-3xl font-black text-neutral-900">R{stats.revenue}</div>
                    </div>
                  </div>

                  <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-emerald-600/20">
                    <div className="relative z-10">
                      <h3 className="text-xl font-black mb-2">Tenant Status</h3>
                      <p className="text-emerald-50 text-sm font-medium opacity-90 max-w-[200px]">
                        You are currently managing {stats.total} active members in your workspace.
                      </p>
                      <button className="mt-6 px-6 py-3 bg-white text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-colors">
                        Download Report
                      </button>
                    </div>
                    <Building2 className="absolute -bottom-10 -right-10 w-48 h-48 text-white/10 rotate-12" />
                  </div>
                </div>
              )}

              {/* Verification Tab */}
              {activeTab === 'verification' && (
                <>
                  {!selectedUser ? (
                    <div className="space-y-3">
                      {pendingUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
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
                            className="w-full bg-white/80 border border-neutral-200 rounded-xl p-2.5 flex items-center justify-between hover:border-emerald-500 hover:bg-white transition-all group shadow-2xs active:scale-[0.98]"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0 shadow-inner">
                                {user.selfieUrl || user.profilePictureUrl ? (
                                  <img src={user.selfieUrl || user.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-neutral-300" />
                                  </div>
                                )}
                              </div>
                              <div className="text-left">
                                <div className="text-xs font-black text-neutral-900 uppercase tracking-tight leading-none mb-0.5">
                                  {user.firstName} {user.surname}
                                </div>
                                <div className="text-[10px] text-neutral-400 font-medium mb-0.5">{user.email}</div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
                                    user.requestedPlan === 'tenant' 
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                    : 'bg-sky-100 text-sky-700 border border-sky-200'
                                  }`}>
                                    {user.requestedPlan === 'tenant' ? 'Tenant Plan' : 'User Plan'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-bold text-neutral-400 uppercase">Review</span>
                              <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  ) : (
                    /* Detail View */
                    <div className="space-y-6 pb-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <div className="bg-white border border-rose-200 rounded-[2rem] p-6 space-y-4 shadow-xl">
                          <div className="flex items-center gap-2 text-rose-600 mb-1">
                            <XCircle className="w-5 h-5" />
                            <h4 className="text-sm font-black uppercase tracking-tight">Decline Verification</h4>
                          </div>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Provide a clear reason..."
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
                </>
              )}

              {/* Referrals Tab */}
              {activeTab === 'referrals' && (
                <div className="space-y-4">
                  {isTenant ? (
                    <div className="bg-white/80 border border-neutral-200 p-6 rounded-[2.5rem] shadow-sm mb-6">
                      <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900 mb-2">Referral Link</h3>
                      <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 p-4 rounded-2xl">
                        <code className="flex-1 text-[10px] font-bold text-neutral-500 truncate">
                          {`${window.location.origin}?ref=${currentUser.uid}`}
                        </code>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}?ref=${currentUser.uid}`);
                            alert('Referral link copied to clipboard!');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-emerald-500 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-neutral-100 p-6 rounded-[2.5rem] mb-6 text-center">
                      <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                        Referral link is only available for Tenant subscriptions.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {referrals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center bg-white/40 rounded-[2.5rem] border border-dashed border-neutral-300">
                        <Users className="w-10 h-10 text-neutral-300 mb-4" />
                        <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">No Referrals Yet</p>
                      </div>
                    ) : (
                      referrals.map((user) => (
                        <div key={user.uid} className="bg-white border border-neutral-200 rounded-3xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden">
                              {user.profilePictureUrl ? <img src={user.profilePictureUrl} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-neutral-300" />}
                            </div>
                            <div>
                              <div className="text-sm font-black text-neutral-900 uppercase">{user.firstName} {user.surname}</div>
                              <div className="text-[10px] text-neutral-500">{user.email}</div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 ${user.verificationStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                            {user.referralVerified && <CheckCircle2 className="w-3 h-3" />}
                            {user.referralVerified ? 'Verified Referral' : user.verificationStatus}
                          </div>
                          {!user.referralVerified && (
                            <button
                              onClick={async () => {
                                await setDoc(doc(db, 'users', user.uid), { referralVerified: true, updatedAt: new Date().toISOString() }, { merge: true });
                              }}
                              className="ml-2 px-3 py-1 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase hover:bg-emerald-500 transition-colors"
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tenant PoP Tab */}
              {activeTab === 'tenant-pop' && (
                <div className="space-y-4">
                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input 
                      type="text"
                      placeholder="Search tenant submissions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-4 bg-white/80 border border-neutral-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    {tenantPops.filter(u => `${u.firstName} ${u.surname}`.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Receipt className="w-10 h-10 text-neutral-300 mb-4" />
                        <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">No Tenant Proof of Payments found</p>
                      </div>
                    ) : (
                      tenantPops
                        .filter(u => `${u.firstName} ${u.surname}`.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((user) => (
                          <div key={user.uid} className="bg-white border border-neutral-200 rounded-[2rem] p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                                  {user.profilePictureUrl ? <img src={user.profilePictureUrl} className="w-full h-full object-cover" /> : <User className="w-5 h-5 m-2.5 text-neutral-300" />}
                                </div>
                                <div>
                                  <div className="text-sm font-black text-neutral-900 uppercase leading-none mb-1">{user.firstName} {user.surname}</div>
                                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-tighter">{user.email}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                  user.verificationStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                  user.verificationStatus === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {user.verificationStatus || 'pending'}
                                </span>
                                <button 
                                  onClick={() => user.proofOfPaymentUrl && setZoomedImage(user.proofOfPaymentUrl)}
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                                  title="Zoom Proof of Payment"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            <div 
                              onClick={() => user.proofOfPaymentUrl && setZoomedImage(user.proofOfPaymentUrl)}
                              className="aspect-[4/1] bg-neutral-50 rounded-xl overflow-hidden cursor-zoom-in relative group"
                            >
                              <img src={user.proofOfPaymentUrl} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="Tenant PoP" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-black uppercase text-neutral-900 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm">View Document</span>
                              </div>
                            </div>

                            {user.verificationStatus === 'rejected' && user.rejectionReason && (
                              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-700 font-bold">
                                Reason: {user.rejectionReason}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-1 border-t border-neutral-100">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowRejectForm(true);
                                }}
                                disabled={isProcessing}
                                className="flex-1 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-rose-50 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                              <button
                                onClick={() => handleApprove(user)}
                                disabled={isProcessing}
                                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-emerald-500 transition-colors shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve Tenant PoP
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {/* User PoP Tab */}
              {activeTab === 'user-pop' && (
                <div className="space-y-4">
                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input 
                      type="text"
                      placeholder="Search user submissions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-4 bg-white/80 border border-neutral-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    {userPops.filter(u => `${u.firstName} ${u.surname}`.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <CreditCard className="w-10 h-10 text-neutral-300 mb-4" />
                        <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">No Proof of Payments found</p>
                      </div>
                    ) : (
                      userPops
                        .filter(u => `${u.firstName} ${u.surname}`.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((user) => (
                          <div key={user.uid} className="bg-white border border-neutral-200 rounded-[2rem] p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                                  {user.profilePictureUrl ? <img src={user.profilePictureUrl} className="w-full h-full object-cover" /> : <User className="w-5 h-5 m-2.5 text-neutral-300" />}
                                </div>
                                <div>
                                  <div className="text-sm font-black text-neutral-900 uppercase leading-none mb-1">{user.firstName} {user.surname}</div>
                                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-tighter">{user.email}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                  user.verificationStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                  user.verificationStatus === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {user.verificationStatus || 'pending'}
                                </span>
                                <button 
                                  onClick={() => user.proofOfPaymentUrl && setZoomedImage(user.proofOfPaymentUrl)}
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                                  title="Zoom Proof of Payment"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            <div 
                              onClick={() => user.proofOfPaymentUrl && setZoomedImage(user.proofOfPaymentUrl)}
                              className="aspect-[4/1] bg-neutral-50 rounded-xl overflow-hidden cursor-zoom-in relative group"
                            >
                              <img src={user.proofOfPaymentUrl} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="User PoP" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-black uppercase text-neutral-900 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm">View Document</span>
                              </div>
                            </div>

                            {user.verificationStatus === 'rejected' && user.rejectionReason && (
                              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-700 font-bold">
                                Reason: {user.rejectionReason}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-1 border-t border-neutral-100">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowRejectForm(true);
                                }}
                                disabled={isProcessing}
                                className="flex-1 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-rose-50 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                              <button
                                onClick={() => handleApprove(user)}
                                disabled={isProcessing}
                                className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-emerald-500 transition-colors shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve User PoP
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Tab Menu */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-2xl border-t border-neutral-200/50 px-2 py-3 flex items-center justify-around z-[10001] pb-[env(safe-area-inset-bottom,12px)]">
        <button
          onClick={() => { setActiveTab('overview'); setSelectedUser(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${activeTab === 'overview' ? 'text-emerald-600' : 'text-neutral-400'}`}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeTab === 'overview' ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
          <span className="text-[9px] font-black uppercase tracking-tight">Overview</span>
        </button>
        <button
          onClick={() => { setActiveTab('verification'); setSelectedUser(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all relative ${activeTab === 'verification' ? 'text-emerald-600' : 'text-neutral-400'}`}
        >
          <ShieldCheck className={`w-5 h-5 ${activeTab === 'verification' ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
          <span className="text-[9px] font-black uppercase tracking-tight">Verify</span>
          {pendingUsers.length > 0 && (
            <span className="absolute top-0 right-1/4 w-4 h-4 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('referrals'); setSelectedUser(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${activeTab === 'referrals' ? 'text-emerald-600' : 'text-neutral-400'}`}
        >
          <Users className={`w-5 h-5 ${activeTab === 'referrals' ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
          <span className="text-[9px] font-black uppercase tracking-tight">Referrals</span>
        </button>
        <button
          onClick={() => { setActiveTab('tenant-pop'); setSelectedUser(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${activeTab === 'tenant-pop' ? 'text-emerald-600' : 'text-neutral-400'}`}
        >
          <Receipt className={`w-5 h-5 ${activeTab === 'tenant-pop' ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
          <span className="text-[9px] font-black uppercase tracking-tight">T-PoP</span>
        </button>
        <button
          onClick={() => { setActiveTab('user-pop'); setSelectedUser(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${activeTab === 'user-pop' ? 'text-emerald-600' : 'text-neutral-400'}`}
        >
          <CreditCard className={`w-5 h-5 ${activeTab === 'user-pop' ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
          <span className="text-[9px] font-black uppercase tracking-tight">U-PoP</span>
        </button>
      </nav>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[20000] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button 
            className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
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
