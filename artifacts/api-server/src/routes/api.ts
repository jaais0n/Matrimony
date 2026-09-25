import fs from 'fs';
import path from 'path';
import { Router, type Request, type Response } from 'express';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';

const apiRouter = Router();

// Persistent data storage path on disk
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

// In-memory data store for local API server runtime (synced to disk)
interface StoredUser {
  id: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'moderator';
  password?: string;
  fullName?: string;
}

let usersStore: StoredUser[] = [
  {
    id: 'user_admin',
    email: 'admin',
    phone: '+91 98470 12345',
    role: 'admin',
    fullName: 'Administrator',
    password: 'admin',
  },
];

let profilesStore: any[] = [];
let interestsStore: any[] = [];
let conversationsStore: any[] = [];
let notificationsStore: any[] = [];
let savedProfilesStore = new Set<string>();
let reportsStore: any[] = [];

function loadStoreFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.users) && data.users.length > 0) {
        usersStore = data.users;
      }
      if (Array.isArray(data.profiles)) {
        profilesStore = data.profiles;
      }
      if (Array.isArray(data.interests)) {
        interestsStore = data.interests;
      }
      if (Array.isArray(data.savedProfiles)) {
        savedProfilesStore = new Set(data.savedProfiles);
      }
      if (Array.isArray(data.reports)) {
        reportsStore = data.reports;
      }
      console.log(`[Store] Loaded ${usersStore.length} users and ${profilesStore.length} profiles from disk.`);
    }
  } catch (err) {
    console.warn('[Store] Failed to load data from disk:', err);
  }
}

function saveStoreToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = {
      users: usersStore,
      profiles: profilesStore,
      interests: interestsStore,
      savedProfiles: Array.from(savedProfilesStore),
      reports: reportsStore,
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Store] Failed to save data to disk:', err);
  }
}

// Initialize from persistent store
loadStoreFromDisk();

// Helper to extract authenticated user from Authorization header
function getAuthUser(req: Request) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const verified = authService.verifyToken(token);
    if (verified) return verified;
  }
  return null;
}

// --- AUTH ROUTES ---
apiRouter.get('/auth/users', (_req: Request, res: Response) => {
  res.json(
    usersStore.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.email.includes('@') ? u.email.split('@')[0] : u.email,
      fullName: u.fullName || 'Member',
      firstName: (u.fullName || 'Member').split(' ')[0],
      role: u.role,
      password: u.password,
    }))
  );
});

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { email, phone, password, fullName, role = 'user' } = req.body;
  const emailClean = (email || '').trim().toLowerCase();

  let existingUser = usersStore.find((u) => emailClean && u.email.toLowerCase() === emailClean);
  if (existingUser) {
    if (password) existingUser.password = password;
    if (fullName) existingUser.fullName = fullName;
    saveStoreToDisk();
    const token = authService.generateToken(existingUser);
    res.json({ user: existingUser, token, message: 'Account updated successfully' });
    return;
  }

  const user: StoredUser = {
    id: `user_${Date.now()}`,
    email: emailClean,
    phone: phone || '',
    fullName: fullName || (emailClean ? emailClean.split('@')[0] : 'Believer'),
    role: role as 'user' | 'admin' | 'moderator',
    password: password || 'password123',
  };
  usersStore.push(user);
  saveStoreToDisk();
  const token = authService.generateToken(user);
  res.json({ user, token, message: 'Account created successfully' });
});

apiRouter.post('/auth/login', (req: Request, res: Response): void => {
  const { email, phone, password } = req.body;
  const cleanId = (email || '').trim().toLowerCase();

  // 1. Admin login check
  if (
    (cleanId === 'admin' || cleanId === 'steward@pentecostalmatrimony.org' || cleanId === 'admin@pentecostalmatrimony.org') &&
    (password === 'admin' || password === 'admin123')
  ) {
    const adminUser = usersStore.find((u) => u.role === 'admin') || {
      id: 'user_admin',
      email: 'admin',
      phone: '+91 98470 12345',
      role: 'admin' as const,
      fullName: 'Administrator',
    };
    const token = authService.generateToken(adminUser);
    res.json({ user: adminUser, token, message: 'Signed in as Administrator' });
    return;
  }

  // 2. Member login check
  const user = usersStore.find(
    (u) =>
      (cleanId && u.email.toLowerCase() === cleanId) ||
      (cleanId && u.email.split('@')[0].toLowerCase() === cleanId) ||
      (phone && u.phone === phone)
  );

  if (!user) {
    res.status(401).json({
      error: 'No registered account found with these credentials. Please register first.',
    });
    return;
  }

  const token = authService.generateToken(user);
  res.json({ user, token, message: 'Signed in successfully' });
});

apiRouter.post('/auth/otp/send', (req: Request, res: Response) => {
  const { phone } = req.body;
  const otp = authService.generateOtp();
  res.json({ success: true, message: `OTP sent to ${phone}`, debugCode: otp.code });
});

apiRouter.post('/auth/otp/verify', (req: Request, res: Response) => {
  const { phone } = req.body;
  let user = usersStore.find((u) => u.phone === phone);
  if (!user) {
    user = {
      id: `user_${Date.now()}`,
      phone: phone || '',
      email: '',
      fullName: 'Member',
      role: 'user',
    };
    usersStore.push(user);
    saveStoreToDisk();
  }
  const token = authService.generateToken(user);
  res.json({ success: true, user, token });
});

function deduplicateProfilesStore(list: any[]) {
  const result: any[] = [];
  for (const item of list) {
    if (!item) continue;
    const nameKey = item.displayName ? item.displayName.trim().toLowerCase() : '';
    const userIdKey = item.userId ? String(item.userId).trim() : '';
    const idKey = item.id ? String(item.id).trim() : '';

    const existingIdx = result.findIndex((e) => {
      const eName = e.displayName ? e.displayName.trim().toLowerCase() : '';
      const eUserId = e.userId ? String(e.userId).trim() : '';
      const eId = e.id ? String(e.id).trim() : '';

      if (idKey && eId && idKey === eId) return true;
      if (userIdKey && eUserId && userIdKey === eUserId) return true;
      if (nameKey && eName && nameKey === eName) return true;
      return false;
    });

    if (existingIdx >= 0) {
      result[existingIdx] = { ...result[existingIdx], ...item };
    } else {
      result.push(item);
    }
  }
  return result;
}

// --- CURRENT USER PROFILE ROUTES (/profiles/me & /me/profile) ---
const handleGetMyProfile = (req: Request, res: Response): void => {
  const user = getAuthUser(req);
  const targetUserId =
    user?.id ||
    (req.query.userId as string) ||
    (usersStore.length > 1 ? usersStore[usersStore.length - 1].id : null);

  if (!targetUserId && profilesStore.length > 0) {
    res.json(profilesStore[profilesStore.length - 1]);
    return;
  }

  const profile = profilesStore.find((p) => p.userId === targetUserId || p.id === targetUserId);
  if (!profile) {
    if (profilesStore.length > 0) {
      res.json(profilesStore[profilesStore.length - 1]);
      return;
    }
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json(profile);
};

apiRouter.get('/profiles/me', handleGetMyProfile);
apiRouter.get('/me/profile', handleGetMyProfile);

const handleUpsertMyProfile = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const updatedData = req.body || {};
  const targetUserId =
    updatedData.userId ||
    user?.id ||
    (req.query.userId as string) ||
    `user_${Date.now()}`;
  const targetProfileId = updatedData.id || `prof_${targetUserId}`;

  const existingIdx = profilesStore.findIndex(
    (p) =>
      p.id === targetProfileId ||
      p.userId === targetUserId ||
      (updatedData.displayName && p.displayName && p.displayName.trim().toLowerCase() === updatedData.displayName.trim().toLowerCase())
  );

  const primaryPhoto =
    updatedData.primaryPhotoUrl ||
    (updatedData.photos && updatedData.photos.length > 0
      ? updatedData.photos.find((ph: any) => ph.isPrimary)?.url || updatedData.photos[0].url
      : undefined);

  const merged = {
    id: targetProfileId,
    userId: targetUserId,
    displayName: updatedData.displayName || '',
    dateOfBirth: updatedData.dateOfBirth || '',
    age: updatedData.age || 0,
    gender: updatedData.gender || 'woman',
    location: updatedData.location || '',
    country: updatedData.country || 'India',
    heightCm: updatedData.heightCm || 0,
    weightKg: updatedData.weightKg || null,
    motherTongue: updatedData.motherTongue || '',
    maritalStatus: updatedData.maritalStatus || 'Never Married',
    introduction: updatedData.introduction || '',
    published: updatedData.published !== undefined ? updatedData.published : true,
    verificationStatus: updatedData.verificationStatus || 'under_review',
    updatedAt: new Date().toISOString(),
    primaryPhotoUrl: primaryPhoto,
    faith: updatedData.faith || {
      religion: 'Christianity',
      denomination: updatedData.denomination || 'Assemblies of God',
      church: '',
      baptismStatus: 'Water & Holy Spirit Baptized',
      churchInvolvement: '',
      ministryInvolvement: '',
      spiritualExpectations: '',
      faithDescription: '',
    },
    education: updatedData.education || { qualification: '', degree: '', institution: '', fieldOfStudy: '' },
    career: updatedData.career || { occupation: updatedData.occupation || 'Professional', company: '', workLocation: '', employmentStatus: 'Full-time', workingAbroad: false, country: 'India' },
    family: updatedData.family || { familyStatus: 'Middle Class', fatherOccupation: '', motherOccupation: '', siblings: '', background: '', values: '' },
    preferences: updatedData.preferences || { ageMin: 21, ageMax: 35, locations: [], denomination: '', education: '', occupation: '', workLocation: '', familyValues: '', spiritualExpectations: '', other: '' },
    photos: updatedData.photos || (primaryPhoto ? [{ id: 'p1', url: primaryPhoto, isPrimary: true }] : []),
  };

  if (existingIdx >= 0) {
    profilesStore[existingIdx] = { ...profilesStore[existingIdx], ...merged };
  } else {
    profilesStore.push(merged);
  }

  // Ensure user exists in usersStore
  const userIdx = usersStore.findIndex(
    (u) => u.id === targetUserId || (updatedData.email && u.email.toLowerCase() === updatedData.email.toLowerCase())
  );
  if (userIdx >= 0) {
    usersStore[userIdx] = {
      ...usersStore[userIdx],
      fullName: updatedData.displayName || usersStore[userIdx].fullName,
      phone: updatedData.phone || usersStore[userIdx].phone,
    };
  } else {
    usersStore.push({
      id: targetUserId,
      email: updatedData.email || `${targetUserId}@matrimony.local`,
      phone: updatedData.phone || '',
      fullName: updatedData.displayName || 'Member',
      role: 'user',
      password: 'password123',
    });
  }

  saveStoreToDisk();
  res.json(merged);
};

apiRouter.post('/profiles/me', handleUpsertMyProfile);
apiRouter.put('/profiles/me', handleUpsertMyProfile);
apiRouter.post('/me/profile', handleUpsertMyProfile);
apiRouter.put('/me/profile', handleUpsertMyProfile);
apiRouter.post('/profiles/sync', (req: Request, res: Response) => {
  const incoming = Array.isArray(req.body) ? req.body : req.body?.profiles || [];
  for (const item of incoming) {
    if (!item) continue;
    const targetUserId = item.userId || item.id || `user_${Date.now()}`;
    const targetProfileId = item.id || `prof_${targetUserId}`;
    const existingIdx = profilesStore.findIndex(
      (p) =>
        p.id === targetProfileId ||
        p.userId === targetUserId ||
        (item.displayName && p.displayName && p.displayName.trim().toLowerCase() === item.displayName.trim().toLowerCase())
    );

    const primaryPhoto =
      item.primaryPhotoUrl ||
      (item.photos && item.photos.length > 0
        ? item.photos.find((ph: any) => ph.isPrimary)?.url || item.photos[0].url
        : undefined);

    const merged = {
      id: targetProfileId,
      userId: targetUserId,
      displayName: item.displayName || '',
      dateOfBirth: item.dateOfBirth || '',
      age: item.age || 0,
      gender: item.gender || 'woman',
      location: item.location || '',
      country: item.country || 'India',
      heightCm: item.heightCm || 0,
      weightKg: item.weightKg || null,
      motherTongue: item.motherTongue || '',
      maritalStatus: item.maritalStatus || 'Never Married',
      introduction: item.introduction || '',
      published: item.published !== undefined ? item.published : true,
      verificationStatus: item.verificationStatus || 'under_review',
      updatedAt: item.updatedAt || new Date().toISOString(),
      primaryPhotoUrl: primaryPhoto,
      faith: item.faith || {
        religion: 'Christianity',
        denomination: item.denomination || 'Assemblies of God',
        church: '',
        baptismStatus: 'Water & Holy Spirit Baptized',
        churchInvolvement: '',
        ministryInvolvement: '',
        spiritualExpectations: '',
        faithDescription: '',
      },
      education: item.education || { qualification: '', degree: '', institution: '', fieldOfStudy: '' },
      career: item.career || { occupation: item.occupation || 'Professional', company: '', workLocation: '', employmentStatus: 'Full-time', workingAbroad: false, country: 'India' },
      family: item.family || { familyStatus: 'Middle Class', fatherOccupation: '', motherOccupation: '', siblings: '', background: '', values: '' },
      preferences: item.preferences || { ageMin: 21, ageMax: 35, locations: [], denomination: '', education: '', occupation: '', workLocation: '', familyValues: '', spiritualExpectations: '', other: '' },
      photos: item.photos || (primaryPhoto ? [{ id: 'p1', url: primaryPhoto, isPrimary: true }] : []),
    };

    if (existingIdx >= 0) {
      profilesStore[existingIdx] = { ...profilesStore[existingIdx], ...merged };
    } else {
      profilesStore.push(merged);
    }

    if (!usersStore.some((u) => u.id === targetUserId)) {
      usersStore.push({
        id: targetUserId,
        email: item.email || `${targetUserId}@matrimony.local`,
        phone: item.phone || '',
        fullName: item.displayName || 'Member',
        role: 'user',
        password: 'password123',
      });
    }
  }

  saveStoreToDisk();
  res.json({ success: true, count: profilesStore.length });
});

apiRouter.post('/profiles', handleUpsertMyProfile);
apiRouter.put('/profiles', handleUpsertMyProfile);

// --- PUBLIC PROFILES DIRECTORY ---
apiRouter.get('/profiles', (req: Request, res: Response) => {
  const { search, ageMin, ageMax, location, denomination, workingAbroad, page = 1, pageSize = 24 } = req.query;

  let filtered = deduplicateProfilesStore(profilesStore).filter((p) => p.published);


  if (search) {
    const s = String(search).toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.displayName && p.displayName.toLowerCase().includes(s)) ||
        (p.faith?.church && p.faith.church.toLowerCase().includes(s)) ||
        (p.faith?.denomination && p.faith.denomination.toLowerCase().includes(s)) ||
        (p.career?.occupation && p.career.occupation.toLowerCase().includes(s)) ||
        (p.location && p.location.toLowerCase().includes(s))
    );
  }

  if (ageMin) filtered = filtered.filter((p) => p.age >= Number(ageMin));
  if (ageMax) filtered = filtered.filter((p) => p.age <= Number(ageMax));
  if (location) filtered = filtered.filter((p) => p.location && p.location.toLowerCase().includes(String(location).toLowerCase()));
  if (denomination) filtered = filtered.filter((p) => p.faith?.denomination && p.faith.denomination.toLowerCase().includes(String(denomination).toLowerCase()));
  if (workingAbroad !== undefined && workingAbroad !== '') {
    const abroadBool = workingAbroad === 'true';
    filtered = filtered.filter((p) => p.career?.workingAbroad === abroadBool);
  }

  const items = filtered.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    age: p.age,
    location: p.location,
    country: p.country,
    denomination: p.denomination || p.faith?.denomination || 'Pentecostal',
    occupation: p.occupation || p.career?.occupation || 'Professional',
    primaryPhotoUrl: p.primaryPhotoUrl || (p.photos && p.photos.length > 0 ? (p.photos.find((ph: any) => ph.isPrimary)?.url || p.photos[0].url) : null),
    verificationStatus: p.verificationStatus,
    saved: savedProfilesStore.has(p.id),
  }));

  res.json({
    items,
    total: filtered.length,
    page: Number(page),
    pageSize: Number(pageSize),
  });
});

apiRouter.get('/profiles/:id', (req: Request, res: Response) => {
  const profile = profilesStore.find((p) => p.id === req.params.id || p.userId === req.params.id);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }
  res.json({ ...profile, saved: savedProfilesStore.has(profile.id) });
});

apiRouter.post('/profiles/:id/save', (req: Request, res: Response) => {
  savedProfilesStore.add(String(req.params.id));
  saveStoreToDisk();
  res.json({ saved: true });
});

apiRouter.delete('/profiles/:id/save', (req: Request, res: Response) => {
  savedProfilesStore.delete(String(req.params.id));
  saveStoreToDisk();
  res.json({ saved: false });
});

// --- MATCHES ROUTES ---
apiRouter.get('/matches', (req: Request, res: Response) => {
  const { tab = 'recommended' } = req.query;
  let matches = [...profilesStore.filter((p) => p.published)];

  if (tab === 'new') {
    matches = matches.reverse();
  } else if (tab === 'nearby') {
    matches = matches.filter((p) => p.location && (p.location.includes('Bangalore') || p.location.includes('Kerala')));
  } else if (tab === 'saved') {
    matches = matches.filter((p) => savedProfilesStore.has(p.id));
  }

  const items = matches.map((p) => ({
    ...p,
    saved: savedProfilesStore.has(p.id),
    matchReasons: p.reasons || ['Shared Pentecostal Denomination', 'Age Preference Aligned'],
  }));

  res.json({ items, total: items.length });
});

// --- INTERESTS ROUTES ---
apiRouter.get('/interests', (req: Request, res: Response) => {
  const { direction = 'incoming' } = req.query;
  const filtered = interestsStore.filter((i) => i.direction === direction);
  res.json(filtered);
});

apiRouter.post('/interests', (req: Request, res: Response) => {
  const { profileId } = req.body;
  const target = profilesStore.find((p) => p.id === profileId);
  const newInterest = {
    id: `int_${Date.now()}`,
    fromProfileId: 'my_profile',
    toProfileId: profileId,
    status: 'pending',
    direction: 'outgoing',
    mutual: false,
    displayName: target?.displayName || 'Believer',
    age: target?.age || 0,
    location: target?.location || '',
    primaryPhotoUrl: target?.photos?.[0]?.url || '',
    createdAt: new Date().toISOString(),
  };
  interestsStore.push(newInterest);
  res.json({ success: true, interest: newInterest });
});

apiRouter.post('/interests/:id/respond', (req: Request, res: Response) => {
  const { id } = req.params;
  const { decision } = req.body; // 'accepted' | 'declined'

  interestsStore = interestsStore.map((item) => {
    if (item.id === id) {
      return { ...item, status: decision, mutual: decision === 'accepted' };
    }
    return item;
  });

  res.json({ success: true, decision });
});

// --- CONVERSATIONS & CHAT ---
apiRouter.get('/conversations', (_req: Request, res: Response) => {
  res.json(conversationsStore);
});

apiRouter.get('/conversations/:id/messages', (req: Request, res: Response) => {
  const conv = conversationsStore.find((c) => c.id === req.params.id);
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  res.json(conv.messages || []);
});

apiRouter.post('/conversations/:id/messages', (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  const conv = conversationsStore.find((c) => c.id === id);
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const newMessage = {
    id: `m_${Date.now()}`,
    senderId: 'current_user',
    senderName: 'You',
    content,
    timestamp: new Date().toISOString(),
    read: true,
  };

  conv.messages = conv.messages || [];
  conv.messages.push(newMessage);
  conv.lastMessageText = content;
  conv.lastMessageAt = newMessage.timestamp;

  res.json({ success: true, message: newMessage });
});

// --- NOTIFICATIONS ---
apiRouter.get('/notifications', (_req: Request, res: Response) => {
  res.json(notificationsStore);
});

apiRouter.post('/notifications/:id/read', (req: Request, res: Response) => {
  notificationsStore = notificationsStore.map((n) => (n.id === req.params.id ? { ...n, read: true } : n));
  res.json({ success: true });
});

// --- SUBSCRIPTION ---
apiRouter.get('/subscriptions/current', (_req: Request, res: Response) => {
  res.json({
    plan: 'free',
    status: 'active',
    interestsQuota: 10,
    interestsRemaining: 10,
    canViewContact: true,
    canUseAdvancedFilters: true,
    hasProfileBoost: false,
  });
});

// --- ADMIN & MODERATION ---
apiRouter.get('/admin/overview', (_req: Request, res: Response) => {
  const totalUsers = usersStore.length;
  const activeProfiles = profilesStore.filter((p) => p.published).length;
  const verifiedProfiles = profilesStore.filter((p) => p.verificationStatus === 'verified').length;
  const pendingVerification = profilesStore.filter(
    (p) => p.verificationStatus === 'under_review' || p.verificationStatus === 'pending'
  ).length;
  const newRegistrations = usersStore.filter((u) => u.role !== 'admin').length;
  const interestsSent = interestsStore.length;
  const mutualConnections = interestsStore.filter((i) => i.mutual).length;
  const openReports = reportsStore.filter((r) => r.status === 'open').length;

  res.json({
    totalUsers,
    activeProfiles,
    verifiedProfiles,
    pendingVerification,
    newRegistrations,
    interestsSent,
    mutualConnections,
    openReports,
  });
});

apiRouter.get('/admin/users', (_req: Request, res: Response) => {
  const result = usersStore.map((u) => {
    const prof = profilesStore.find((p) => p.userId === u.id);
    return {
      id: u.id,
      email: u.email,
      phone: u.phone,
      role: u.role,
      fullName: u.fullName || prof?.displayName || (u.email ? u.email.split('@')[0] : 'Member'),
      displayName: prof?.displayName || u.fullName || '',
      verificationStatus: prof?.verificationStatus || (u.role === 'admin' ? 'verified' : 'unverified'),
      status: 'active',
      location: prof?.location || '',
      denomination: prof?.faith?.denomination || '',
      registeredAt: new Date().toISOString(),
    };
  });
  res.json(result);
});

apiRouter.post('/admin/users/:id/verify', (req: Request, res: Response) => {
  const { id } = req.params;
  const prof = profilesStore.find((p) => p.userId === id || p.id === id);
  if (prof) {
    prof.verificationStatus = 'verified';
  }
  res.json({ success: true, id, status: 'verified' });
});

apiRouter.post('/admin/users/:id/suspend', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ success: true, id, status: 'suspended' });
});

async function deleteUserFromDb(userId: string) {
  if (!process.env.DATABASE_URL) return;
  try {
    const pgName = 'pg';
    const pg = await (import(pgName) as Promise<any>).catch(() => null);
    if (!pg) return;
    const Client = pg.default?.Client || pg.Client;
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query('DELETE FROM profiles WHERE user_id = $1 OR id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM interests WHERE sender_profile_id = $1 OR receiver_profile_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
    await client.end();
  } catch (err) {
    console.warn('DB deleteUser error (non-fatal):', err);
  }
}

async function deleteProfileFromDb(profileId: string) {
  if (!process.env.DATABASE_URL) return;
  try {
    const pgName = 'pg';
    const pg = await (import(pgName) as Promise<any>).catch(() => null);
    if (!pg) return;
    const Client = pg.default?.Client || pg.Client;
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query('DELETE FROM profiles WHERE id = $1 OR user_id = $1', [profileId]).catch(() => {});
    await client.query('DELETE FROM interests WHERE sender_profile_id = $1 OR receiver_profile_id = $1', [profileId]).catch(() => {});
    await client.end();
  } catch (err) {
    console.warn('DB deleteProfile error (non-fatal):', err);
  }
}

const handleDeleteUser = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  usersStore = usersStore.filter((u) => u.id !== id);
  profilesStore = profilesStore.filter((p) => p.userId !== id && p.id !== id);
  interestsStore = interestsStore.filter((i) => i.senderProfileId !== id && i.receiverProfileId !== id && i.userId !== id);
  reportsStore = reportsStore.filter((r) => r.targetProfileId !== id && r.reporterProfileId !== id);
  savedProfilesStore.delete(id);

  saveStoreToDisk();
  await deleteUserFromDb(id);
  res.json({ success: true, message: `User ${id} and associated profile deleted from database`, id });
};

apiRouter.post('/admin/users/:id/delete', handleDeleteUser);
apiRouter.delete('/admin/users/:id', handleDeleteUser);
apiRouter.delete('/users/:id', handleDeleteUser);

const handleDeleteProfile = async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  profilesStore = profilesStore.filter((p) => p.id !== id && p.userId !== id);
  interestsStore = interestsStore.filter((i) => i.senderProfileId !== id && i.receiverProfileId !== id);
  savedProfilesStore.delete(id);

  saveStoreToDisk();
  await deleteProfileFromDb(id);
  res.json({ success: true, message: `Profile ${id} deleted from database`, id });
};

apiRouter.post('/admin/profiles/:id/delete', handleDeleteProfile);
apiRouter.delete('/admin/profiles/:id', handleDeleteProfile);
apiRouter.delete('/profiles/:id', handleDeleteProfile);


apiRouter.get('/admin/verification-queue', (_req: Request, res: Response) => {
  const pending = profilesStore.filter(
    (p) => p.verificationStatus === 'under_review' || p.verificationStatus === 'pending'
  );
  const queue = pending.map((p) => ({
    profile: {
      id: p.id,
      displayName: p.displayName,
      age: p.age,
      location: p.location,
      denomination: p.faith?.denomination || 'Pentecostal',
      church: p.faith?.church || '',
      primaryPhotoUrl: p.photos && p.photos.length > 0 ? (p.photos.find((ph: any) => ph.isPrimary)?.url || p.photos[0].url) : null,
      verificationStatus: p.verificationStatus,
    },
    submittedAt: p.updatedAt || new Date().toISOString(),
    identityChecked: true,
    churchInformationProvided: Boolean(p.faith?.church),
  }));
  res.json(queue);
});

apiRouter.post('/admin/verifications/:id/review', (req: Request, res: Response) => {
  const { id } = req.params;
  const { decision } = req.body;
  const prof = profilesStore.find((p) => p.id === id || p.userId === id);
  if (prof) {
    prof.verificationStatus = decision;
    saveStoreToDisk();
  }
  res.json({ success: true, id, decision });
});

apiRouter.get('/admin/churches', (_req: Request, res: Response) => {
  res.json([
    { id: 'c1', name: 'Bethel AG Church', location: 'Kerala & Bangalore', pastor: 'Pastorate Council', denomination: 'Assemblies of God', verified: true },
    { id: 'c2', name: 'IPC Hebron', location: 'Kumbanad, Kerala', pastor: 'General Presbytery', denomination: 'Indian Pentecostal Church', verified: true },
    { id: 'c3', name: 'Church of God (Full Gospel)', location: 'State Council', pastor: 'Overseer', denomination: 'Church of God', verified: true },
    { id: 'c4', name: 'Sharon Fellowship Church', location: 'Tiruvalla, Kerala', pastor: 'General Council', denomination: 'Sharon Fellowship', verified: true },
  ]);
});

apiRouter.get('/admin/denominations', (_req: Request, res: Response) => {
  res.json([
    { id: 'd1', name: 'Assemblies of God (AG)', count: profilesStore.filter((p) => p.faith?.denomination?.toLowerCase().includes('assemblies of god') || p.faith?.denomination?.toLowerCase().includes('ag')).length },
    { id: 'd2', name: 'Indian Pentecostal Church (IPC)', count: profilesStore.filter((p) => p.faith?.denomination?.toLowerCase().includes('ipc')).length },
    { id: 'd3', name: 'Church of God (Full Gospel)', count: profilesStore.filter((p) => p.faith?.denomination?.toLowerCase().includes('church of god')).length },
    { id: 'd4', name: 'Sharon Fellowship Church', count: profilesStore.filter((p) => p.faith?.denomination?.toLowerCase().includes('sharon')).length },
  ]);
});

apiRouter.get('/admin/reports', (_req: Request, res: Response) => {
  res.json(reportsStore);
});

apiRouter.post('/admin/reports/:id/action', (req: Request, res: Response) => {
  const { id } = req.params;
  const { action } = req.body; // 'dismiss' | 'action_taken'
  reportsStore = reportsStore.map((r) => (r.id === id ? { ...r, status: action } : r));
  res.json({ success: true });
});

export default apiRouter;
