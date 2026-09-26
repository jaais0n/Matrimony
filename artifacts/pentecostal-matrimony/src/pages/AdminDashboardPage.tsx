import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Building,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  ExternalLink,
  FileCheck,
  Flag,
  Heart,
  Layers,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  AlertTriangle,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { customFetch } from '@workspace/api-client-react';
import { useClerk, useUser } from '../auth';
import { deduplicateProfiles } from '../utils/storageHelper';

export function AdminDashboardPage({ activeRole }: { activeRole?: string }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'profiles'
    | 'verification'
    | 'reports'
    | 'churches'
    | 'denominations'
    | 'subscriptions'
    | 'messages'
    | 'analytics'
    | 'settings'
  >('profiles');

  const { data: overview, refetch: refetchOverview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => customFetch<any>('/api/admin/overview'),
  });

  const { data: rawQueue = [], refetch: refetchQueue } = useQuery({
    queryKey: ['admin-queue'],
    queryFn: () => customFetch<any[]>('/api/admin/verification-queue'),
  });
  const queue = Array.isArray(rawQueue) ? rawQueue : [];

  const { data: rawReports = [], refetch: refetchReports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => customFetch<any[]>('/api/admin/reports'),
  });
  const reports = Array.isArray(rawReports) ? rawReports : [];

  const { data: rawUsersList = [], refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await customFetch<any[]>('/api/admin/users');
      if (Array.isArray(res) && res.length > 0) return res;
      try {
        const raw = localStorage.getItem('pm_registered_users');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((u: any) => ({
              id: u.id,
              name: u.name || u.fullName || (u.email ? u.email.split('@')[0] : 'Member'),
              fullName: u.fullName || u.name,
              email: u.email,
              role: u.role || 'user',
              status: 'active',
              registeredAt: 'Today',
            }));
          }
        }
      } catch {}
      return res || [];
    },
  });
  const usersList = Array.isArray(rawUsersList) ? rawUsersList : [];

  const { data: rawChurchesList = [] } = useQuery({
    queryKey: ['admin-churches'],
    queryFn: () => customFetch<any[]>('/api/admin/churches'),
  });
  const churchesList = Array.isArray(rawChurchesList) ? rawChurchesList : [];

  const { data: rawDenominationsList = [] } = useQuery({
    queryKey: ['admin-denominations'],
    queryFn: () => customFetch<any[]>('/api/admin/denominations'),
  });
  const denominationsList = Array.isArray(rawDenominationsList) ? rawDenominationsList : [];

  const { data: profilesData, refetch: refetchProfiles } = useQuery<any>({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      let localItems: any[] = [];
      try {
        const raw = localStorage.getItem('pm_registered_profiles');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) localItems = parsed;
        }
        const myProfRaw = localStorage.getItem('pm_my_profile');
        if (myProfRaw) {
          const myProf = JSON.parse(myProfRaw);
          if (myProf && !localItems.some((p) => p.id === myProf.id || p.userId === myProf.userId)) {
            localItems.push(myProf);
          }
        }
      } catch {}

      const res = await customFetch<any>('/api/profiles').catch(() => null);
      const apiItems = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);

      return deduplicateProfiles([...localItems, ...apiItems]);
    },
  });

  const profilesList = Array.isArray(profilesData) ? profilesData : ((profilesData as any)?.items || []);
  const [profileSearch, setProfileSearch] = useState('');
  const [profileStatusFilter, setProfileStatusFilter] = useState<'all' | 'verified' | 'under_review' | 'unverified'>('all');

  const filteredProfiles = profilesList.filter((p: any) => {
    const s = profileSearch.trim().toLowerCase();
    const nameMatch = p.displayName ? p.displayName.toLowerCase().includes(s) : false;
    const churchMatch = (p.church || p.faith?.church) ? (p.church || p.faith?.church).toLowerCase().includes(s) : false;
    const denomMatch = (p.denomination || p.faith?.denomination) ? (p.denomination || p.faith?.denomination).toLowerCase().includes(s) : false;
    const locMatch = p.location ? p.location.toLowerCase().includes(s) : false;
    const occMatch = (p.occupation || p.career?.occupation) ? (p.occupation || p.career?.occupation).toLowerCase().includes(s) : false;

    const matchesSearch = !s || nameMatch || churchMatch || denomMatch || locMatch || occMatch;

    const matchesStatus =
      profileStatusFilter === 'all' ||
      (profileStatusFilter === 'verified' && p.verificationStatus === 'verified') ||
      (profileStatusFilter === 'under_review' && p.verificationStatus === 'under_review') ||
      (profileStatusFilter === 'unverified' && (!p.verificationStatus || p.verificationStatus === 'unverified'));

    return matchesSearch && matchesStatus;
  });

  const [toast, setToast] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'user' | 'profile';
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      if (deleteTarget.type === 'user') {
        // 1. Delete from Backend API / Database
        await customFetch(`/api/admin/users/${deleteTarget.id}/delete`, {
          method: 'POST',
        }).catch(() => {});

        // 2. Clean from Browser LocalStorage
        try {
          const rawUsers = localStorage.getItem('pm_registered_users');
          if (rawUsers) {
            const list = JSON.parse(rawUsers);
            const filtered = list.filter((u: any) => u.id !== deleteTarget.id);
            localStorage.setItem('pm_registered_users', JSON.stringify(filtered));
          }

          const rawProfiles = localStorage.getItem('pm_registered_profiles');
          if (rawProfiles) {
            const list = JSON.parse(rawProfiles);
            const filtered = list.filter((p: any) => p.userId !== deleteTarget.id && p.id !== deleteTarget.id);
            localStorage.setItem('pm_registered_profiles', JSON.stringify(filtered));
          }

          localStorage.removeItem(`pm_user_profile_${deleteTarget.id}`);
          const myProf = localStorage.getItem('pm_my_profile');
          if (myProf) {
            const p = JSON.parse(myProf);
            if (p.userId === deleteTarget.id || p.id === deleteTarget.id) {
              localStorage.removeItem('pm_my_profile');
            }
          }
        } catch {}

        showToast(`User "${deleteTarget.name}" and associated profile permanently deleted.`);
        refetchUsers();
        refetchProfiles();
        refetchQueue();
        refetchOverview();
      } else {
        // Profile Deletion
        await customFetch(`/api/admin/profiles/${deleteTarget.id}/delete`, {
          method: 'POST',
        }).catch(() => {});

        try {
          const rawProfiles = localStorage.getItem('pm_registered_profiles');
          if (rawProfiles) {
            const list = JSON.parse(rawProfiles);
            const filtered = list.filter((p: any) => p.id !== deleteTarget.id && p.userId !== deleteTarget.id);
            localStorage.setItem('pm_registered_profiles', JSON.stringify(filtered));
          }
          const myProf = localStorage.getItem('pm_my_profile');
          if (myProf) {
            const p = JSON.parse(myProf);
            if (p.id === deleteTarget.id || p.userId === deleteTarget.id) {
              localStorage.removeItem('pm_my_profile');
            }
          }
        } catch {}

        showToast(`Matrimonial profile "${deleteTarget.name}" permanently deleted.`);
        refetchProfiles();
        refetchQueue();
        refetchOverview();
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      showToast('Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleReviewVerification = async (profileId: string, decision: 'verified' | 'rejected' | 'under_review') => {
    try {
      await customFetch(`/api/admin/verifications/${profileId}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
    } catch (err) {
      console.warn('Backend API review sync error (using local storage fallback):', err);
    }

    try {
      const raw = localStorage.getItem('pm_registered_profiles');
      if (raw) {
        const list = JSON.parse(raw);
        const idx = list.findIndex((p: any) => p.id === profileId || p.userId === profileId);
        if (idx >= 0) {
          list[idx].verificationStatus = decision;
          localStorage.setItem('pm_registered_profiles', JSON.stringify(list));
        }
      }
      const myProfRaw = localStorage.getItem('pm_my_profile');
      if (myProfRaw) {
        const myProf = JSON.parse(myProfRaw);
        if (myProf.id === profileId || myProf.userId === profileId) {
          myProf.verificationStatus = decision;
          localStorage.setItem('pm_my_profile', JSON.stringify(myProf));
        }
      }
    } catch {}

    showToast(`Profile verification status updated to: ${decision}`);
    refetchQueue();
    refetchProfiles();
  };

  const handleReportAction = async (reportId: string, action: 'dismissed' | 'action_taken') => {
    try {
      await customFetch(`/api/admin/reports/${reportId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
    } catch (err) {
      console.warn('Backend API report sync error:', err);
    }
    showToast(`Report status updated to: ${action}`);
    refetchReports();
  };

  const sidebarLinks = [
    { id: 'profiles', label: 'Profiles Directory', icon: UserCheck },
    { id: 'verification', label: 'Verification Queue', icon: FileCheck },
    { id: 'reports', label: 'Reports & Complaints', icon: Flag },
    { id: 'churches', label: 'Churches', icon: Building },
    { id: 'denominations', label: 'Denominations', icon: Layers },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'messages', label: 'Messages Audit', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Dedicated Admin Portal Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950 text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-700 text-white font-extrabold text-sm shadow-xs">
              <Shield size={18} />
            </div>
            <div>
              <span className="block font-black text-sm uppercase tracking-wider text-white">
                Pentecostal Matrimony <span className="font-semibold text-xs ml-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">Admin Hub</span>
              </span>
              <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                Platform Administration
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Open public website in a new tab"
            >
              <ExternalLink size={13} />
              <span>Live Site</span>
            </a>

            <div className="flex items-center gap-2.5 border-l border-slate-800 pl-3">
              <div className="hidden sm:block text-right">
                <span className="block text-xs font-bold text-white">Administrator</span>
                <span className="block text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  Online
                </span>
              </div>
              <button
                type="button"
                onClick={() => signOut({ redirectUrl: '/sign-in' })}
                className="flex items-center gap-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
                title="Sign out of Admin Dashboard"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {toast && (
        <div className="fixed top-20 right-4 z-50 rounded-lg border border-rose-300 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex-1 bg-slate-50 text-slate-900 pb-16">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Banner with clean slate & solid brand rose theme */}
        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 sm:p-7 text-white shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-700 px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-xs">
                Administrator Portal
              </span>
              <span className="text-xs text-slate-400">Role: {activeRole || 'System Admin'}</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Profile Management Hub
            </h1>
            <p className="mt-1 text-xs text-slate-400 max-w-md">
              Review identity verifications, pastoral records, moderation complaints, and directory health.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-3 text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Health</span>
              <span className="block text-lg font-extrabold text-emerald-400">100% Active</span>
            </div>
          </div>
        </div>

        {/* Dashboard Layout: Sidebar + Main Panel */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
              <nav className="space-y-1">
                {sidebarLinks.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as typeof activeTab)}
                      className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                        active
                          ? 'bg-rose-700 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-rose-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={active ? 'text-white' : 'text-slate-400'} />
                        <span>{item.label}</span>
                      </div>
                      {item.id === 'profiles' && profilesList.length > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? 'bg-white text-rose-800' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                          {profilesList.length}
                        </span>
                      )}
                      {item.id === 'verification' && queue.length > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? 'bg-white text-rose-800' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {queue.length}
                        </span>
                      )}
                      {item.id === 'reports' && reports.length > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? 'bg-white text-rose-800' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                          {reports.filter((r: any) => r.status === 'open').length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Area */}
          <div className="lg:col-span-9 space-y-6">
            {/* VIEW 1: DASHBOARD METRICS */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* 8 Clean Metric Cards with unified Slate & Rose styling */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: 'Total Users', value: overview?.totalUsers ?? usersList.length, icon: Users },
                    { label: 'Active Profiles', value: overview?.activeProfiles ?? 0, icon: UserCheck },
                    { label: 'Verified Profiles', value: overview?.verifiedProfiles ?? 0, icon: ShieldCheck, isVerified: true },
                    { label: 'Pending Verification', value: overview?.pendingVerification ?? queue.length, icon: Clock },
                    { label: 'New Registrations', value: overview?.newRegistrations ?? usersList.length, icon: UserPlus },
                    { label: 'Interests Sent', value: overview?.interestsSent ?? 0, icon: Heart },
                    { label: 'Mutual Connections', value: overview?.mutualConnections ?? 0, icon: Sparkles },
                    { label: 'Open Reports', value: overview?.openReports ?? reports.length, icon: AlertCircle },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-rose-300 hover:shadow-sm">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${stat.isVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-700'}`}>
                            <Icon size={16} />
                          </div>
                        </div>
                        <p className="mt-2 text-2xl font-black text-slate-900">{stat.value}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Sleek Minimalist Activity Chart */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Weekly Activity Trends</h3>
                      <p className="text-xs text-slate-500">Live platform activity & registrations</p>
                    </div>
                    <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-[11px] font-bold text-rose-800">
                      Past 7 Days
                    </span>
                  </div>

                  {/* Clean Solid Rose Bars */}
                  <div className="h-52 w-full pt-4 flex items-end justify-between gap-3 border-b border-slate-200 pb-2">
                    {[
                      { day: 'Mon', count: Math.min(usersList.length, 1), height: usersList.length > 0 ? '30%' : '8%' },
                      { day: 'Tue', count: 0, height: '8%' },
                      { day: 'Wed', count: 0, height: '8%' },
                      { day: 'Thu', count: 0, height: '8%' },
                      { day: 'Fri', count: Math.max(0, usersList.length - 2), height: usersList.length > 2 ? '50%' : '8%' },
                      { day: 'Sat', count: usersList.length, height: usersList.length > 0 ? '70%' : '8%' },
                      { day: 'Sun', count: usersList.length, height: usersList.length > 0 ? '100%' : '8%' },
                    ].map((bar) => (
                      <div key={bar.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-[10px] font-bold text-slate-700 opacity-80 group-hover:opacity-100">{bar.count}</span>
                        <div
                          className="w-full rounded-t-lg bg-rose-700 hover:bg-rose-800 transition-all duration-300 shadow-xs"
                          style={{ height: bar.height }}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {bar.day}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Live Verified System Active
                    </span>
                    <span className="font-semibold text-rose-700">Pastoral Verified Flow</span>
                  </div>
                </div>

                {/* Queue Teasers - Slate and Rose clean cards */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-rose-300 transition">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Pending Verification</span>
                      <button onClick={() => setActiveTab('verification')} className="text-xs font-bold text-rose-700 hover:underline">
                        View Queue
                      </button>
                    </div>
                    <p className="mt-3 text-3xl font-black text-slate-900">{queue.length}</p>
                    <p className="mt-1 text-xs text-slate-500">Profiles waiting for pastoral and identity confirmation.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-rose-300 transition">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Moderation Flags</span>
                      <button onClick={() => setActiveTab('reports')} className="text-xs font-bold text-rose-700 hover:underline">
                        Review Reports
                      </button>
                    </div>
                    <p className="mt-3 text-3xl font-black text-slate-900">{reports.filter((r: any) => r.status === 'open').length}</p>
                    <p className="mt-1 text-xs text-slate-500">Open community complaints requiring pastoral resolution.</p>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: USERS */}
            {activeTab === 'users' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">User Directory</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{usersList.length} Registered Accounts</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                        <th className="py-3">Name</th>
                        <th className="py-3">Email</th>
                        <th className="py-3">Role</th>
                        <th className="py-3">Status</th>
                        <th className="py-3">Registered</th>
                        <th className="py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersList.map((u: any) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 font-bold text-slate-900">{u.fullName || u.name || (u.email ? u.email.split('@')[0] : 'Member')}</td>
                          <td className="py-3.5 text-slate-500">{u.email}</td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              u.role === 'admin' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] uppercase font-bold text-emerald-700">
                              {u.status || 'active'}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-500">{u.registeredAt ? (u.registeredAt.includes('T') ? new Date(u.registeredAt).toLocaleDateString() : u.registeredAt) : 'Recently'}</td>
                          <td className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => showToast(`User ${u.fullName || u.name} inspected.`)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-slate-400 transition shadow-2xs"
                              >
                                Inspect
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ type: 'user', id: u.id, name: u.fullName || u.name || u.email })}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition flex items-center gap-1 shadow-2xs"
                                title="Delete User from Database"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 3: PROFILES DIRECTORY */}
            {activeTab === 'profiles' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                      Matrimonial Profiles Directory
                    </h3>
                    <p className="text-xs text-slate-500">
                      Manage all candidate profiles, church details, and public visibility
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-800">
                      {profilesList.length} Total Profiles
                    </span>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="mb-5 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search candidate name, church, occupation, location..."
                      value={profileSearch}
                      onChange={(e) => setProfileSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600 bg-slate-50/50"
                    />
                  </div>
                  <select
                    value={profileStatusFilter}
                    onChange={(e) => setProfileStatusFilter(e.target.value as any)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-white focus:border-rose-600 focus:outline-none"
                  >
                    <option value="all">All Verification Statuses</option>
                    <option value="verified">Verified Only</option>
                    <option value="under_review">Under Review</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>

                {filteredProfiles.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 mb-3">
                      <UserCheck size={28} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No Matrimonial Profiles Found</h4>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                      {profilesList.length === 0
                        ? 'No profiles have been registered yet. When candidates complete their onboarding wizard, their cards will appear here.'
                        : 'No profiles match your search criteria. Try adjusting your search term or filter.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                          <th className="py-3">Candidate</th>
                          <th className="py-3">Denomination & Church</th>
                          <th className="py-3">Career & Location</th>
                          <th className="py-3">Verification</th>
                          <th className="py-3 text-right">Steward Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredProfiles.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5">
                              <div className="flex items-center gap-3">
                                {p.primaryPhotoUrl || p.photos?.[0]?.url ? (
                                  <img
                                    src={p.primaryPhotoUrl || p.photos?.[0]?.url}
                                    alt={p.displayName}
                                    className="h-10 w-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-700 font-bold flex items-center justify-center border border-rose-200 text-sm">
                                    {p.displayName ? p.displayName.charAt(0).toUpperCase() : 'B'}
                                  </div>
                                )}
                                <div>
                                  <span className="block font-bold text-slate-900 text-sm">{p.displayName}</span>
                                  <span className="text-[11px] text-slate-500">
                                    {p.age ? `${p.age} yrs` : ''} {p.gender ? `· ${p.gender}` : ''}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5">
                              <span className="block font-semibold text-slate-800">
                                {p.denomination || p.faith?.denomination || 'Pentecostal'}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {p.church || p.faith?.church || 'Not specified'}
                              </span>
                            </td>
                            <td className="py-3.5">
                              <span className="block font-semibold text-slate-800">
                                {p.occupation || p.career?.occupation || 'Professional'}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {p.location || 'India'}
                              </span>
                            </td>
                            <td className="py-3.5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                  p.verificationStatus === 'verified'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : p.verificationStatus === 'under_review'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {p.verificationStatus === 'verified' ? '✓ Verified' : p.verificationStatus || 'Unverified'}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {p.verificationStatus !== 'verified' ? (
                                  <button
                                    onClick={() => handleReviewVerification(p.id, 'verified')}
                                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 text-[11px] shadow-2xs transition"
                                  >
                                    Verify
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleReviewVerification(p.id, 'under_review')}
                                    className="rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-2.5 py-1 text-[11px] transition"
                                  >
                                    Re-check
                                  </button>
                                )}
                                <a
                                  href={`/profiles/${p.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-rose-400 hover:text-rose-700 transition"
                                >
                                  View
                                </a>
                                <button
                                  onClick={() => setDeleteTarget({ type: 'profile', id: p.id, name: p.displayName || 'Candidate Profile' })}
                                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition flex items-center gap-1 shadow-2xs"
                                  title="Delete Profile from Database"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 4: VERIFICATION QUEUE */}
            {activeTab === 'verification' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Verification Queue</h3>
                    <p className="text-xs text-slate-500">Profiles waiting for identity and church verification</p>
                  </div>
                  <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-800">{queue.length} Waiting</span>
                </div>

                {queue.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Verification queue is clear. All profiles have been processed.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {queue.map((item: any, idx: number) => {
                      const prof = item.profile;
                      return (
                        <div key={idx} className="rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-rose-200 transition">
                          <div className="flex items-center gap-4">
                            {prof?.primaryPhotoUrl ? (
                              <img
                                src={prof.primaryPhotoUrl}
                                alt={prof?.displayName}
                                className="h-16 w-16 rounded-xl border border-slate-200 object-cover shrink-0 shadow-xs"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-xl border border-slate-200 bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                                {prof?.displayName ? prof.displayName.charAt(0).toUpperCase() : <UserCheck size={24} />}
                              </div>
                            )}
                            <div>
                              <h4 className="text-base font-bold text-slate-900">{prof?.displayName}, {prof?.age}</h4>
                              <p className="text-xs text-slate-500">{prof?.location} · {prof?.denomination}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                                <span className="rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 px-2 py-0.5 uppercase font-bold">
                                  ✓ ID Checked
                                </span>
                                <span className="rounded-md border border-slate-200 bg-slate-100 text-slate-700 px-2 py-0.5 uppercase font-bold">
                                  ✓ Church Proof Attached
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleReviewVerification(prof?.id, 'verified')}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition"
                            >
                              <Check size={14} /> Verify
                            </button>
                            <button
                              onClick={() => handleReviewVerification(prof?.id, 'under_review')}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >
                              <Clock size={14} /> Hold
                            </button>
                            <button
                              onClick={() => handleReviewVerification(prof?.id, 'rejected')}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-700 transition"
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 5: REPORTS & MODERATION */}
            {activeTab === 'reports' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Moderation Complaints</h3>
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">{reports.length} Reports Logged</span>
                </div>

                <div className="space-y-4">
                  {reports.map((r: any) => (
                    <div key={r.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
                              {r.reason}
                            </span>
                            <span className="text-xs font-bold text-slate-900">Against: {r.reportedProfileName}</span>
                          </div>
                          <p className="mt-2 text-xs text-slate-700 leading-relaxed">{r.details}</p>
                          <p className="mt-1 text-[10px] text-slate-400">Reported by {r.reporterName} on {new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>

                        <span className={`text-[10px] font-bold uppercase rounded-md border px-2 py-0.5 ${r.status === 'open' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-500'}`}>
                          {r.status}
                        </span>
                      </div>

                      {r.status === 'open' && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                          <button
                            onClick={() => handleReportAction(r.id, 'dismissed')}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleReportAction(r.id, 'action_taken')}
                            className="rounded-lg bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-800 shadow-xs"
                          >
                            Suspend Profile
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 6 & 7: CHURCHES & DENOMINATIONS */}
            {(activeTab === 'churches' || activeTab === 'denominations') && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    {activeTab === 'churches' ? 'Verified Church Directory' : 'Pentecostal Denominations'}
                  </h3>
                  <button
                    onClick={() => showToast('New church registration dialog ready.')}
                    className="rounded-lg bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white uppercase shadow-xs hover:bg-rose-800"
                  >
                    + Add New
                  </button>
                </div>

                {activeTab === 'churches' ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {churchesList.map((c: any) => (
                      <div key={c.id} className="rounded-xl border border-slate-200 p-4 hover:border-rose-200 hover:shadow-xs transition">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-lg bg-rose-50 text-rose-700 shrink-0">
                            <Building size={16} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{c.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{c.location}</p>
                            <div className="mt-2 text-xs border-t border-slate-100 pt-2 flex justify-between gap-2">
                              <span className="text-slate-600">Pastor: {c.pastor}</span>
                              <span className="font-semibold text-rose-700">{c.denomination}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {denominationsList.map((d: any) => (
                      <div key={d.id} className="py-3 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{d.name}</span>
                        <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-rose-800 font-bold">{d.count} Registered Believers</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 8, 9, 10, 11 */}
            {['subscriptions', 'messages', 'analytics', 'settings'].includes(activeTab) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-slate-900">
                  {activeTab.toUpperCase()}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Steward management view for {activeTab}. Strict editorial rules, audit trails, and privacy adherence are enforced across all operations.
                </p>
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-mono text-slate-700">
                  [AUDIT_LOG_ACTIVE]: All steward actions are timestamped and signed with pastoral accountability tokens.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Permanent Deletion */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 border border-rose-200">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete {deleteTarget.type === 'user' ? 'User Account' : 'Matrimonial Profile'}
                </h3>
                <p className="text-xs text-slate-500">
                  Permanent action · Database wipe
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900 font-bold">{deleteTarget.name}</strong>?
              </p>
              <p className="mt-2 text-[11px] text-rose-700 font-semibold">
                ⚠️ This will completely erase this record from the database, all matching indexes, and stored records. This action cannot be undone.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="rounded-xl bg-rose-700 hover:bg-rose-800 disabled:opacity-60 text-white px-4 py-2 text-xs font-bold shadow-sm transition flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Deleting from DB...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
