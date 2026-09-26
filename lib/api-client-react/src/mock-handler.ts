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

export const DEFAULT_SEED_PROFILES: any[] = [
  {
    isSeed: true,
    id: 'prof_user_grace',
    userId: 'user_grace',
    displayName: 'Grace Philip',
    dateOfBirth: '1999-04-12',
    age: 27,
    gender: 'woman',
    heightCm: 164,
    weightKg: 55,
    motherTongue: 'Malayalam',
    maritalStatus: 'Never Married',
    location: 'Kochi, Kerala',
    country: 'India',
    introduction: 'Born and raised in a God-fearing Pentecostal family. I accepted Jesus Christ as my personal Saviour at age 14 and was baptized in 2014. Currently working as a Senior Software Engineer at an MNC. Seeking a spiritually grounded partner who loves the Lord wholeheartedly.',
    published: true,
    verificationStatus: 'verified',
    faith: {
      religion: 'Christianity',
      denomination: 'Assemblies of God',
      church: 'Bethel AG Church, Ernakulam',
      baptismStatus: 'Water & Holy Spirit Baptized',
      baptismYear: 2014,
      churchInvolvement: 'Worship team vocalist and Sunday School teacher',
      ministryInvolvement: 'Youth fellowship and campus evangelism outreach',
      spiritualExpectations: 'A partner with personal prayer life, family altar values, and commitment to local church ministry.',
      faithDescription: 'Daily quiet time and Scripture reading form the anchor of my life. Christ is my center.',
    },
    education: {
      qualification: 'B.Tech in Computer Science',
      degree: 'Bachelor of Technology',
      institution: 'Model Engineering College, Kochi',
      fieldOfStudy: 'Computer Science and Engineering',
    },
    career: {
      occupation: 'Senior Software Engineer',
      company: 'ThoughtWorks',
      workLocation: 'Kochi (Hybrid)',
      employmentStatus: 'Full-time',
      workingAbroad: false,
      country: 'India',
    },
    family: {
      familyStatus: 'Upper Middle Class',
      fatherOccupation: 'Retired Government Officer',
      motherOccupation: 'High School Teacher',
      siblings: '1 elder brother (Married, UK)',
      background: 'Respected Pentecostal family with deep ministerial roots in Central Travancore.',
      values: 'God-first, mutual honor, hospitality, and dedication to kingdom work.',
    },
    preferences: {
      ageMin: 27,
      ageMax: 32,
      locations: ['Kerala', 'Bangalore', 'UK', 'Canada', 'UAE'],
      denomination: 'Assemblies of God / IPC / Church of God',
      education: 'B.Tech / Masters / Professional degree',
      occupation: 'IT / Engineering / Healthcare / Professional',
      workLocation: 'India or Abroad',
      familyValues: 'Traditional Christian values with mutual respect and spiritual maturity.',
      spiritualExpectations: 'Spirit-filled believer who prioritizes prayer and godly family life.',
      other: 'Non-smoker, teetotaler, clean habits.',
    },
    photos: [
      {
        id: 'ph_grace_1',
        url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
        isPrimary: true,
        visibility: 'all_members',
        objectPath: '',
        sortOrder: 1,
      },
    ],
    reasons: [],
  },
  {
    id: 'prof_user_joshua',
    userId: 'user_joshua',
    displayName: 'Dr. Joshua Varghese',
    dateOfBirth: '1996-11-20',
    age: 29,
    gender: 'man',
    heightCm: 178,
    weightKg: 72,
    motherTongue: 'Malayalam',
    maritalStatus: 'Never Married',
    location: 'Kottayam, Kerala',
    country: 'India',
    introduction: 'Consultant Physician with a heart for medical missions. Baptized in 2012, serving in worship ministry and medical camps.',
    published: true,
    verificationStatus: 'verified',
    faith: {
      religion: 'Christianity',
      denomination: 'Indian Pentecostal Church of God (IPC)',
      church: 'IPC Ebenezer, Kumbanad',
      baptismStatus: 'Water & Holy Spirit Baptized',
      baptismYear: 2012,
      churchInvolvement: 'Worship leader and youth committee convener',
      ministryInvolvement: 'Free medical outreach camps in rural tribal missions',
      spiritualExpectations: 'A partner dedicated to Christ who desires a godly family that honors God in all seasons.',
      faithDescription: "Grace saved me; medical missions are how I reflect Christ's healing hands.",
    },
    education: {
      qualification: 'M.D. General Medicine, MBBS',
      degree: 'Postgraduate Medical Doctor',
      institution: 'Christian Medical College (CMC), Vellore',
      fieldOfStudy: 'Internal Medicine',
    },
    career: {
      occupation: 'Consultant Physician',
      company: 'Caritas Hospital & Institute of Health',
      workLocation: 'Kottayam, Kerala',
      employmentStatus: 'Permanent Consultant',
      workingAbroad: false,
      country: 'India',
    },
    family: {
      familyStatus: 'Affluent / Established',
      fatherOccupation: 'Senior Pastor & Bible College Dean',
      motherOccupation: "Homemaker and Women's Fellowship Leader",
      siblings: '2 sisters (Both married, Doctors in USA and Trivandrum)',
      background: 'Prominent third-generation Pentecostal family known for pastoral stewardship and biblical integrity.',
      values: 'Biblical truth, hospitality, generosity, and strong commitment to pastoral fellowship.',
    },
    preferences: {
      ageMin: 24,
      ageMax: 28,
      locations: ['Kerala', 'Bangalore', 'Chennai', 'Abroad'],
      denomination: 'IPC / Assemblies of God / Sharon Fellowship',
      education: 'Doctorate / Medical / Engineering / Masters',
      occupation: 'Healthcare, Academic, Software or Corporate',
      workLocation: 'India or Abroad',
      familyValues: 'Christ-centered home where prayer and Scripture take preeminence.',
      spiritualExpectations: 'Spiritually baptized believer passionate about ministry.',
      other: 'Compassionate, teetotaler, God-reverent.',
    },
    photos: [
      {
        id: 'ph_joshua_1',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
        isPrimary: true,
        visibility: 'all_members',
        objectPath: '',
        sortOrder: 1,
      },
    ],
    reasons: [],
  },
  {
    id: 'prof_user_rebecca',
    userId: 'user_rebecca',
    displayName: 'Rebecca E. George',
    dateOfBirth: '1999-01-19',
    age: 27,
    gender: 'woman',
    heightCm: 162,
    weightKg: 52,
    motherTongue: 'Malayalam',
    maritalStatus: 'Never Married',
    location: 'Thiruvananthapuram, Kerala',
    country: 'India',
    introduction: 'Born-again believer and Assistant Professor in English Literature. Actively serving in church choir and youth fellowship.',
    published: true,
    verificationStatus: 'verified',
    faith: {
      religion: 'Christianity',
      denomination: 'Assemblies of God',
      church: 'Bethel AG Church, Trivandrum',
      baptismStatus: 'Water & Holy Spirit Baptized',
      baptismYear: 2015,
      churchInvolvement: 'Choir accompanist and Sunday school teacher',
      ministryInvolvement: 'Youth Bible study leader and medical mission coordinator',
      spiritualExpectations: 'A spirit-filled partner who honors Christ, maintains personal prayer life, and leads with love.',
      faithDescription: 'Walking in the grace of Jesus Christ since childhood.',
    },
    education: {
      qualification: 'Master of Arts (M.A.), UGC-NET',
      degree: 'Post Graduate',
      institution: 'University of Kerala',
      fieldOfStudy: 'English Literature and Linguistics',
    },
    career: {
      occupation: 'Assistant Professor',
      company: 'Mar Ivanios College',
      workLocation: 'Trivandrum',
      employmentStatus: 'Full-time Permanent',
      workingAbroad: false,
      country: 'India',
    },
    family: {
      familyStatus: 'Upper Middle Class',
      fatherOccupation: 'College Principal (Retired)',
      motherOccupation: 'Professor of Zoology',
      siblings: '1 Elder Sister (Married, Doctor in USA)',
      background: 'Well-respected Pentecostal family with deep community and spiritual roots in Travancore.',
      values: 'Christ-centered home, prayer altar, humility, and family hospitality.',
    },
    preferences: {
      ageMin: 27,
      ageMax: 32,
      locations: ['Kerala', 'Bangalore', 'Chennai', 'Abroad'],
      denomination: 'Assemblies of God / IPC / Church of God',
      education: 'Post Graduate / Professional / Doctorate',
      occupation: 'Academic, Research, Corporate, Medical, Tech',
      workLocation: 'India or Abroad',
      familyValues: 'Traditional godly values and mutual honor',
      spiritualExpectations: 'Active church member who honors biblical principles',
      other: 'Non-smoker, compassionate demeanor',
    },
    photos: [
      {
        id: 'ph_rebecca_1',
        url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
        isPrimary: true,
        visibility: 'all_members',
        objectPath: '',
        sortOrder: 1,
      },
    ],
    reasons: [],
  },
  {
    id: 'prof_user_samuel',
    userId: 'user_samuel',
    displayName: 'Samuel K. George',
    dateOfBirth: '1994-08-15',
    age: 31,
    gender: 'man',
    heightCm: 181,
    weightKg: 78,
    motherTongue: 'Malayalam',
    maritalStatus: 'Never Married',
    location: 'Dallas, Texas',
    country: 'United States',
    introduction: 'Senior Financial Analyst at JPMorgan Chase in Dallas, Texas. Born-again, spirit-filled believer involved in local Indian Pentecostal fellowship. Seeking a spiritually minded believer who loves the Lord and cherishes family.',
    published: true,
    verificationStatus: 'verified',
    faith: {
      religion: 'Christianity',
      denomination: 'Church of God',
      church: 'Hebron Church of God, Dallas',
      baptismStatus: 'Water & Holy Spirit Baptized',
      baptismYear: 2011,
      churchInvolvement: 'Youth treasurer and media coordinator',
      ministryInvolvement: 'Campus outreach and Thanksgiving mission sponsor',
      spiritualExpectations: 'A praying partner who loves church worship and wants to raise children in the fear of the Lord.',
      faithDescription: "Grateful for God's grace in every season of life.",
    },
    education: {
      qualification: 'M.S. in Finance & MBA',
      degree: 'Master of Science',
      institution: 'University of Texas at Dallas',
      fieldOfStudy: 'Corporate Finance and Investment Analysis',
    },
    career: {
      occupation: 'Senior Financial Analyst',
      company: 'JPMorgan Chase & Co.',
      workLocation: 'Dallas, TX',
      employmentStatus: 'Full-time (US Citizen)',
      workingAbroad: true,
      country: 'United States',
    },
    family: {
      familyStatus: 'Upper Middle Class',
      fatherOccupation: 'Structural Engineer (Retired)',
      motherOccupation: 'Registered Nurse (RN), Dallas Hospital',
      siblings: '1 younger brother (Civil Engineer, Houston)',
      background: 'Originated from Kumbanad, settled in the United States since 1998 with deep spiritual commitment.',
      values: 'Simplicity, prayer altar, hard work, and loyalty to Christian fellowship.',
    },
    preferences: {
      ageMin: 24,
      ageMax: 29,
      locations: ['USA', 'Canada', 'Kerala', 'Bangalore'],
      denomination: 'Church of God / Assemblies of God / IPC',
      education: 'Graduate / Post-Graduate / Professional',
      occupation: 'Finance, Tech, Healthcare, Education',
      workLocation: 'USA or willing to relocate to USA',
      familyValues: 'Respectful, family-oriented, prayer-focused home.',
      spiritualExpectations: 'Baptized believer with personal faith in Jesus Christ.',
      other: 'Teetotaler, humble and warm personality.',
    },
    photos: [
      {
        id: 'ph_samuel_1',
        url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
        isPrimary: true,
        visibility: 'all_members',
        objectPath: '',
        sortOrder: 1,
      },
    ],
    reasons: [],
  },
  {
    id: 'prof_user_sneha',
    userId: 'user_sneha',
    displayName: 'Sneha Philip',
    dateOfBirth: '2000-02-14',
    age: 26,
    gender: 'woman',
    heightCm: 160,
    weightKg: 50,
    motherTongue: 'Malayalam',
    maritalStatus: 'Never Married',
    location: 'Bangalore, Karnataka',
    country: 'India',
    introduction: 'UI/UX Designer working in a top product company in Bangalore. Active in worship team and youth mentorship. Seeking an earnest believer with sincere faith and high integrity.',
    published: true,
    verificationStatus: 'verified',
    faith: {
      religion: 'Christianity',
      denomination: 'Sharon Fellowship',
      church: 'Sharon Fellowship Church, Bangalore Central',
      baptismStatus: 'Water & Holy Spirit Baptized',
      baptismYear: 2017,
      churchInvolvement: 'Keyboardist and creative media coordinator',
      ministryInvolvement: 'Digital gospel tracts and youth camp mentorship',
      spiritualExpectations: 'A partner with gentle spiritual maturity who leads with prayer and biblical values.',
      faithDescription: 'Saved by Jesus Christ; eager to use creativity for His kingdom.',
    },
    education: {
      qualification: 'B.Des (Visual Communication)',
      degree: 'Bachelor of Design',
      institution: 'National Institute of Design (NID)',
      fieldOfStudy: 'Interactive Media & User Experience',
    },
    career: {
      occupation: 'Senior Product Designer',
      company: 'Swiggy HQ',
      workLocation: 'Bangalore',
      employmentStatus: 'Full-time',
      workingAbroad: false,
      country: 'India',
    },
    family: {
      familyStatus: 'Middle Class',
      fatherOccupation: 'Contractor & Building Consultant',
      motherOccupation: 'Bank Manager (Retired)',
      siblings: '1 elder sister (Architect, married, Bangalore)',
      background: "Rooted in God's word from Thiruvalla, Kerala; second generation in Bangalore.",
      values: "Honesty, respect for elders, prayer fellowship, and love for God's house.",
    },
    preferences: {
      ageMin: 26,
      ageMax: 31,
      locations: ['Bangalore', 'Kerala', 'Hyderabad', 'Europe', 'USA'],
      denomination: 'Sharon Fellowship / Assemblies of God / IPC',
      education: 'Engineering / Design / Business / Professional',
      occupation: 'Product, Engineering, Tech, Healthcare',
      workLocation: 'Bangalore, India or Abroad',
      familyValues: 'Loving, god-centered family with positive outlook.',
      spiritualExpectations: 'Born-again believer who loves worship.',
      other: 'Non-smoker, friendly, teetotaler.',
    },
    photos: [
      {
        id: 'ph_sneha_1',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        isPrimary: true,
        visibility: 'all_members',
        objectPath: '',
        sortOrder: 1,
      },
    ],
    reasons: [],
  },
  {
    id: 'prof_user_daniel',
    userId: 'user_daniel',
    displayName: 'Daniel K. Varghese',
    dateOfBirth: '1994-06-25',
    age: 31,
    gender: 'man',
    heightCm: 176,
    weightKg: 74,
    motherTongue: 'Malayalam',
    maritalStatus: 'Never Married',
    location: 'Dubai, UAE',
    country: 'United Arab Emirates',
    introduction: 'Cloud Solutions Architect based in Dubai. Water baptized and active member of International Pentecostal Fellowship Dubai. Seeking a God-fearing, spirit-filled partner who honors Christ.',
    published: true,
    verificationStatus: 'verified',
    faith: {
      religion: 'Christianity',
      denomination: 'Assemblies of God',
      church: 'International Pentecostal Fellowship, Dubai',
      baptismStatus: 'Water & Holy Spirit Baptized',
      baptismYear: 2010,
      churchInvolvement: 'Sound engineer, audio technician, and youth mentor',
      ministryInvolvement: 'Gulf mission support and Bible translation outreach partner',
      spiritualExpectations: 'A born-again partner who cherishes the Word of God and desires to walk in the fear of the Lord.',
      faithDescription: 'Jesus is my refuge and strength, an ever-present help in trouble.',
    },
    education: {
      qualification: 'B.Tech & AWS Certified Solutions Architect Professional',
      degree: 'Bachelor of Technology',
      institution: 'National Institute of Technology (NIT) Calicut',
      fieldOfStudy: 'Computer Science and Engineering',
    },
    career: {
      occupation: 'Cloud Solutions Architect',
      company: 'Amazon Web Services (AWS)',
      workLocation: 'Dubai Internet City',
      employmentStatus: 'Full-time',
      workingAbroad: true,
      country: 'United Arab Emirates',
    },
    family: {
      familyStatus: 'Upper Middle Class',
      fatherOccupation: 'Civil Engineer (Retired)',
      motherOccupation: 'School Vice Principal',
      siblings: '1 younger sister (Software Engineer, Kochi)',
      background: 'Traditional Pentecostal family with deep church involvement in Pathanamthitta.',
      values: 'Godly stewardship, integrity, prayer altar, and respect for all.',
    },
    preferences: {
      ageMin: 24,
      ageMax: 29,
      locations: ['Dubai', 'UAE', 'Kerala', 'Bangalore', 'Abroad'],
      denomination: 'Assemblies of God / IPC / Sharon Fellowship',
      education: 'B.Tech / MCA / Professional Degree',
      occupation: 'Software, Tech, Engineering, Healthcare',
      workLocation: 'UAE, India or Abroad',
      familyValues: 'Christ-centered home.',
      spiritualExpectations: 'Water baptized believer.',
      other: 'Clean habits, teetotaler.',
    },
    photos: [
      {
        id: 'ph_daniel_1',
        url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
        isPrimary: true,
        visibility: 'all_members',
        objectPath: '',
        sortOrder: 1,
      },
    ],
    reasons: [],
  },
];

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
