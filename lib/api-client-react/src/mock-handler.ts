import type {
  AdminOverview,
  Interest,
  MyProfile,
  PrivacySettings,
  ProfileDetail,
  ProfilePage,
  ProfileSummary,
  VerificationQueueItem,
} from './generated/api.schemas';
import { INITIAL_REGISTERED_PROFILES } from './initial-profiles';

// Helpers to get/set persistent browser storage
function getBrowserStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setBrowserStorage<T>(key: string, val: T): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    try {
      if (typeof val === 'object' && val !== null) {
        if (Array.isArray(val)) {
          const trimmed = val.map((item: any) => {
            if (item?.photos?.length) {
              return {
                ...item,
                photos: item.photos.map((ph: any) => ({
                  ...ph,
                  url: ph.url && ph.url.length > 500 ? '' : ph.url,
                })),
              };
            }
            return item;
          });
          window.localStorage.setItem(key, JSON.stringify(trimmed));
        } else if ((val as any).photos?.length) {
          const trimmed = {
            ...val,
            photos: (val as any).photos.map((ph: any) => ({
              ...ph,
              url: ph.url && ph.url.length > 500 ? '' : ph.url,
            })),
          };
          window.localStorage.setItem(key, JSON.stringify(trimmed));
        }
      }
    } catch {}
  }
}

function getCurrentAuthUser(): { id: string; email: string; fullName: string } | null {
  return getBrowserStorage<{ id: string; email: string; fullName: string } | null>('pm_auth_user', null);
}

export const SEED_PROFILE_IDS = new Set([
  'prof_user_grace',
  'prof_user_joshua',
  'prof_user_rebecca',
  'prof_user_samuel',
  'prof_user_sneha',
  'prof_user_daniel',
  'user_grace',
  'user_joshua',
  'user_rebecca',
  'user_samuel',
  'user_sneha',
  'user_daniel',
  'ph_grace_1',
  'ph_joshua_1',
  'ph_rebecca_1',
  'ph_samuel_1',
  'ph_sneha_1',
  'ph_daniel_1',
  'prof_user_1790356597878',
  'user_1790356597878',
  'fssdf',
]);

export const SEED_PROFILE_NAMES = [
  'grace philip',
  'dr. joshua varghese',
  'rebecca e. george',
  'samuel k. george',
  'sneha philip',
  'daniel k. varghese',
  'dr. joshua thomas',
  'rebecca sarah varghese',
  'samuel k. cherian',
  'sneha elizabeth mathew',
  'daniel m. varghese',
  'fssdf',
];


export function isSeedProfile(p: any): boolean {
  if (!p) return false;
  if (p.isSeed === true || p._seed === true) return true;
  const id = String(p.id || '').trim().toLowerCase();
  const userId = String(p.userId || '').trim().toLowerCase();
  const name = String(p.displayName || '').trim().toLowerCase();

  if (SEED_PROFILE_IDS.has(id) || SEED_PROFILE_IDS.has(userId)) return true;
  if (
    id.startsWith('prof_user_grace') ||
    id.startsWith('prof_user_joshua') ||
    id.startsWith('prof_user_rebecca') ||
    id.startsWith('prof_user_samuel') ||
    id.startsWith('prof_user_sneha') ||
    id.startsWith('prof_user_daniel')
  ) {
    return true;
  }
  if (SEED_PROFILE_NAMES.some((n) => name.includes(n))) return true;

  if (Array.isArray(p.photos)) {
    for (const ph of p.photos) {
      const u = String(ph?.url || '');
      if (
        u.includes('1573496359142') ||
        u.includes('1507003211169') ||
        u.includes('1544005313') ||
        u.includes('1500648767791') ||
        u.includes('1534528741775') ||
        u.includes('1506794778202')
      ) {
        return true;
      }
    }
  }
  const primaryUrl = String(p.primaryPhotoUrl || '');
  if (
    primaryUrl.includes('1573496359142') ||
    primaryUrl.includes('1507003211169') ||
    primaryUrl.includes('1544005313') ||
    primaryUrl.includes('1500648767791') ||
    primaryUrl.includes('1534528741775') ||
    primaryUrl.includes('1506794778202')
  ) {
    return true;
  }

  return false;
}

export const DEFAULT_SEED_PROFILES: any[] = [];

// Stored profiles list (only real registered profiles created by users)
function getRegisteredProfiles(): any[] {
  const existing = getBrowserStorage<any[]>('pm_registered_profiles', []);
  if (!existing || existing.length === 0) {
    const initial = INITIAL_REGISTERED_PROFILES.filter((p) => !isSeedProfile(p));
    setBrowserStorage('pm_registered_profiles', initial);
    return initial;
  }
  // Strictly filter out any seed/demo profiles that may be cached in browser localStorage
  let filtered = existing.filter((p) => !isSeedProfile(p));
  if (filtered.length === 0 && INITIAL_REGISTERED_PROFILES.length > 0) {
    filtered = INITIAL_REGISTERED_PROFILES.filter((p) => !isSeedProfile(p));
    setBrowserStorage('pm_registered_profiles', filtered);
    return filtered;
  }

  // Ensure initial user profiles are included across all devices
  const existingIds = new Set(filtered.map((p) => p.id));
  let modified = false;
  for (const initP of INITIAL_REGISTERED_PROFILES) {
    if (!existingIds.has(initP.id) && !isSeedProfile(initP)) {
      filtered.push(initP);
      modified = true;
    }
  }

  if (filtered.length !== existing.length || modified) {
    setBrowserStorage('pm_registered_profiles', filtered);
  }
  return filtered;
}


function saveRegisteredProfiles(profiles: MyProfile[]): void {
  const cleaned = profiles.filter((p) => !isSeedProfile(p));
  setBrowserStorage('pm_registered_profiles', cleaned);
}

// Convert ProfileDetail to ProfileSummary
function toSummary(p: ProfileDetail | MyProfile, saved = false): ProfileSummary {
  return {
    id: p.id,
    userId: (p as any).userId || (p.id ? p.id.replace('prof_', '') : undefined),
    displayName: p.displayName,
    age: p.age,
    gender: p.gender,
    location: p.location,
    country: p.country,
    denomination: p.faith?.denomination || (p as any).denomination || 'Pentecostal',
    church: p.faith?.church || (p as any).church || '',
    education: p.education?.qualification || (p as any).education || '',
    occupation: p.career?.occupation || (p as any).occupation || 'Professional',
    motherTongue: p.motherTongue || '',
    workingAbroad: Boolean(p.career?.workingAbroad || (p as any).workingAbroad),
    primaryPhotoUrl: (p as any).primaryPhotoUrl || (p.photos && p.photos.length > 0 ? (p.photos.find((ph) => ph.isPrimary)?.url || p.photos[0].url) : null),
    verificationStatus: p.verificationStatus,
    saved,
  } as any;
}

export function handleMockRequest(url: string, method: string, body?: unknown): unknown {
  const urlObj = new URL(url, 'http://localhost');
  const cleanUrl = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  const currentUser = getCurrentAuthUser();
  const userId = currentUser?.id || 'guest';

  // 1. GET or UPDATE MY PROFILE
  if (cleanUrl === '/api/profiles/me' || cleanUrl === '/api/me/profile') {
    const userProfileKey = `pm_user_profile_${userId}`;

    if (method === 'PUT' || method === 'POST') {
      const updated = (body as Partial<MyProfile>) || {};
      const existing = getBrowserStorage<MyProfile | null>(userProfileKey, null) || {
        id: `prof_${userId}`,
        displayName: currentUser?.fullName || '',
        dateOfBirth: '',
        age: 0,
        gender: 'woman' as const,
        location: '',
        country: 'India',
        heightCm: 0,
        weightKg: null,
        motherTongue: '',
        maritalStatus: 'Never Married',
        introduction: '',
        verificationStatus: 'under_review' as const,
        published: true,
        profileVisible: true,
        updatedAt: new Date().toISOString(),
        faith: {
          religion: 'Christianity',
          denomination: 'Assemblies of God',
          church: '',
          baptismStatus: 'Water & Holy Spirit Baptized',
          baptismYear: null,
          churchInvolvement: '',
          ministryInvolvement: '',
          spiritualExpectations: '',
          faithDescription: '',
        },
        education: { qualification: '', degree: '', institution: '', fieldOfStudy: '' },
        career: { occupation: '', company: '', workLocation: '', employmentStatus: 'Full-time', workingAbroad: false, country: 'India' },
        family: { familyStatus: 'Middle Class', fatherOccupation: '', motherOccupation: '', siblings: '', background: '', values: '' },
        preferences: { ageMin: 21, ageMax: 35, locations: [], denomination: '', education: '', occupation: '', workLocation: '', familyValues: '', spiritualExpectations: '', other: '' },
        photos: [],
        reasons: [],
      };

      const merged: MyProfile = {
        ...existing,
        ...updated,
        displayName: updated.displayName !== undefined ? updated.displayName : (existing.displayName || currentUser?.fullName || ''),
        updatedAt: new Date().toISOString(),
        photos: updated.photos || existing.photos || [],
        reasons: updated.reasons || existing.reasons || [],
      };

      setBrowserStorage(userProfileKey, merged);
      setBrowserStorage('pm_my_profile', merged);

      // Synchronize into the public registered profiles directory
      const allProfiles = getRegisteredProfiles();
      const idx = allProfiles.findIndex((p) => p.id === merged.id || (p as any).userId === userId);

      if (idx >= 0) {
        allProfiles[idx] = merged;
      } else {
        allProfiles.push(merged);
      }
      saveRegisteredProfiles(allProfiles);

      return merged;
    }

    // GET request
    const existing = getBrowserStorage<MyProfile | null>(userProfileKey, null) || getBrowserStorage<MyProfile | null>('pm_my_profile', null);
    if (existing) {
      return existing;
    }

    const matchedInitial = INITIAL_REGISTERED_PROFILES.find(
      (p) => p.userId === userId || p.id === `prof_${userId}` || (currentUser?.fullName && p.displayName?.toLowerCase() === currentUser.fullName.toLowerCase())
    );
    if (matchedInitial) {
      setBrowserStorage(userProfileKey, matchedInitial);
      setBrowserStorage('pm_my_profile', matchedInitial);
      return matchedInitial;
    }

    // Default clean profile for current user
    const defaultProfile: MyProfile = {
      id: `prof_${userId}`,
      displayName: currentUser?.fullName || '',
      dateOfBirth: '',
      age: 0,
      gender: 'woman',
      location: '',
      country: 'India',
      heightCm: 0,
      weightKg: null,
      motherTongue: '',
      maritalStatus: 'Never Married',
      introduction: '',
      verificationStatus: 'under_review',
      published: true,
      profileVisible: true,
      updatedAt: new Date().toISOString(),
      faith: {
        religion: 'Christianity',
        denomination: 'Assemblies of God',
        church: '',
        baptismStatus: 'Water & Holy Spirit Baptized',
        baptismYear: null,
        churchInvolvement: '',
        ministryInvolvement: '',
        spiritualExpectations: '',
        faithDescription: '',
      },
      education: { qualification: '', degree: '', institution: '', fieldOfStudy: '' },
      career: { occupation: '', company: '', workLocation: '', employmentStatus: 'Full-time', workingAbroad: false, country: 'India' },
      family: { familyStatus: 'Middle Class', fatherOccupation: '', motherOccupation: '', siblings: '', background: '', values: '' },
      preferences: { ageMin: 21, ageMax: 35, locations: [], denomination: '', education: '', occupation: '', workLocation: '', familyValues: '', spiritualExpectations: '', other: '' },
      photos: [],
      reasons: [],
    };
    return defaultProfile;
  }

  // 2. LIST PROFILES (Directory)
  if (cleanUrl === '/api/profiles' && method === 'GET') {
    const search = searchParams.get('search')?.toLowerCase();
    const denomination = searchParams.get('denomination');
    const location = searchParams.get('location')?.toLowerCase();
    const ageMin = searchParams.get('ageMin') ? Number(searchParams.get('ageMin')) : undefined;
    const ageMax = searchParams.get('ageMax') ? Number(searchParams.get('ageMax')) : undefined;
    const workingAbroad = searchParams.get('workingAbroad');

    let all = getRegisteredProfiles().filter((p) => p.published !== false);

    if (search) {
      all = all.filter(
        (p) =>
          p.displayName?.toLowerCase().includes(search) ||
          p.faith?.church?.toLowerCase().includes(search) ||
          p.career?.occupation?.toLowerCase().includes(search) ||
          p.faith?.denomination?.toLowerCase().includes(search) ||
          p.location?.toLowerCase().includes(search)
      );
    }
    if (denomination) {
      all = all.filter((p) => p.faith?.denomination?.toLowerCase().includes(denomination.toLowerCase()));
    }
    if (location) {
      all = all.filter((p) => p.location?.toLowerCase().includes(location));
    }
    if (ageMin) {
      all = all.filter((p) => p.age >= ageMin);
    }
    if (ageMax) {
      all = all.filter((p) => p.age <= ageMax);
    }
    if (workingAbroad !== null && workingAbroad !== undefined && workingAbroad !== '') {
      const isAbroad = workingAbroad === 'true';
      all = all.filter((p) => p.career?.workingAbroad === isAbroad);
    }

    const savedIds = new Set(getBrowserStorage<string[]>('pm_saved_profile_ids', []));
    const items = all.map((p) => toSummary(p, savedIds.has(p.id)));

    const page: ProfilePage = {
      items,
      total: items.length,
      page: 1,
      pageSize: 24,
    };
    return page;
  }

  // 3. PROFILE DETAIL
  const profileDetailMatch = cleanUrl.match(/^\/api\/profiles\/([^/]+)$/);
  if (profileDetailMatch && method === 'GET') {
    const id = profileDetailMatch[1];
    const found = getRegisteredProfiles().find((p) => p.id === id);
    if (found && !isSeedProfile(found)) return found;
    return null;
  }

  // 4. MATCHES
  if (cleanUrl === '/api/matches' && method === 'GET') {
    const savedIds = new Set(getBrowserStorage<string[]>('pm_saved_profile_ids', []));
    const all = getRegisteredProfiles().filter((p) => !isSeedProfile(p));
    return {
      items: all.map((p) => ({
        ...toSummary(p, savedIds.has(p.id)),
        reasons: ['Registered Believer', p.faith?.denomination ? `Shared ${p.faith.denomination}` : 'Pentecostal Heritage'],
      })),
      total: all.length,
    };
  }

  // 5. BOOKMARKS / SAVED PROFILES
  if (cleanUrl === '/api/profiles/saved' || cleanUrl === '/api/me/saved') {
    const savedIds = new Set(getBrowserStorage<string[]>('pm_saved_profile_ids', []));
    return getRegisteredProfiles()
      .filter((p) => !isSeedProfile(p) && savedIds.has(p.id))
      .map((p) => toSummary(p, true));
  }

  const saveMatch = cleanUrl.match(/^\/api\/profiles\/([^/]+)\/save$/);
  if (saveMatch) {
    const id = saveMatch[1];
    const savedIds = new Set(getBrowserStorage<string[]>('pm_saved_profile_ids', []));
    if (method === 'POST') {
      savedIds.add(id);
      setBrowserStorage('pm_saved_profile_ids', Array.from(savedIds));
      return { saved: true };
    }
    if (method === 'DELETE') {
      savedIds.delete(id);
      setBrowserStorage('pm_saved_profile_ids', Array.from(savedIds));
      return { saved: false };
    }
  }

  // 6. INTERESTS
  if (cleanUrl === '/api/interests/me' || cleanUrl === '/api/me/interests') {
    const dir = searchParams.get('direction') || 'incoming';
    const allInterests = getBrowserStorage<Interest[]>('pm_user_interests', []);
    return allInterests.filter((i) => i.direction === dir);
  }

  const interestMatch = cleanUrl.match(/^\/api\/profiles\/([^/]+)\/interests$/);
  if (interestMatch && method === 'POST') {
    const id = interestMatch[1];
    const target = getRegisteredProfiles().find((p) => p.id === id);
    const allInterests = getBrowserStorage<Interest[]>('pm_user_interests', []);
    if (target) {
      const exists = allInterests.some((i) => i.profileId === target.id);
      if (!exists) {
        allInterests.push({
          id: `int_${Date.now()}`,
          profileId: target.id,
          displayName: target.displayName,
          age: target.age,
          location: target.location,
          primaryPhotoUrl: target.photos && target.photos[0] ? target.photos[0].url : null,
          direction: 'outgoing',
          status: 'pending',
          createdAt: new Date().toISOString(),
          mutual: false,
        });
        setBrowserStorage('pm_user_interests', allInterests);
      }
    }
    return { success: true };
  }

  const respondInterestMatch = cleanUrl.match(/^\/api\/interests\/([^/]+)$/);
  if (respondInterestMatch && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    const interestId = respondInterestMatch[1];
    const decision = (body as any)?.data?.decision || (body as any)?.decision || 'accepted';
    const allInterests = getBrowserStorage<any[]>('pm_user_interests', []);
    const idx = allInterests.findIndex((i) => i.id === interestId);
    let targetInterest: any = null;
    if (idx >= 0) {
      allInterests[idx] = {
        ...allInterests[idx],
        status: decision,
        mutual: decision === 'accepted',
      };
      targetInterest = allInterests[idx];
      setBrowserStorage('pm_user_interests', allInterests);
    }

    if (decision === 'accepted' && targetInterest) {
      // Auto-create or ensure active conversation exists
      const convs = getBrowserStorage<any[]>('pm_user_conversations', []);
      const convId = `conv_${targetInterest.profileId}`;
      if (!convs.some((c) => c.id === convId || c.participantId === targetInterest.profileId)) {
        const newConv = {
          id: convId,
          participantId: targetInterest.profileId,
          participantName: targetInterest.displayName,
          participantAge: targetInterest.age || 0,
          participantLocation: targetInterest.location || 'India',
          participantPhoto: targetInterest.primaryPhotoUrl || '',
          participantOccupation: 'Professional',
          participantDenomination: 'Pentecostal',
          status: 'active',
          lastMessageText: 'Mutual connection accepted! Private messaging unlocked.',
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0,
          messages: [
            {
              id: `msg_init_${Date.now()}`,
              senderId: 'system',
              senderName: 'System',
              content: 'Mutual connection accepted! You can now converse with Christian respect and courtesy.',
              timestamp: new Date().toISOString(),
              read: true,
            },
          ],
        };
        setBrowserStorage('pm_user_conversations', [newConv, ...convs]);
      }
    }
    return { success: true, decision };
  }

  // 7. CONVERSATIONS & MESSAGING
  if (cleanUrl === '/api/conversations' && method === 'GET') {
    return getBrowserStorage<any[]>('pm_user_conversations', []);
  }

  if (cleanUrl === '/api/conversations' && method === 'POST') {
    const pId = (body as any)?.participantId || `p_${Date.now()}`;
    const pName = (body as any)?.participantName || 'Candidate';
    const convs = getBrowserStorage<any[]>('pm_user_conversations', []);
    const existing = convs.find((c) => c.id === `conv_${pId}` || c.participantId === pId);
    if (existing) {
      return existing;
    }
    const newConv = {
      id: `conv_${pId}`,
      participantId: pId,
      participantName: pName,
      participantAge: (body as any)?.participantAge || 0,
      participantLocation: (body as any)?.participantLocation || 'India',
      participantPhoto: (body as any)?.participantPhoto || '',
      participantOccupation: (body as any)?.participantOccupation || 'Professional',
      participantDenomination: (body as any)?.participantDenomination || 'Pentecostal',
      status: 'active',
      lastMessageText: 'Conversation started.',
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      messages: [
        {
          id: `msg_sys_${Date.now()}`,
          senderId: 'system',
          senderName: 'System',
          content: 'Private discernment conversation initiated.',
          timestamp: new Date().toISOString(),
          read: true,
        },
      ],
    };
    setBrowserStorage('pm_user_conversations', [newConv, ...convs]);
    return newConv;
  }

  const postMessageMatch = cleanUrl.match(/^\/api\/conversations\/([^/]+)\/messages$/);
  if (postMessageMatch && method === 'POST') {
    const convId = postMessageMatch[1];
    const content = (body as any)?.content?.trim() || '';
    if (content) {
      const convs = getBrowserStorage<any[]>('pm_user_conversations', []);
      let targetConv = convs.find((c) => c.id === convId);
      if (!targetConv) {
        targetConv = {
          id: convId,
          participantId: convId.replace('conv_', ''),
          participantName: 'Member Candidate',
          participantAge: 0,
          participantLocation: 'India',
          participantPhoto: '',
          participantOccupation: 'Professional',
          participantDenomination: 'Pentecostal',
          status: 'active',
          lastMessageText: content,
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0,
          messages: [],
        };
        convs.unshift(targetConv);
      }
      const newMsg = {
        id: `msg_${Date.now()}`,
        senderId: 'prof_me',
        senderName: 'You',
        content,
        timestamp: new Date().toISOString(),
        read: true,
        delivered: true,
      };
      targetConv.messages = targetConv.messages || [];
      targetConv.messages.push(newMsg);
      targetConv.lastMessageText = content;
      targetConv.lastMessageAt = newMsg.timestamp;
      setBrowserStorage('pm_user_conversations', convs);
      return { success: true, message: newMsg };
    }
    return { success: true };
  }

  // 8. NOTIFICATIONS
  if (cleanUrl === '/api/notifications' && method === 'GET') {
    return getBrowserStorage<any[]>('pm_user_notifications', []);
  }

  const notifReadMatch = cleanUrl.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (notifReadMatch && method === 'POST') {
    const notifId = notifReadMatch[1];
    const notifs = getBrowserStorage<any[]>('pm_user_notifications', []);
    const updated = notifs.map((n) => (n.id === notifId ? { ...n, read: true } : n));
    setBrowserStorage('pm_user_notifications', updated);
    return { success: true, id: notifId };
  }

  // 9. ADMIN OVERVIEW (Calculated purely from real registered data)
  if (cleanUrl === '/api/admin/overview') {
    const users = getBrowserStorage<any[]>('pm_registered_accounts', []);
    const profiles = getRegisteredProfiles();
    const interests = getBrowserStorage<Interest[]>('pm_user_interests', []);
    const reports = getBrowserStorage<any[]>('pm_admin_reports', []);

    const overview: AdminOverview = {
      totalUsers: users.length > 0 ? users.length : 1,
      activeProfiles: profiles.filter((p) => p.published !== false).length,
      verifiedProfiles: profiles.filter((p) => p.verificationStatus === 'verified').length,
      pendingVerification: profiles.filter((p) => p.verificationStatus !== 'verified').length,
      newRegistrations: users.length,
      interestsSent: interests.length,
      mutualConnections: interests.filter((i) => i.mutual).length,
      openReports: reports.filter((r) => r.status === 'open').length,
    };
    return overview;
  }

  // 10. ADMIN USERS
  if (cleanUrl === '/api/admin/users') {
    const users = getBrowserStorage<any[]>('pm_registered_accounts', []);
    const result = [
      {
        id: 'user_admin',
        email: 'admin@pentecostalmatrimony.org',
        name: 'Steward Administrator',
        role: 'admin',
        status: 'active',
        registeredAt: '2026-01-01',
      },
      ...users.map((u, idx) => ({
        id: u.id || `u_${idx + 1}`,
        email: u.email,
        name: u.fullName || u.email.split('@')[0],
        role: u.role || 'member',
        status: 'active',
        registeredAt: new Date().toISOString().slice(0, 10),
      })),
    ];
    return result;
  }

  // 11. ADMIN VERIFICATION QUEUE & REVIEWS
  const reviewMatch = cleanUrl.match(/^\/api\/admin\/verifications\/([^/]+)\/review$/);
  if (reviewMatch && method === 'POST') {
    const profileId = reviewMatch[1];
    const decision = (body as any)?.decision || 'verified';
    const profiles = getRegisteredProfiles();
    const idx = profiles.findIndex((p) => p.id === profileId || p.userId === profileId);
    if (idx >= 0) {
      profiles[idx].verificationStatus = decision;
      profiles[idx].updatedAt = new Date().toISOString();
      setBrowserStorage('pm_registered_profiles', profiles);
    }
    const myProf = getBrowserStorage<any>('pm_my_profile', null);
    if (myProf && (myProf.id === profileId || myProf.userId === profileId)) {
      myProf.verificationStatus = decision;
      myProf.updatedAt = new Date().toISOString();
      setBrowserStorage('pm_my_profile', myProf);
    }
    if (typeof window !== 'undefined') {
      try {
        const up = localStorage.getItem(`pm_user_profile_${profileId}`);
        if (up) {
          const parsed = JSON.parse(up);
          parsed.verificationStatus = decision;
          localStorage.setItem(`pm_user_profile_${profileId}`, JSON.stringify(parsed));
        }
      } catch {}
    }
    return { success: true, profileId, decision };
  }

  const deleteProfileMatch = cleanUrl.match(/^\/api\/admin\/profiles\/([^/]+)\/delete$/);
  if (deleteProfileMatch && method === 'POST') {
    const profileId = deleteProfileMatch[1];
    const profiles = getRegisteredProfiles();
    const updated = profiles.filter((p) => p.id !== profileId && p.userId !== profileId);
    setBrowserStorage('pm_registered_profiles', updated);
    const myProf = getBrowserStorage<any>('pm_my_profile', null);
    if (myProf && (myProf.id === profileId || myProf.userId === profileId)) {
      if (typeof window !== 'undefined') localStorage.removeItem('pm_my_profile');
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`pm_user_profile_${profileId}`);
    }
    return { success: true, deletedId: profileId };
  }

  const deleteUserMatch = cleanUrl.match(/^\/api\/admin\/users\/([^/]+)\/delete$/);
  if (deleteUserMatch && method === 'POST') {
    const userId = deleteUserMatch[1];
    const users = getBrowserStorage<any[]>('pm_registered_accounts', []);
    const updatedUsers = users.filter((u) => u.id !== userId && u.email !== userId);
    setBrowserStorage('pm_registered_accounts', updatedUsers);
    setBrowserStorage('pm_registered_users', updatedUsers);
    const profiles = getRegisteredProfiles();
    const updatedProfiles = profiles.filter((p) => p.userId !== userId && p.id !== userId);
    setBrowserStorage('pm_registered_profiles', updatedProfiles);
    return { success: true, deletedUserId: userId };
  }

  if (cleanUrl === '/api/admin/verification-queue') {
    const profiles = getRegisteredProfiles().filter((p) => p.verificationStatus !== 'verified');
    const queue: VerificationQueueItem[] = profiles.map((p) => ({
      profile: toSummary(p),
      submittedAt: p.updatedAt || new Date().toISOString(),
      identityChecked: true,
      churchInformationProvided: Boolean(p.faith?.church),
    }));
    return queue;
  }

  // 12. ADMIN CHURCHES & DENOMINATIONS
  if (cleanUrl === '/api/admin/churches') {
    const defaultChurches = [
      { id: 'c1', name: 'Bethel AG Church', location: 'Kochi & Bangalore', pastor: 'Pastorate Council', denomination: 'Assemblies of God', verified: true },
      { id: 'c2', name: 'IPC Hebron', location: 'Kumbanad, Kerala', pastor: 'General Presbytery', denomination: 'Indian Pentecostal Church', verified: true },
      { id: 'c3', name: 'Church of God (Full Gospel)', location: 'State Council', pastor: 'Overseer', denomination: 'Church of God', verified: true },
      { id: 'c4', name: 'Sharon Fellowship Church', location: 'Manakala, Adoor', pastor: 'National Council', denomination: 'Sharon Fellowship', verified: true },
    ];
    let stored = getBrowserStorage<any[]>('pm_admin_churches', defaultChurches);
    if (method === 'POST' && body) {
      const newChurch = { id: `c_${Date.now()}`, verified: true, ...(body as any) };
      stored = [newChurch, ...stored];
      setBrowserStorage('pm_admin_churches', stored);
      return newChurch;
    }
    return stored;
  }

  if (cleanUrl.startsWith('/api/admin/churches/') && cleanUrl.endsWith('/delete')) {
    const churchId = cleanUrl.replace('/api/admin/churches/', '').replace('/delete', '');
    const stored = getBrowserStorage<any[]>('pm_admin_churches', []);
    const updated = stored.filter((c) => c.id !== churchId);
    setBrowserStorage('pm_admin_churches', updated);
    return { success: true, deletedId: churchId };
  }

  if (cleanUrl === '/api/admin/denominations') {
    const profiles = getRegisteredProfiles();
    const defaultDenoms = [
      { id: 'd1', name: 'Assemblies of God (AG)', headquarter: 'Springfield / Chennai' },
      { id: 'd2', name: 'Indian Pentecostal Church (IPC)', headquarter: 'Kumbanad, Kerala' },
      { id: 'd3', name: 'Church of God (Full Gospel)', headquarter: 'Cleveland / Kottayam' },
      { id: 'd4', name: 'Sharon Fellowship Church', headquarter: 'Manakala, Kerala' },
      { id: 'd5', name: 'The Pentecostal Mission (TPM)', headquarter: 'Chennai, India' },
    ];
    let stored = getBrowserStorage<any[]>('pm_admin_denominations', defaultDenoms);
    if (method === 'POST' && body) {
      const newDenom = { id: `d_${Date.now()}`, ...(body as any) };
      stored = [...stored, newDenom];
      setBrowserStorage('pm_admin_denominations', stored);
      return newDenom;
    }
    return stored.map((d) => ({
      ...d,
      count: profiles.filter((p) => p.faith?.denomination?.toLowerCase().includes(d.name.toLowerCase().split(' ')[0])).length,
    }));
  }

  if (cleanUrl.startsWith('/api/admin/denominations/') && cleanUrl.endsWith('/delete')) {
    const denomId = cleanUrl.replace('/api/admin/denominations/', '').replace('/delete', '');
    const stored = getBrowserStorage<any[]>('pm_admin_denominations', []);
    const updated = stored.filter((d) => d.id !== denomId);
    setBrowserStorage('pm_admin_denominations', updated);
    return { success: true, deletedId: denomId };
  }

  // 13. ADMIN REPORTS
  if (cleanUrl === '/api/admin/reports') {
    const defaultReports = [
      {
        id: 'rep_1',
        reportedProfileId: 'prof_sample_1',
        reportedProfileName: 'User Profile Verification Issue',
        reporterName: 'Pastor Thomas',
        reason: 'Incomplete Church Information',
        details: 'Candidate needs to provide verified baptism certificate and local pastor contact number.',
        status: 'open',
        createdAt: new Date().toISOString(),
      },
    ];
    let stored = getBrowserStorage<any[]>('pm_admin_reports', defaultReports);
    if (method === 'POST' && body) {
      const newRep = { id: `rep_${Date.now()}`, status: 'open', createdAt: new Date().toISOString(), ...(body as any) };
      stored = [newRep, ...stored];
      setBrowserStorage('pm_admin_reports', stored);
      return newRep;
    }
    return stored;
  }

  if (cleanUrl.startsWith('/api/admin/reports/') && cleanUrl.endsWith('/action')) {
    const reportId = cleanUrl.replace('/api/admin/reports/', '').replace('/action', '');
    const action = (body as any)?.action || 'action_taken';
    const stored = getBrowserStorage<any[]>('pm_admin_reports', []);
    const updated = stored.map((r) => (r.id === reportId ? { ...r, status: action === 'dismissed' ? 'dismissed' : 'resolved' } : r));
    setBrowserStorage('pm_admin_reports', updated);
    return { success: true, reportId, status: action };
  }

  // 14. PRIVACY
  if (cleanUrl === '/api/privacy/me' || cleanUrl === '/api/me/privacy') {
    const privKey = `pm_privacy_${userId}`;
    if (method === 'PATCH' || method === 'PUT') {
      const patch = ((body as { data?: Partial<PrivacySettings> })?.data || (body as Partial<PrivacySettings>)) || {};
      const existing = getBrowserStorage<PrivacySettings>(privKey, {
        profileVisible: true,
        photoVisibility: 'all_members',
        contactVisibility: 'connections_only',
        showOnlineStatus: false,
        interestPermissions: 'preferred_matches',
      });
      const updated = { ...existing, ...patch };
      setBrowserStorage(privKey, updated);
      return updated;
    }
    return getBrowserStorage<PrivacySettings>(privKey, {
      profileVisible: true,
      photoVisibility: 'all_members',
      contactVisibility: 'connections_only',
      showOnlineStatus: false,
      interestPermissions: 'preferred_matches',
    });
  }

  // 15. SUBSCRIPTIONS
  if (cleanUrl === '/api/subscriptions/current' || cleanUrl === '/api/subscriptions/me') {
    return {
      plan: 'free',
      status: 'active',
      interestsQuota: 10,
      interestsRemaining: 10,
      canViewContact: false,
      canUseAdvancedFilters: true,
      hasProfileBoost: false,
    };
  }

  return null;
}
