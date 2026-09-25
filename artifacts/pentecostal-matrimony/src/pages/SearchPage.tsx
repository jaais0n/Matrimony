import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useListProfiles } from '@workspace/api-client-react';
import { useAuth, useUser } from '../auth';
import { ProfileCard } from '../components/ui/ProfileCard';
import { deduplicateProfiles } from '../utils/storageHelper';

export function SearchPage() {
  const { userId } = useAuth();
  const { user } = useUser();
  const [keyword, setKeyword] = useState('');
  const [gender, setGender] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [denomination, setDenomination] = useState('');
  const [location, setLocation] = useState('');
  const [education, setEducation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [motherTongue, setMotherTongue] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [workingAbroad, setWorkingAbroad] = useState('');

  const profilesQuery = useListProfiles({
    search: keyword || undefined,
    ageMin: ageMin ? Number(ageMin) : undefined,
    ageMax: ageMax ? Number(ageMax) : undefined,
    denomination: denomination || undefined,
    location: location || undefined,
    workingAbroad: workingAbroad ? workingAbroad === 'true' : undefined,
  });

  // Calculate active filter chips
  const activeChips: { id: string; label: string; onRemove: () => void }[] = [];
  if (keyword) activeChips.push({ id: 'kw', label: `Keyword: ${keyword}`, onRemove: () => setKeyword('') });
  if (gender) activeChips.push({ id: 'gen', label: `Gender: ${gender}`, onRemove: () => setGender('') });
  if (ageMin || ageMax) activeChips.push({ id: 'age', label: `Age: ${ageMin || '18'} - ${ageMax || '60'}`, onRemove: () => { setAgeMin(''); setAgeMax(''); } });
  if (denomination) activeChips.push({ id: 'den', label: `Denomination: ${denomination}`, onRemove: () => setDenomination('') });
  if (location) activeChips.push({ id: 'loc', label: `Location: ${location}`, onRemove: () => setLocation('') });
  if (education) activeChips.push({ id: 'edu', label: `Education: ${education}`, onRemove: () => setEducation('') });
  if (occupation) activeChips.push({ id: 'occ', label: `Occupation: ${occupation}`, onRemove: () => setOccupation('') });
  if (motherTongue) activeChips.push({ id: 'mt', label: `Tongue: ${motherTongue}`, onRemove: () => setMotherTongue('') });
  if (maritalStatus) activeChips.push({ id: 'ms', label: `Status: ${maritalStatus}`, onRemove: () => setMaritalStatus('') });
  if (workingAbroad) activeChips.push({ id: 'wa', label: workingAbroad === 'true' ? 'Working Abroad' : 'Based in India', onRemove: () => setWorkingAbroad('') });

  // Merge API profiles with real registered profiles
  const displayedProfiles = useMemo(() => {
    const apiItems = profilesQuery.data?.items || [];
    let localItems: any[] = [];
    try {
      const raw = localStorage.getItem('pm_registered_profiles');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) localItems = parsed;
      }
    } catch {}

    const combined = [
      ...localItems.map((p) => ({
        id: p.id,
        userId: p.userId,
        displayName: p.displayName || 'Registered Believer',
        age: p.age,
        gender: p.gender,
        location: p.location,
        country: p.country || 'India',
        denomination: p.denomination || p.faith?.denomination || 'Pentecostal',
        occupation: p.occupation || p.career?.occupation || 'Professional',
        education: p.education?.qualification || p.qualification || '',
        motherTongue: p.motherTongue || '',
        maritalStatus: p.maritalStatus || 'Never Married',
        workingAbroad: p.career?.workingAbroad || false,
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
        gender: p.gender,
        location: p.location,
        country: p.country || 'India',
        denomination: p.denomination || 'Pentecostal',
        occupation: p.occupation || 'Professional',
        education: p.education || '',
        motherTongue: p.motherTongue || '',
        maritalStatus: p.maritalStatus || 'Never Married',
        workingAbroad: p.workingAbroad || false,
        primaryPhotoUrl: p.primaryPhotoUrl || undefined,
        verificationStatus: p.verificationStatus,
        saved: p.saved || false,
        published: p.published !== false,
      })),
    ];

    let list = deduplicateProfiles(combined).filter((p) => p.published !== false);

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

    if (keyword.trim()) {
      const s = keyword.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.displayName?.toLowerCase().includes(s) ||
          p.denomination?.toLowerCase().includes(s) ||
          p.occupation?.toLowerCase().includes(s) ||
          p.location?.toLowerCase().includes(s)
      );
    }
    if (gender) list = list.filter((p) => p.gender === gender);
    if (ageMin) list = list.filter((p) => (p.age || 0) >= Number(ageMin));
    if (ageMax) list = list.filter((p) => (p.age || 0) <= Number(ageMax));
    if (denomination) list = list.filter((p) => p.denomination?.toLowerCase().includes(denomination.toLowerCase()));
    if (location) list = list.filter((p) => p.location?.toLowerCase().includes(location.toLowerCase()));
    if (education) list = list.filter((p) => p.education?.toLowerCase().includes(education.toLowerCase()));
    if (occupation) list = list.filter((p) => p.occupation?.toLowerCase().includes(occupation.toLowerCase()));
    if (motherTongue) list = list.filter((p) => p.motherTongue?.toLowerCase().includes(motherTongue.toLowerCase()));
    if (maritalStatus) list = list.filter((p) => p.maritalStatus?.toLowerCase() === maritalStatus.toLowerCase());
    if (workingAbroad) list = list.filter((p) => p.workingAbroad === (workingAbroad === 'true'));

    return list;
  }, [profilesQuery.data, keyword, gender, ageMin, ageMax, denomination, location, education, occupation, motherTongue, maritalStatus, workingAbroad]);

  const clearAllFilters = () => {
    setKeyword('');
    setGender('');
    setAgeMin('');
    setAgeMax('');
    setDenomination('');
    setLocation('');
    setEducation('');
    setOccupation('');
    setMotherTongue('');
    setMaritalStatus('');
    setWorkingAbroad('');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header and Filter Form */}
        <div className="rounded-2xl border border-rose-100 bg-white p-6 sm:p-8 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-700" />
          <span className="inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1 border border-rose-200">
            Advanced Directory Search
          </span>
          <h1 className="text-2xl font-extrabold sm:text-3xl text-slate-900">Search Profiles</h1>
          <p className="mt-2 text-xs text-slate-600">
            Filter through verified Pentecostal profiles with precision across faith, profession, and family background.
          </p>

          {/* Form Fields */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Keyword</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Name, church, keywords..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Denomination</label>
              <select
                value={denomination}
                onChange={(e) => setDenomination(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
              >
                <option value="">All Denominations</option>
                <option value="Assemblies of God">Assemblies of God</option>
                <option value="Indian Pentecostal Church of God (IPC)">IPC</option>
                <option value="Church of God">Church of God</option>
                <option value="Sharon Fellowship">Sharon Fellowship</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Age Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  placeholder="Min"
                  className="mt-1 w-1/2 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                />
                <input
                  type="number"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  placeholder="Max"
                  className="mt-1 w-1/2 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Work Location</label>
              <select
                value={workingAbroad}
                onChange={(e) => setWorkingAbroad(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
              >
                <option value="">Any Work Location</option>
                <option value="true">Working Abroad (NRI / Gulf)</option>
                <option value="false">Locally in India</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeChips.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Active Filters ({activeChips.length})
                </span>
                <button onClick={clearAllFilters} className="text-xs text-rose-600 hover:text-rose-800 font-semibold hover:underline">
                  Clear All
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeChips.map((chip) => (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 shadow-2xs"
                  >
                    <span>{chip.label}</span>
                    <button
                      onClick={chip.onRemove}
                      className="p-0.5 rounded-full hover:bg-rose-200 text-rose-700 transition"
                      aria-label={`Remove filter ${chip.label}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {profilesQuery.data ? (
                <span>
                  Found <strong className="text-rose-700 font-extrabold">{displayedProfiles.length}</strong> Verified Profiles
                </span>
              ) : 'Searching...'}
            </span>
          </div>

          {profilesQuery.isLoading && displayedProfiles.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
              Searching profiles matching your criteria...
            </div>
          ) : displayedProfiles.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayedProfiles.map((profile) => (
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
                    primaryPhotoUrl: profile.primaryPhotoUrl || undefined,
                    verificationStatus: profile.verificationStatus,
                    saved: profile.saved,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-white p-12 text-center shadow-xs">
              <h3 className="text-base font-bold text-slate-900">No profiles found for these specific criteria.</h3>
              <p className="mt-2 text-xs text-slate-500">
                Try removing some filters to widen your discovery scope.
              </p>
              <button
                onClick={clearAllFilters}
                className="mt-4 rounded-xl bg-rose-700 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-rose-800 uppercase tracking-wider transition"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
