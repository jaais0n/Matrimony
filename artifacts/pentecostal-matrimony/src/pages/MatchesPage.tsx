import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Bookmark, Clock, Flame, Heart, MapPin, Sparkles, UserPlus } from 'lucide-react';
import { customFetch, isSeedProfile } from '@workspace/api-client-react';
import { useAuth, useUser } from '../auth';
import { ProfileCard } from '../components/ui/ProfileCard';
import { deduplicateProfiles } from '../utils/storageHelper';

interface MatchedProfileItem {
  id: string;
  displayName: string;
  age: number;
  location: string;
  country: string;
  denomination: string;
  occupation: string;
  education?: string;
  motherTongue?: string;
  workingAbroad?: boolean;
  primaryPhotoUrl?: string;
  verificationStatus?: string;
  saved?: boolean;
  reasons: string[];
}

export function MatchesPage() {
  const { userId } = useAuth();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'recommended' | 'new' | 'nearby' | 'recently_active' | 'saved'>('recommended');

  const { data, isLoading } = useQuery<{ items: MatchedProfileItem[]; total: number }>({
    queryKey: ['matches', activeTab],
    queryFn: () => customFetch(`/api/matches?tab=${activeTab}`),
  });

  const displayedMatches = useMemo(() => {
    const apiItems = (data?.items || []).filter((p: any) => !isSeedProfile(p));
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
        reasons: ['Registered Believer', p.faith?.denomination ? `Shared ${p.faith.denomination}` : 'Pentecostal Heritage'],
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
        primaryPhotoUrl: p.primaryPhotoUrl,
        verificationStatus: p.verificationStatus,
        saved: p.saved || false,
        published: p.published !== false,
        reasons: p.reasons || ['Registered Believer', 'Pentecostal Heritage'],
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

        if (pid && (normalizedSelfIds.has(pid) || normalizedSelfIds.has(pid.replace(/^prof_/, '')) || normalizedSelfIds.has(pid.replace(/^user_/, '')))) {
          return false;
        }
        if (puid && (normalizedSelfIds.has(puid) || normalizedSelfIds.has(puid.replace(/^prof_/, '')) || normalizedSelfIds.has(puid.replace(/^user_/, '')))) {
          return false;
        }
        if (pName && selfNames.some((n) => n && (n === pName || (n.length >= 3 && pName.includes(n)) || (pName.length >= 3 && n.includes(pName))))) {
          return false;
        }
        return true;
      });
    }

    if (activeTab === 'saved') {
      list = list.filter((p) => p.saved);
    } else if (activeTab === 'new') {
      list = [...list].reverse();
    } else if (activeTab === 'nearby') {
      list = list.filter((p) => p.location && (p.location.toLowerCase().includes('kerala') || p.location.toLowerCase().includes('bangalore')));
    }

    return list;
  }, [data, activeTab, user?.id, user?.fullName, userId]);

  const tabs = [
    { id: 'recommended', label: 'Recommended', icon: Sparkles, color: 'text-rose-600' },
    { id: 'new', label: 'New Profiles', icon: UserPlus, color: 'text-purple-600' },
    { id: 'nearby', label: 'Nearby', icon: MapPin, color: 'text-blue-600' },
    { id: 'recently_active', label: 'Recently Active', icon: Clock, color: 'text-emerald-600' },
    { id: 'saved', label: 'Saved', icon: Bookmark, color: 'text-amber-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header with colorful gradient border */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-rose-50/70 via-white to-purple-50/50 p-6 sm:p-8 shadow-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-800">
            <Flame size={12} className="text-rose-600" /> Transparent Compatibility
          </span>
          <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl text-slate-900">
            Rule-Based Matches
          </h1>
          <p className="mt-2 text-xs text-slate-600 max-w-2xl leading-relaxed">
            Every match recommendation shows clear, understandable reasons derived directly from your declared preferences:
            age range, shared denomination, church involvement, and location. No opaque algorithms.
          </p>

          {/* Section Tabs */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200/80 pt-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs ${
                    isActive
                      ? 'bg-rose-700 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-rose-300 hover:text-rose-700'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-rose-200' : tab.color} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Grid */}
        <div className="mt-6">
          {isLoading && displayedMatches.length === 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-96 rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
                  <div className="h-48 w-full rounded-lg bg-slate-100" />
                  <div className="mt-4 h-4 w-3/4 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : displayedMatches.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayedMatches.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={{
                    id: profile.id,
                    displayName: profile.displayName,
                    age: profile.age,
                    location: profile.location,
                    country: profile.country,
                    denomination: profile.denomination,
                    occupation: profile.occupation,
                    primaryPhotoUrl: profile.primaryPhotoUrl,
                    verificationStatus: profile.verificationStatus,
                    saved: profile.saved,
                    reasons: profile.reasons,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <h3 className="text-lg font-bold text-slate-800">No profiles found in this section.</h3>
              <p className="mt-2 text-xs text-slate-500">
                {activeTab === 'saved'
                  ? 'You haven’t saved any profiles yet. Browse the Discover directory to bookmark profiles.'
                  : 'Check back soon as new verified members join the fellowship.'}
              </p>
              <Link
                href="/discover"
                className="mt-5 inline-block rounded-lg bg-rose-700 px-5 py-2.5 text-xs font-bold text-white uppercase tracking-wider hover:bg-rose-800 shadow-sm"
              >
                Browse Directory
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
