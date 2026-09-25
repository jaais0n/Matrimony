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

// Stored profiles list (only real registered profiles created by users)
function getRegisteredProfiles(): MyProfile[] {
  return getBrowserStorage<MyProfile[]>('pm_registered_profiles', []);
}

function saveRegisteredProfiles(profiles: MyProfile[]): void {
  setBrowserStorage('pm_registered_profiles', profiles);
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
    if (found) return found;
    return null;
  }

  // 4. MATCHES
  if (cleanUrl === '/api/matches' && method === 'GET') {
    const savedIds = new Set(getBrowserStorage<string[]>('pm_saved_profile_ids', []));
    const all = getRegisteredProfiles();
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
      .filter((p) => savedIds.has(p.id))
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
    return { success: true };
  }

  // 7. CONVERSATIONS
  if (cleanUrl === '/api/conversations' && method === 'GET') {
    return getBrowserStorage<any[]>('pm_user_conversations', []);
  }

  // 8. NOTIFICATIONS
  if (cleanUrl === '/api/notifications' && method === 'GET') {
    return getBrowserStorage<any[]>('pm_user_notifications', []);
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

  // 11. ADMIN VERIFICATION QUEUE
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
    return [
      { id: 'c1', name: 'Bethel AG Church', location: 'Kerala & Bangalore', pastor: 'Pastorate Council', denomination: 'Assemblies of God', verified: true },
      { id: 'c2', name: 'IPC Hebron', location: 'Kumbanad, Kerala', pastor: 'General Presbytery', denomination: 'Indian Pentecostal Church', verified: true },
      { id: 'c3', name: 'Church of God (Full Gospel)', location: 'State Council', pastor: 'Overseer', denomination: 'Church of God', verified: true },
    ];
  }

  if (cleanUrl === '/api/admin/denominations') {
    const profiles = getRegisteredProfiles();
    return [
      { id: 'd1', name: 'Assemblies of God (AG)', count: profiles.filter((p) => p.faith?.denomination?.includes('Assemblies of God')).length },
      { id: 'd2', name: 'Indian Pentecostal Church (IPC)', count: profiles.filter((p) => p.faith?.denomination?.includes('IPC')).length },
      { id: 'd3', name: 'Church of God (Full Gospel)', count: profiles.filter((p) => p.faith?.denomination?.includes('Church of God')).length },
      { id: 'd4', name: 'Sharon Fellowship Church', count: profiles.filter((p) => p.faith?.denomination?.includes('Sharon')).length },
    ];
  }

  // 13. ADMIN REPORTS
  if (cleanUrl === '/api/admin/reports') {
    return getBrowserStorage<any[]>('pm_admin_reports', []);
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
