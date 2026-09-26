import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Check, Lock, Search, ShieldCheck, SlidersHorizontal, Sparkles, UserPlus, X } from 'lucide-react';
import { useListProfiles, useSaveProfile, useSendInterest, useUnsaveProfile, isSeedProfile } from '@workspace/api-client-react';
import { useAuth, useUser } from '../auth';
import { ProfileCard } from '../components/ui/ProfileCard';
import { deduplicateProfiles } from '../utils/storageHelper';

export function DiscoverPage() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    ageMin: '',
    ageMax: '',
    location: '',
    denomination: '',
    occupation: '',
    church: '',
    maritalStatus: '',
    workingAbroad: '',
  });

  const [justPublished, setJustPublished] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isJust = localStorage.getItem('pm_just_published') === 'true';
    if (isJust) localStorage.removeItem('pm_just_published');
    return isJust;
  });

  const queryParams = useMemo(() => ({
    search: search || undefined,
    ageMin: filters.ageMin ? Number(filters.ageMin) : undefined,
    ageMax: filters.ageMax ? Number(filters.ageMax) : undefined,
    location: filters.location || undefined,
    denomination: filters.denomination || undefined,
    workingAbroad: filters.workingAbroad ? filters.workingAbroad === 'true' : undefined,
  }), [search, filters]);

  const profilesQuery = useListProfiles(queryParams);
  const sendInterestMutation = useSendInterest();
  const saveProfileMutation = useSaveProfile();
  const unsaveProfileMutation = useUnsaveProfile();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Merge API profiles with real registered profiles for instant, guaranteed live discovery
  const displayedProfiles = useMemo(() => {
    const apiItems = (profilesQuery.data?.items || []).filter((p: any) => !isSeedProfile(p));
    let localItems: any[] = [];
    try {
      const raw = localStorage.getItem('pm_registered_profiles');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) localItems = parsed.filter((p: any) => !isSeedProfile(p));
      }
    } catch {}

    const combined = [
      ...localItems.map((p) => ({
        id: p.id,
        userId: p.userId,
        displayName: p.displayName || 'Registered Believer',
        age: p.age,
        location: p.location,
        country: p.country || 'India',
        denomination: p.denomination || p.faith?.denomination || 'Pentecostal',
        occupation: p.occupation || p.career?.occupation || 'Professional',
        primaryPhotoUrl: p.primaryPhotoUrl || (p.photos && p.photos.length > 0 ? (p.photos.find((ph: any) => ph.isPrimary)?.url || p.photos[0].url) : undefined),
        photos: p.photos,
        verificationStatus: p.verificationStatus || 'under_review',
        saved: p.saved || false,
        published: p.published !== false,
      })),
      ...apiItems.map((p: any) => ({
        id: p.id,
        userId: p.userId || p.id,
        displayName: p.displayName || 'Registered Believer',
        age: p.age,
        location: p.location,
        country: p.country || 'India',
        denomination: p.denomination || 'Pentecostal',
        occupation: p.occupation || 'Professional',
        primaryPhotoUrl: p.primaryPhotoUrl || undefined,
        verificationStatus: p.verificationStatus,
        saved: p.saved || false,
        published: p.published !== false,
      })),
    ];

    let list = deduplicateProfiles(combined).filter((p) => !isSeedProfile(p) && p.published !== false);

    // Robust multi-device / mobile filtering to strictly exclude the logged-in user's own profile
    const selfIds = new Set<string>();
    const selfNames: string[] = [];

    if (userId) selfIds.add(String(userId).trim().toLowerCase());
    if (user?.id) selfIds.add(String(user.id).trim().toLowerCase());
    if (user?.fullName) selfNames.push(user.fullName.trim().toLowerCase());
    if (user?.username) selfNames.push(user.username.trim().toLowerCase());
    if (user?.primaryEmailAddress?.emailAddress) {
      const email = user.primaryEmailAddress.emailAddress.trim().toLowerCase();
      selfNames.push(email);
      selfNames.push(email.split('@')[0]);
    }

    try {
      const authRaw = localStorage.getItem('pm_auth_user');
      if (authRaw) {
        const au = JSON.parse(authRaw);
        if (au.id) selfIds.add(String(au.id).trim().toLowerCase());
        if (au.fullName) selfNames.push(String(au.fullName).trim().toLowerCase());
        if (au.username) selfNames.push(String(au.username).trim().toLowerCase());
        if (au.email) {
          selfNames.push(String(au.email).trim().toLowerCase());
          selfNames.push(String(au.email).split('@')[0].toLowerCase());
        }
      }
    } catch {}

    try {
      const myProfRaw = localStorage.getItem('pm_my_profile');
      if (myProfRaw) {
        const mp = JSON.parse(myProfRaw);
        if (mp.id) selfIds.add(String(mp.id).trim().toLowerCase());
        if (mp.userId) selfIds.add(String(mp.userId).trim().toLowerCase());
        if (mp.displayName) selfNames.push(String(mp.displayName).trim().toLowerCase());
        if (mp.email) selfNames.push(String(mp.email).trim().toLowerCase());
      }
    } catch {}

    const normalizedSelfIds = new Set<string>();
    selfIds.forEach((id) => {
      if (!id) return;
      normalizedSelfIds.add(id);
      const clean = id.replace(/^prof_/, '').replace(/^user_/, '');
      normalizedSelfIds.add(clean);
      normalizedSelfIds.add(`prof_${clean}`);
      normalizedSelfIds.add(`user_${clean}`);
      normalizedSelfIds.add(`prof_user_${clean}`);
    });

    if (normalizedSelfIds.size > 0 || selfNames.length > 0) {
      list = list.filter((p: any) => {
        const pid = String(p.id || '').trim().toLowerCase();
        const puid = String(p.userId || '').trim().toLowerCase();
        const pName = String(p.displayName || '').trim().toLowerCase();

        // 1. Exclude matching profile/user IDs
        if (pid && (normalizedSelfIds.has(pid) || normalizedSelfIds.has(pid.replace(/^prof_/, '')) || normalizedSelfIds.has(pid.replace(/^user_/, '')))) {
          return false;
        }
        if (puid && (normalizedSelfIds.has(puid) || normalizedSelfIds.has(puid.replace(/^prof_/, '')) || normalizedSelfIds.has(puid.replace(/^user_/, '')))) {
          return false;
        }

        // 2. Exclude matching names
        if (pName && selfNames.some((n) => n && (n === pName || (n.length >= 3 && pName.includes(n)) || (pName.length >= 3 && n.includes(pName))))) {
          return false;
        }

        return true;
      });
    }

    // Apply active search & filters
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.displayName?.toLowerCase().includes(s) ||
          p.denomination?.toLowerCase().includes(s) ||
          p.occupation?.toLowerCase().includes(s) ||
          p.location?.toLowerCase().includes(s)
      );
    }
    if (filters.ageMin) list = list.filter((p) => (p.age || 0) >= Number(filters.ageMin));
    if (filters.ageMax) list = list.filter((p) => (p.age || 0) <= Number(filters.ageMax));
    if (filters.denomination) list = list.filter((p) => p.denomination?.toLowerCase().includes(filters.denomination.toLowerCase()));
    if (filters.location) list = list.filter((p) => p.location?.toLowerCase().includes(filters.location.toLowerCase()));
    if (filters.occupation) list = list.filter((p) => p.occupation?.toLowerCase().includes(filters.occupation.toLowerCase()));

    return list;
  }, [profilesQuery.data, search, filters, user?.id, user?.fullName, userId]);

  const handleSendInterest = (id: string) => {
    sendInterestMutation.mutate({ profileId: id }, {
      onSuccess: () => showToast('Interest expressed respectfully. You will be notified when they respond.'),
    });
  };

  const handleToggleSave = (id: string, currentSaved: boolean) => {
    if (currentSaved) {
      unsaveProfileMutation.mutate({ profileId: id }, {
        onSuccess: () => showToast('Profile removed from bookmarks.'),
      });
    } else {
      saveProfileMutation.mutate({ profileId: id }, {
        onSuccess: () => showToast('Profile saved to bookmarks.'),
      });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fdfbf9] via-[#f8f1ea] to-[#fbf4ee] flex items-center justify-center px-4 py-16 text-slate-900">
        <div className="max-w-md w-full rounded-3xl border border-[#ebdcd0] bg-white/95 p-8 text-center luxury-card-shadow">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 mb-5">
            <Lock size={28} />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
            Registered Members Only
          </span>
          <h2 className="mt-4 text-2xl font-bold font-serif-fancy text-slate-900 leading-snug">
            Partner Profiles Are Reserved for Registered Believers
          </h2>
          <p className="mt-3 text-xs text-slate-600 leading-relaxed">
            In accordance with Christian sanctity, family honor, and pastoral privacy, partner profiles can only be viewed by registered and verified members of our fellowship.
          </p>
          <div className="mt-8 space-y-3">
            <Link
              href="/onboarding"
              className="block w-full rounded-full bg-rose-700 py-3.5 text-xs font-bold uppercase tracking-wider !text-white shadow-md hover:bg-rose-800 transition text-center"
            >
              Register Free to View Partners
            </Link>
            <Link
              href="/sign-in"
              className="block w-full rounded-full border border-slate-300 bg-white py-3.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition text-center"
            >
              Already a Member? Sign In
            </Link>
            <div className="pt-2">
              <Link
                href="/"
                className="text-xs font-semibold text-slate-500 hover:text-rose-700 transition"
              >
                ← Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdfbf9] via-[#f8f1ea] to-[#fbf4ee] pb-24 md:pb-12 text-slate-900">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 rounded-lg border border-rose-300 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Main Discover Container */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {justPublished && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/50 p-4 sm:p-5 flex items-start justify-between shadow-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <Check size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-950">
                  Hallelujah! Your Matrimonial Profile is Live & Published
                </h4>
                <p className="mt-0.5 text-xs text-emerald-700">
                  Welcome to the fellowship! You can now browse verified Pentecostal matches below or search by specific denominations.
                </p>
              </div>
            </div>
            <button
              onClick={() => setJustPublished(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Top Greeting & Title with warm rose & gold gradient */}
        <div className="rounded-3xl border border-[#ebdcd0] bg-gradient-to-r from-[#fff9f4] via-white to-[#fbf4ed] p-6 sm:p-8 luxury-card-shadow">
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl text-slate-900">
            Find someone who shares your <span className="text-rose-700">faith and values</span>.
          </h1>
          <p className="mt-2 text-xs text-slate-600 max-w-2xl leading-relaxed">
            Browse verified Pentecostal Christian profiles with transparent spiritual backgrounds, church affiliations, and family values.
          </p>

          {/* Search Bar & Filter Toggle */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, church assembly, occupation or calling..."
                className="w-full rounded-xl border border-[#ebdcd0] bg-white/95 py-3 pl-10 pr-4 text-xs focus:border-rose-500 focus:ring-2 focus:ring-rose-100 focus:outline-none shadow-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-xs font-bold transition shadow-xs ${
                filtersOpen || activeFilterCount > 0
                  ? 'border-rose-600 bg-rose-700 text-white'
                  : 'border-[#ebdcd0] bg-white text-slate-700 hover:border-rose-300 hover:text-rose-700'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
            </button>
          </div>

          {/* Expanded Filter Panel */}
          {filtersOpen && (
            <div className="mt-4 rounded-2xl border border-[#ebdcd0] bg-white/95 p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Min Age</label>
                  <input
                    type="number"
                    value={filters.ageMin}
                    onChange={(e) => setFilters({ ...filters, ageMin: e.target.value })}
                    placeholder="e.g. 25"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs focus:border-rose-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Max Age</label>
                  <input
                    type="number"
                    value={filters.ageMax}
                    onChange={(e) => setFilters({ ...filters, ageMax: e.target.value })}
                    placeholder="e.g. 35"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs focus:border-rose-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Denomination</label>
                  <select
                    value={filters.denomination}
                    onChange={(e) => setFilters({ ...filters, denomination: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs focus:border-rose-500 focus:bg-white focus:outline-none"
                  >
                    <option value="">All Denominations</option>
                    <option value="Assemblies of God">Assemblies of God</option>
                    <option value="Indian Pentecostal Church of God (IPC)">IPC</option>
                    <option value="Church of God">Church of God</option>
                    <option value="Sharon Fellowship">Sharon Fellowship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600">Working Abroad</label>
                  <select
                    value={filters.workingAbroad}
                    onChange={(e) => setFilters({ ...filters, workingAbroad: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs focus:border-rose-500 focus:bg-white focus:outline-none"
                  >
                    <option value="">Any Work Location</option>
                    <option value="true">Working Abroad (NRI / Gulf)</option>
                    <option value="false">Locally Based in India</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  onClick={() => setFilters({ ageMin: '', ageMax: '', location: '', denomination: '', occupation: '', church: '', maritalStatus: '', workingAbroad: '' })}
                  className="text-xs text-slate-500 hover:text-rose-700 underline"
                >
                  Reset all filters
                </button>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="rounded-lg bg-rose-700 px-4 py-1.5 text-xs font-bold text-white uppercase tracking-wider hover:bg-rose-800 shadow-xs"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profiles Count Banner */}
        <div className="mt-8 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {`${displayedProfiles.length} Verified Profiles Active`}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            Sorted by faith & values alignment
          </span>
        </div>

        {/* Profiles Grid */}
        <div className="mt-4">
          {profilesQuery.isLoading && displayedProfiles.length === 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-96 rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
                  <div className="h-48 w-full rounded-lg bg-slate-100" />
                  <div className="mt-4 h-4 w-3/4 rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : displayedProfiles.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayedProfiles.map((p) => (
                <ProfileCard
                  key={p.id}
                  profile={{
                    id: p.id,
                    displayName: p.displayName,
                    age: p.age,
                    location: p.location,
                    country: p.country,
                    denomination: p.denomination || 'Pentecostal',
                    occupation: p.occupation || 'Professional',
                    primaryPhotoUrl: p.primaryPhotoUrl || undefined,
                    verificationStatus: p.verificationStatus,
                    saved: p.saved,
                  }}
                  onSendInterest={handleSendInterest}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-[#ebdcd0] bg-white/95 p-10 sm:p-14 text-center luxury-card-shadow max-w-2xl mx-auto">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 border border-rose-200/80 mb-5 shadow-2xs">
                <Sparkles size={28} className="text-amber-500" />
              </div>
              <h3 className="font-serif-fancy text-xl sm:text-2xl font-bold text-slate-900">
                Welcome to Pentecostal Matrimony
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Your profile is active and saved! As new Pentecostal believers and candidates register and complete pastoral review, they will appear here in your match directory.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/search"
                  className="w-full sm:w-auto rounded-xl bg-rose-700 px-6 py-3 text-xs font-bold uppercase tracking-wider !text-white shadow-sm hover:bg-rose-800 transition text-center"
                >
                  Explore Church Assemblies
                </Link>
                <Link
                  href="/my-profile"
                  className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition text-center"
                >
                  View My Profile
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
