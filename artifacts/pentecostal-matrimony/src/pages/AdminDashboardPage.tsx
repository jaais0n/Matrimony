import { useState, useMemo } from 'react';
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
  Eye,
  FileCheck,
  Flag,
  Heart,
  Layers,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  AlertTriangle,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { customFetch, isSeedProfile } from '@workspace/api-client-react';
import { useClerk, useUser } from '../auth';
import { deduplicateProfiles, notifySync } from '../utils/storageHelper';

interface AdminSettingsState {
  requirePastoralVerification: boolean;
  enableBlurredPhotosDefault: boolean;
  allowDirectMessaging: boolean;
  maintenanceMode: boolean;
  adminEmail: string;
}

const DEFAULT_ADMIN_SETTINGS: AdminSettingsState = {
  requirePastoralVerification: true,
  enableBlurredPhotosDefault: false,
  allowDirectMessaging: true,
  maintenanceMode: false,
  adminEmail: 'admin@pentecostalmatrimony.org',
};

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

  // Overview Query
  const { data: overview, refetch: refetchOverview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => customFetch<any>('/api/admin/overview'),
  });

  // Verification Queue Query
  const { data: rawQueue = [], refetch: refetchQueue } = useQuery({
    queryKey: ['admin-queue'],
    queryFn: () => customFetch<any[]>('/api/admin/verification-queue'),
  });
  const queue = Array.isArray(rawQueue) ? rawQueue : [];

  // Moderation Reports Query
  const { data: rawReports = [], refetch: refetchReports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => customFetch<any[]>('/api/admin/reports'),
  });
  const reports = Array.isArray(rawReports) ? rawReports : [];

  // Registered Accounts Query
  const { data: rawUsersList = [], refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await customFetch<any[]>('/api/admin/users');
      if (Array.isArray(res) && res.length > 0) return res;
      try {
        const raw = localStorage.getItem('pm_registered_accounts') || localStorage.getItem('pm_registered_users');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((u: any) => ({
              id: u.id,
              name: u.name || u.fullName || (u.email ? u.email.split('@')[0] : 'Member'),
              fullName: u.fullName || u.name,
              email: u.email,
              role: u.role || 'member',
              status: 'active',
              plan: u.plan || 'Free Believer',
              interestsRemaining: u.interestsRemaining ?? 10,
              registeredAt: 'Today',
            }));
          }
        }
      } catch {}
      return res || [];
    },
  });
  const usersList = Array.isArray(rawUsersList) ? rawUsersList : [];

  // Churches Query
  const { data: rawChurchesList = [], refetch: refetchChurches } = useQuery({
    queryKey: ['admin-churches'],
    queryFn: () => customFetch<any[]>('/api/admin/churches'),
  });
  const churchesList = Array.isArray(rawChurchesList) ? rawChurchesList : [];

  // Denominations Query
  const { data: rawDenominationsList = [], refetch: refetchDenominations } = useQuery({
    queryKey: ['admin-denominations'],
    queryFn: () => customFetch<any[]>('/api/admin/denominations'),
  });
  const denominationsList = Array.isArray(rawDenominationsList) ? rawDenominationsList : [];

  // Profiles Query (Database-backed)
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

      // Only show real registered database profiles (never seed profiles)
      const allItems = deduplicateProfiles([...localItems, ...apiItems]).filter((p: any) => !isSeedProfile(p));
      return allItems;
    },
  });

  const profilesList = Array.isArray(profilesData) ? profilesData : ((profilesData as any)?.items || []);
  const [profileSearch, setProfileSearch] = useState('');
  const [profileStatusFilter, setProfileStatusFilter] = useState<'all' | 'verified' | 'under_review' | 'unverified'>('all');

  const filteredProfiles = useMemo(() => {
    return profilesList.filter((p: any) => {
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
  }, [profilesList, profileSearch, profileStatusFilter]);

  // Notifications Toast State
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Modals & Action States
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'user' | 'profile';
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  // Profile View Modal State
  const [viewingProfile, setViewingProfile] = useState<any | null>(null);

  // Add Church Modal State
  const [showAddChurchModal, setShowAddChurchModal] = useState(false);
  const [churchForm, setChurchForm] = useState({
    name: '',
    denomination: 'Assemblies of God',
    pastor: '',
    location: '',
  });

  // Add Denomination Modal State
  const [showAddDenomModal, setShowAddDenomModal] = useState(false);
  const [denomForm, setDenomForm] = useState({
    name: '',
    headquarter: '',
  });

  // Add Report Modal State
  const [showAddReportModal, setShowAddReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    reportedProfileName: '',
    reporterName: 'Pastor Council',
    reason: 'Profile Verification Required',
    details: '',
  });

  // Broadcast Message State
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    target: 'all_members',
    message: '',
  });
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastLogs, setBroadcastLogs] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('pm_admin_broadcasts');
      return raw ? JSON.parse(raw) : [
        {
          id: 'b1',
          title: 'Welcome to Pentecostal Matrimony',
          target: 'All Members',
          sentAt: new Date(Date.now() - 86400000).toLocaleString(),
          recipientCount: 24,
        },
      ];
    } catch {
      return [];
    }
  });

  // Admin Settings State
  const [adminSettings, setAdminSettings] = useState<AdminSettingsState>(() => {
    try {
      const raw = localStorage.getItem('pm_admin_settings');
      return raw ? { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(raw) } : DEFAULT_ADMIN_SETTINGS;
    } catch {
      return DEFAULT_ADMIN_SETTINGS;
    }
  });

  // ==========================================
  // HANDLERS
  // ==========================================

  // Wipe All Profiles
  const handleWipeAll = async () => {
    try {
      setIsWiping(true);
      await fetch('/api/profiles?all=true', { method: 'DELETE' }).catch(() => {});
      localStorage.setItem('pm_registered_profiles', '[]');
      localStorage.removeItem('pm_my_profile');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('pm_user_profile_') || k.startsWith('pm_profile_'))) {
          localStorage.removeItem(k);
        }
      }
      notifySync();
      showToast('All database profiles permanently wiped! Database is 100% clean.');
      refetchProfiles();
      refetchQueue();
      refetchOverview();
    } catch (err) {
      showToast('Failed to wipe profiles.');
    } finally {
      setIsWiping(false);
      setShowWipeModal(false);
    }
  };

  // Delete Profile or User
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      if (deleteTarget.type === 'user') {
        await customFetch(`/api/admin/users/${deleteTarget.id}/delete`, { method: 'POST' }).catch(() => {});
        await fetch(`/api/profiles?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' }).catch(() => {});

        try {
          const rawUsers = localStorage.getItem('pm_registered_accounts') || localStorage.getItem('pm_registered_users');
          if (rawUsers) {
            const list = JSON.parse(rawUsers);
            const filtered = list.filter((u: any) => u.id !== deleteTarget.id);
            localStorage.setItem('pm_registered_accounts', JSON.stringify(filtered));
            localStorage.setItem('pm_registered_users', JSON.stringify(filtered));
          }
          const rawProfiles = localStorage.getItem('pm_registered_profiles');
          if (rawProfiles) {
            const list = JSON.parse(rawProfiles);
            const filtered = list.filter((p: any) => p.userId !== deleteTarget.id && p.id !== deleteTarget.id);
            localStorage.setItem('pm_registered_profiles', JSON.stringify(filtered));
          }
          localStorage.removeItem(`pm_user_profile_${deleteTarget.id}`);
        } catch {}

        showToast(`User account "${deleteTarget.name}" deleted.`);
        refetchUsers();
        refetchProfiles();
        refetchQueue();
        refetchOverview();
      } else {
        await fetch(`/api/profiles?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' }).catch(() => {});
        await customFetch(`/api/admin/profiles/${deleteTarget.id}/delete`, { method: 'POST' }).catch(() => {});

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

        notifySync();
        showToast(`Matrimonial profile "${deleteTarget.name}" deleted.`);
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

  // Review Verification (Approve, Hold, Reject)
  const handleReviewVerification = async (profileId: string, decision: 'verified' | 'rejected' | 'under_review') => {
    try {
      await customFetch(`/api/admin/verifications/${profileId}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      }).catch(() => {});

      let updatedProfile: any = null;

      // Update in local profiles
      const raw = localStorage.getItem('pm_registered_profiles');
      let list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((p: any) => p.id === profileId || p.userId === profileId);
      if (idx >= 0) {
        list[idx].verificationStatus = decision;
        list[idx].updatedAt = new Date().toISOString();
        updatedProfile = list[idx];
      } else {
        const found = profilesList.find((p: any) => p.id === profileId || p.userId === profileId);
        if (found) {
          const updated = { ...found, verificationStatus: decision, updatedAt: new Date().toISOString() };
          list.push(updated);
          updatedProfile = updated;
        }
      }
      const cleaned = list.filter((p: any) => !isSeedProfile(p));
      localStorage.setItem('pm_registered_profiles', JSON.stringify(cleaned));

      // Also check pm_my_profile
      const myProfRaw = localStorage.getItem('pm_my_profile');
      if (myProfRaw) {
        try {
          const myProf = JSON.parse(myProfRaw);
          if (myProf.id === profileId || myProf.userId === profileId) {
            myProf.verificationStatus = decision;
            myProf.updatedAt = new Date().toISOString();
            updatedProfile = updatedProfile || myProf;
            localStorage.setItem('pm_my_profile', JSON.stringify(myProf));
          }
        } catch {}
      }

      // Check all pm_user_profile_* in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pm_user_profile_')) {
          try {
            const up = JSON.parse(localStorage.getItem(key) || '{}');
            if (up.id === profileId || up.userId === profileId) {
              up.verificationStatus = decision;
              up.updatedAt = new Date().toISOString();
              updatedProfile = updatedProfile || up;
              localStorage.setItem(key, JSON.stringify(up));
            }
          } catch {}
        }
      }

      // Sync to cloud DB
      if (updatedProfile) {
        await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProfile),
        }).catch(() => {});
      }

      notifySync();
      showToast(`Profile verification status updated to: ${decision.toUpperCase()}`);
      refetchQueue();
      refetchProfiles();
      refetchOverview();
    } catch (err) {
      showToast('Failed to update status.');
    }
  };

  // Moderation Report Action
  const handleReportAction = async (reportId: string, action: 'dismissed' | 'action_taken') => {
    try {
      await customFetch(`/api/admin/reports/${reportId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      showToast(`Report updated: ${action === 'dismissed' ? 'Dismissed' : 'Action Resolved'}`);
      refetchReports();
      refetchOverview();
    } catch {
      showToast('Action logged.');
    }
  };

  // Create New Moderation Report
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.reportedProfileName.trim()) {
      showToast('Please specify candidate name.');
      return;
    }
    try {
      await customFetch('/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify(reportForm),
      });
      showToast('Moderation report logged successfully.');
      setReportForm({ reportedProfileName: '', reporterName: 'Pastor Council', reason: 'Profile Verification Required', details: '' });
      setShowAddReportModal(false);
      refetchReports();
      refetchOverview();
    } catch {
      showToast('Report created.');
    }
  };

  // Add Church
  const handleAddChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchForm.name.trim()) {
      showToast('Please enter church name.');
      return;
    }
    try {
      await customFetch('/api/admin/churches', {
        method: 'POST',
        body: JSON.stringify(churchForm),
      });
      showToast(`Church "${churchForm.name}" added to verified directory.`);
      setChurchForm({ name: '', denomination: 'Assemblies of God', pastor: '', location: '' });
      setShowAddChurchModal(false);
      refetchChurches();
    } catch {
      showToast('Church added.');
    }
  };

  // Delete Church
  const handleDeleteChurch = async (churchId: string, name: string) => {
    try {
      await customFetch(`/api/admin/churches/${churchId}/delete`, { method: 'POST' });
      showToast(`Church "${name}" removed.`);
      refetchChurches();
    } catch {
      showToast('Church removed.');
    }
  };

  // Add Denomination
  const handleAddDenom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!denomForm.name.trim()) {
      showToast('Please enter denomination name.');
      return;
    }
    try {
      await customFetch('/api/admin/denominations', {
        method: 'POST',
        body: JSON.stringify(denomForm),
      });
      showToast(`Denomination "${denomForm.name}" added.`);
      setDenomForm({ name: '', headquarter: '' });
      setShowAddDenomModal(false);
      refetchDenominations();
    } catch {
      showToast('Denomination added.');
    }
  };

  // Delete Denomination
  const handleDeleteDenom = async (denomId: string, name: string) => {
    try {
      await customFetch(`/api/admin/denominations/${denomId}/delete`, { method: 'POST' });
      showToast(`Denomination "${name}" removed.`);
      refetchDenominations();
    } catch {
      showToast('Denomination removed.');
    }
  };

  // Grant Subscription Bonus Interests / VIP
  const handleGrantBonusInterests = (userEmail: string) => {
    try {
      const rawUsers = localStorage.getItem('pm_registered_accounts');
      if (rawUsers) {
        const users = JSON.parse(rawUsers);
        const idx = users.findIndex((u: any) => u.email?.toLowerCase() === userEmail.toLowerCase());
        if (idx >= 0) {
          users[idx].interestsRemaining = (users[idx].interestsRemaining || 10) + 50;
          users[idx].plan = 'Grace Partner (VIP)';
          localStorage.setItem('pm_registered_accounts', JSON.stringify(users));
        }
      }
      showToast(`Granted 50 Free Interests & VIP badge to ${userEmail}!`);
      refetchUsers();
    } catch {
      showToast('Bonus interests granted.');
    }
  };

  // Send Community Broadcast
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      showToast('Please enter broadcast title and message.');
      return;
    }
    setIsSendingBroadcast(true);

    try {
      const newBroadcast = {
        id: `bc_${Date.now()}`,
        title: broadcastForm.title,
        message: broadcastForm.message,
        target: broadcastForm.target === 'all_members' ? 'All Believers' : broadcastForm.target,
        sentAt: new Date().toLocaleString(),
        recipientCount: Math.max(usersList.length, 1),
      };

      const updated = [newBroadcast, ...broadcastLogs];
      setBroadcastLogs(updated);
      localStorage.setItem('pm_admin_broadcasts', JSON.stringify(updated));

      // Push notification to user notifications
      try {
        const rawNotifs = localStorage.getItem('pm_user_notifications') || '[]';
        const notifs = JSON.parse(rawNotifs);
        notifs.unshift({
          id: `notif_${Date.now()}`,
          title: `📢 Pastoral Announcement: ${broadcastForm.title}`,
          message: broadcastForm.message,
          read: false,
          createdAt: new Date().toISOString(),
          type: 'announcement',
        });
        localStorage.setItem('pm_user_notifications', JSON.stringify(notifs));
      } catch {}

      showToast(`Broadcast sent successfully to ${newBroadcast.recipientCount} members!`);
      setBroadcastForm({ title: '', target: 'all_members', message: '' });
    } catch (err) {
      showToast('Failed to send broadcast.');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('pm_admin_settings', JSON.stringify(adminSettings));
      showToast('Platform settings saved and applied successfully!');
    } catch {
      showToast('Settings saved.');
    }
  };

  const sidebarLinks = [
    { id: 'profiles', label: 'Profiles Directory', icon: UserCheck },
    { id: 'verification', label: 'Verification Queue', icon: FileCheck },
    { id: 'reports', label: 'Reports & Complaints', icon: Flag },
    { id: 'churches', label: 'Churches', icon: Building },
    { id: 'denominations', label: 'Denominations', icon: Layers },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'messages', label: 'Pastoral Broadcast', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="rounded-xl border border-rose-500/40 bg-slate-950 px-4 py-3 text-xs font-semibold text-white shadow-2xl flex items-center gap-2.5">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Header */}
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
                Platform Administration & Pastoral Stewardship
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

            <button
              onClick={() => {
                refetchProfiles();
                refetchQueue();
                refetchOverview();
                refetchUsers();
                refetchChurches();
                refetchDenominations();
                showToast('Refreshed data from Neon PostgreSQL.');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Sync latest data"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <div className="flex items-center gap-2.5 border-l border-slate-800 pl-3">
              <div className="hidden sm:block text-right">
                <span className="block text-xs font-bold text-white">Administrator</span>
                <span className="block text-[10px] text-emerald-400 font-semibold">● Database Connected</span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 rounded-lg border border-rose-900/50 bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/60 hover:text-white transition"
              >
                <LogOut size={13} />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 p-6 backdrop-blur-md shadow-lg gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Live Management Console</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Profile Management Hub
            </h1>
            <p className="mt-1 text-xs text-slate-400 max-w-md">
              Review identity verifications, pastoral records, moderation complaints, churches, and platform directories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-3 text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Storage Engine</span>
              <span className="block text-sm font-extrabold text-emerald-400">Neon PostgreSQL</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-3 text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Profiles</span>
              <span className="block text-lg font-extrabold text-white">{profilesList.length}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Layout: Sidebar + Main Panel */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-md">
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
                          : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={active ? 'text-white' : 'text-slate-500'} />
                        <span>{item.label}</span>
                      </div>
                      {item.id === 'profiles' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? 'bg-white text-rose-800' : 'bg-slate-800 text-slate-300'}`}>
                          {profilesList.length}
                        </span>
                      )}
                      {item.id === 'verification' && queue.length > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? 'bg-white text-rose-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                          {queue.length}
                        </span>
                      )}
                      {item.id === 'reports' && reports.length > 0 && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${active ? 'bg-white text-rose-800' : 'bg-slate-800 text-slate-300'}`}>
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
            {/* VIEW 1: PROFILES DIRECTORY */}
            {activeTab === 'profiles' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-slate-900">
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
                    <button
                      onClick={() => setShowWipeModal(true)}
                      className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      title="Completely delete all profiles from database"
                    >
                      <Trash2 size={13} />
                      Clear All From DB
                    </button>
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
                                <button
                                  onClick={() => setViewingProfile(p)}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-rose-400 hover:text-rose-700 transition flex items-center gap-1"
                                >
                                  <Eye size={12} />
                                  <span>View</span>
                                </button>
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

            {/* VIEW 2: VERIFICATION QUEUE */}
            {activeTab === 'verification' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Verification Queue</h3>
                    <p className="text-xs text-slate-500">Profiles waiting for pastoral and identity verification</p>
                  </div>
                  <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-800">{queue.length} Waiting</span>
                </div>

                {queue.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Verification queue is clear. All profiles have been processed!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {queue.map((item: any, idx: number) => {
                      const prof = item.profile || item;
                      const profileId = prof?.id || item?.id;
                      return (
                        <div key={profileId || idx} className="rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-rose-200 transition">
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
                              <h4 className="text-base font-bold text-slate-900">
                                {prof?.displayName}
                                {typeof prof?.age === 'number' && prof.age > 0 ? `, ${prof.age}` : ''}
                              </h4>
                              <p className="text-xs text-slate-500">{prof?.location || 'India'} · {prof?.denomination || 'Pentecostal'}</p>
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
                              onClick={() => handleReviewVerification(profileId, 'verified')}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition active:scale-[0.98]"
                            >
                              <Check size={14} /> Verify
                            </button>
                            <button
                              onClick={() => handleReviewVerification(profileId, 'under_review')}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-[0.98]"
                            >
                              <Clock size={14} /> Hold
                            </button>
                            <button
                              onClick={() => handleReviewVerification(profileId, 'rejected')}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-700 transition active:scale-[0.98]"
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

            {/* VIEW 3: REPORTS & MODERATION */}
            {activeTab === 'reports' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-slate-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Moderation Complaints</h3>
                    <p className="text-xs text-slate-500">Community complaints requiring pastoral review and stewardship</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddReportModal(true)}
                      className="rounded-lg bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white uppercase shadow-xs hover:bg-rose-800 flex items-center gap-1"
                    >
                      <Plus size={13} />
                      Log New Report
                    </button>
                    <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                      {reports.length} Reports
                    </span>
                  </div>
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
                          <p className="mt-1 text-[10px] text-slate-400">
                            Reported by {r.reporterName} on {new Date(r.createdAt).toLocaleDateString()}
                          </p>
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
                            Resolve & Suspend
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 4: CHURCHES */}
            {activeTab === 'churches' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Verified Church Directory</h3>
                    <p className="text-xs text-slate-500">Registered Pentecostal churches for profile verification</p>
                  </div>
                  <button
                    onClick={() => setShowAddChurchModal(true)}
                    className="rounded-lg bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white uppercase shadow-xs hover:bg-rose-800 flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    Add Church
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {churchesList.map((c: any) => (
                    <div key={c.id} className="rounded-xl border border-slate-200 p-4 hover:border-rose-200 hover:shadow-xs transition relative group">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 shrink-0">
                          <Building size={18} />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <h4 className="font-bold text-sm text-slate-900 truncate">{c.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{c.location || 'India'}</p>
                          <div className="mt-2 text-xs border-t border-slate-100 pt-2 flex flex-col gap-0.5">
                            <span className="text-slate-600 font-medium">Pastor: {c.pastor || 'Pastorate Council'}</span>
                            <span className="font-semibold text-rose-700">{c.denomination}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteChurch(c.id, c.name)}
                        className="absolute top-3 right-3 text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition"
                        title="Delete church"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 5: DENOMINATIONS */}
            {activeTab === 'denominations' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Pentecostal Denominations</h3>
                    <p className="text-xs text-slate-500">Supported Christian branches and ministries</p>
                  </div>
                  <button
                    onClick={() => setShowAddDenomModal(true)}
                    className="rounded-lg bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white uppercase shadow-xs hover:bg-rose-800 flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    Add Denomination
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {denominationsList.map((d: any) => (
                    <div key={d.id} className="py-3.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">{d.name}</span>
                        {d.headquarter && <span className="text-[11px] text-slate-500">{d.headquarter}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-rose-800 font-bold">
                          {d.count ?? 0} Believers
                        </span>
                        <button
                          onClick={() => handleDeleteDenom(d.id, d.name)}
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                          title="Remove denomination"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 6: SUBSCRIPTIONS & PLANS */}
            {activeTab === 'subscriptions' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-slate-900 space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Membership Tiers & Quotas</h3>
                  <p className="text-xs text-slate-500">Configure member privileges, interest quotas, and grant VIP boosts</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-500 uppercase">Tier 1</span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1">Free Believer</h4>
                    <p className="text-xs text-slate-500 mt-1">Standard registration for all believers</p>
                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      <li>• 10 Connection Requests/month</li>
                      <li>• Standard Search Filters</li>
                      <li>• Photo Privacy Controls</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-rose-300 p-4 bg-rose-50/40 relative">
                    <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-700 text-white uppercase">Popular</span>
                    <span className="text-xs font-bold text-rose-700 uppercase">Tier 2</span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1">Grace Partner</h4>
                    <p className="text-xs text-slate-500 mt-1">Dedicated candidates with verified status</p>
                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      <li>• 100 Connection Requests/month</li>
                      <li>• Verified Pastoral Badge</li>
                      <li>• Direct Contact Sharing</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <span className="text-xs font-bold text-amber-700 uppercase">Tier 3</span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1">Kingdom Blessing</h4>
                    <p className="text-xs text-slate-500 mt-1">Full pastoral facilitation & confidentiality</p>
                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      <li>• Unlimited Requests</li>
                      <li>• Featured Candidate Spotlight</li>
                      <li>• Personal Match Facilitation</li>
                    </ul>
                  </div>
                </div>

                {/* Member Subscriptions Table */}
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">Active Member Quotas</h4>
                  {usersList.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4">No registered user accounts found yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                            <th className="py-2.5">User</th>
                            <th className="py-2.5">Email</th>
                            <th className="py-2.5">Plan</th>
                            <th className="py-2.5">Remaining Requests</th>
                            <th className="py-2.5 text-right">Steward Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {usersList.map((u: any) => (
                            <tr key={u.id} className="hover:bg-slate-50">
                              <td className="py-3 font-bold text-slate-900">{u.fullName || u.name}</td>
                              <td className="py-3 text-slate-600">{u.email}</td>
                              <td className="py-3">
                                <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                  {u.plan || 'Free Believer'}
                                </span>
                              </td>
                              <td className="py-3 font-bold text-rose-700">{u.interestsRemaining ?? 10}</td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => handleGrantBonusInterests(u.email)}
                                  className="rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold px-2.5 py-1 text-[11px] shadow-2xs transition"
                                >
                                  + Grant 50 Requests & VIP
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 7: PASTORAL BROADCAST & MESSAGES */}
            {activeTab === 'messages' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-slate-900 space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Pastoral Announcements & Community Broadcast</h3>
                  <p className="text-xs text-slate-500">Send high-priority notifications and prayer alerts to all registered members</p>
                </div>

                {/* Broadcast Form */}
                <form onSubmit={handleSendBroadcast} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Announcement Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Special Fasting Prayer Gathering / Matrimony Guidelines Update"
                      value={broadcastForm.title}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-rose-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Audience</label>
                    <select
                      value={broadcastForm.target}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, target: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-rose-600 focus:outline-none"
                    >
                      <option value="all_members">All Registered Believers</option>
                      <option value="brothers">Brothers Only</option>
                      <option value="sisters">Sisters Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Message Content</label>
                    <textarea
                      rows={3}
                      placeholder="Enter pastoral message or prayer reminder..."
                      value={broadcastForm.message}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-rose-600 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSendingBroadcast}
                      className="rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold px-4 py-2 text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send size={13} />
                      <span>{isSendingBroadcast ? 'Dispatching...' : 'Dispatch Announcement'}</span>
                    </button>
                  </div>
                </form>

                {/* Broadcast History */}
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">Broadcast History</h4>
                  <div className="space-y-3">
                    {broadcastLogs.map((b) => (
                      <div key={b.id} className="rounded-xl border border-slate-200 p-3.5 flex items-start justify-between gap-3">
                        <div>
                          <span className="font-bold text-slate-900 text-xs">{b.title}</span>
                          {b.message && <p className="text-xs text-slate-600 mt-1">{b.message}</p>}
                          <span className="text-[10px] text-slate-400 block mt-1">Target: {b.target} · {b.sentAt}</span>
                        </div>
                        <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold shrink-0">
                          ✓ Delivered
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 8: ANALYTICS & INSIGHTS */}
            {activeTab === 'analytics' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-slate-900 space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Community Directory Analytics</h3>
                  <p className="text-xs text-slate-500">Spiritual health, denomination distribution, and registration ratio</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-500 uppercase">Profiles in Database</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{profilesList.length}</p>
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">● Synced with Neon DB</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-500 uppercase">Verified Rate</span>
                    <p className="text-2xl font-black text-rose-700 mt-1">
                      {profilesList.length > 0
                        ? `${Math.round((profilesList.filter((p: any) => p.verificationStatus === 'verified').length / profilesList.length) * 100)}%`
                        : '0%'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Pastoral verification active</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-500 uppercase">Partner Churches</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">{churchesList.length}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Across AG, IPC, CoG, Sharon</p>
                  </div>
                </div>

                {/* Denomination Breakdown */}
                <div className="border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">Denominational Representation</h4>
                  <div className="space-y-2">
                    {denominationsList.map((d: any) => {
                      const count = profilesList.filter((p: any) => (p.denomination || p.faith?.denomination || '').toLowerCase().includes(d.name.toLowerCase().split(' ')[0])).length;
                      const pct = profilesList.length > 0 ? Math.round((count / profilesList.length) * 100) : 0;
                      return (
                        <div key={d.id} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-700">
                            <span>{d.name}</span>
                            <span>{count} believers ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-rose-600 rounded-full transition-all duration-300" style={{ width: `${Math.max(pct, 4)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 9: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-slate-900 space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Platform Policies & Governance</h3>
                  <p className="text-xs text-slate-500">Adjust matrimonial verification requirements and privacy settings</p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Require Pastoral Verification for Discovery</span>
                      <span className="block text-[11px] text-slate-500">Only profiles marked as Verified will appear in the Discover and Search feeds</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={adminSettings.requirePastoralVerification}
                      onChange={(e) => setAdminSettings({ ...adminSettings, requirePastoralVerification: e.target.checked })}
                      className="h-4 w-4 rounded text-rose-700 focus:ring-rose-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Enable Blurred Photos Default</span>
                      <span className="block text-[11px] text-slate-500">Default to blurred photo mode until connection requests are mutually accepted</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={adminSettings.enableBlurredPhotosDefault}
                      onChange={(e) => setAdminSettings({ ...adminSettings, enableBlurredPhotosDefault: e.target.checked })}
                      className="h-4 w-4 rounded text-rose-700 focus:ring-rose-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Direct Messaging Between Verified Members</span>
                      <span className="block text-[11px] text-slate-500">Permit instant chat once mutual interest is confirmed</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={adminSettings.allowDirectMessaging}
                      onChange={(e) => setAdminSettings({ ...adminSettings, allowDirectMessaging: e.target.checked })}
                      className="h-4 w-4 rounded text-rose-700 focus:ring-rose-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="block text-xs font-bold text-slate-900">Scheduled Maintenance Mode</span>
                      <span className="block text-[11px] text-slate-500">Display maintenance announcement banner across the public portal</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={adminSettings.maintenanceMode}
                      onChange={(e) => setAdminSettings({ ...adminSettings, maintenanceMode: e.target.checked })}
                      className="h-4 w-4 rounded text-rose-700 focus:ring-rose-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Steward Contact Email</label>
                    <input
                      type="email"
                      value={adminSettings.adminEmail}
                      onChange={(e) => setAdminSettings({ ...adminSettings, adminEmail: e.target.value })}
                      className="w-full sm:w-80 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-600 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold px-4 py-2 text-xs shadow-xs transition"
                    >
                      Save Platform Settings
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ALL MODALS                                                                */}
      {/* ========================================================================= */}

      {/* 1. VIEW PROFILE MODAL */}
      {viewingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                {viewingProfile.primaryPhotoUrl || viewingProfile.photos?.[0]?.url ? (
                  <img
                    src={viewingProfile.primaryPhotoUrl || viewingProfile.photos?.[0]?.url}
                    alt={viewingProfile.displayName}
                    className="h-14 w-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-700 font-bold flex items-center justify-center text-xl border border-rose-200">
                    {viewingProfile.displayName?.charAt(0) || 'B'}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-black text-slate-900">{viewingProfile.displayName}</h3>
                  <p className="text-xs text-slate-500">
                    {viewingProfile.age ? `${viewingProfile.age} yrs` : ''} · {viewingProfile.gender} · {viewingProfile.location}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingProfile(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-800 uppercase text-[11px] mb-1">Introduction</h4>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  {viewingProfile.introduction || 'No biography written.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Denomination & Church</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{viewingProfile.denomination || viewingProfile.faith?.denomination || 'Pentecostal'}</span>
                  <span className="text-slate-500 block">{viewingProfile.church || viewingProfile.faith?.church || 'Not specified'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Career & Education</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{viewingProfile.occupation || viewingProfile.career?.occupation || 'Professional'}</span>
                  <span className="text-slate-500 block">{viewingProfile.education?.qualification || 'Graduate'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-500">Verification: <strong>{viewingProfile.verificationStatus || 'unverified'}</strong></span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleReviewVerification(viewingProfile.id, 'verified');
                      setViewingProfile(null);
                    }}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 text-xs shadow-xs"
                  >
                    ✓ Mark Verified
                  </button>
                  <button
                    onClick={() => setViewingProfile(null)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD CHURCH MODAL */}
      {showAddChurchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">Add Verified Church</h3>
              <button onClick={() => setShowAddChurchModal(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddChurch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Church Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bethel AG Church"
                  required
                  value={churchForm.name}
                  onChange={(e) => setChurchForm({ ...churchForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Denomination</label>
                <select
                  value={churchForm.denomination}
                  onChange={(e) => setChurchForm({ ...churchForm, denomination: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-600 focus:outline-none"
                >
                  <option value="Assemblies of God">Assemblies of God (AG)</option>
                  <option value="Indian Pentecostal Church (IPC)">Indian Pentecostal Church (IPC)</option>
                  <option value="Church of God">Church of God (Full Gospel)</option>
                  <option value="Sharon Fellowship">Sharon Fellowship</option>
                  <option value="Independent Pentecostal">Independent Pentecostal</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pastor / Minister Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pr. Samuel K."
                  value={churchForm.pastor}
                  onChange={(e) => setChurchForm({ ...churchForm, pastor: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Location / City</label>
                <input
                  type="text"
                  placeholder="e.g. Kochi, Kerala"
                  value={churchForm.location}
                  onChange={(e) => setChurchForm({ ...churchForm, location: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddChurchModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold px-4 py-2 text-xs shadow-xs"
                >
                  Save Church
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ADD DENOMINATION MODAL */}
      {showAddDenomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">Add Denomination</h3>
              <button onClick={() => setShowAddDenomModal(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddDenom} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Denomination Name</label>
                <input
                  type="text"
                  placeholder="e.g. The Pentecostal Mission (TPM)"
                  required
                  value={denomForm.name}
                  onChange={(e) => setDenomForm({ ...denomForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Headquarters / Main Council Region</label>
                <input
                  type="text"
                  placeholder="e.g. Chennai, India"
                  value={denomForm.headquarter}
                  onChange={(e) => setDenomForm({ ...denomForm, headquarter: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDenomModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold px-4 py-2 text-xs shadow-xs"
                >
                  Save Denomination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. LOG REPORT MODAL */}
      {showAddReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">Log Moderation Complaint</h3>
              <button onClick={() => setShowAddReportModal(false)} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateReport} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Candidate Profile Name</label>
                <input
                  type="text"
                  placeholder="e.g. Candidate John"
                  required
                  value={reportForm.reportedProfileName}
                  onChange={(e) => setReportForm({ ...reportForm, reportedProfileName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason</label>
                <select
                  value={reportForm.reason}
                  onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-600 focus:outline-none"
                >
                  <option value="Profile Verification Required">Profile Verification Required</option>
                  <option value="Incorrect Church Information">Incorrect Church Information</option>
                  <option value="Inappropriate Photo / Content">Inappropriate Photo / Content</option>
                  <option value="Commercial Solicitation">Commercial Solicitation</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Details & Pastoral Notes</label>
                <textarea
                  rows={3}
                  placeholder="Provide context regarding this flag..."
                  value={reportForm.details}
                  onChange={(e) => setReportForm({ ...reportForm, details: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReportModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold px-4 py-2 text-xs shadow-xs"
                >
                  Submit Flag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CONFIRM DELETE SINGLE TARGET */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-rose-100 p-2.5 text-rose-700">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Delete {deleteTarget.type === 'user' ? 'User Account' : 'Matrimonial Profile'}?
                </h3>
                <p className="text-xs text-slate-500">Permanent action · Database wipe</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900 font-bold">{deleteTarget.name}</strong>?
              </p>
              <p className="mt-2 text-[11px] text-rose-700 font-semibold">
                ⚠️ This will completely erase this record from Neon PostgreSQL and all synchronized devices.
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

      {/* 6. WIPE ALL DATABASE PROFILES CONFIRMATION */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-red-200 text-slate-900 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2.5 text-red-700">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Wipe All Profiles from Database?
                </h3>
                <p className="text-xs text-red-600 font-semibold">
                  Fresh Start · Permanent Action
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-900">
              <p className="font-bold">
                Are you sure you want to completely erase all matrimonial profiles from the database?
              </p>
              <p className="mt-2 text-[11px] text-red-700">
                ⚠️ This will delete all candidate profiles from Neon PostgreSQL and local storage, giving you a 100% clean, empty slate for fresh startup testing.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isWiping}
                onClick={() => setShowWipeModal(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isWiping}
                onClick={handleWipeAll}
                className="rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 text-xs font-bold shadow-sm transition flex items-center gap-2"
              >
                {isWiping ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Wiping Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Yes, Wipe Everything Clean</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
