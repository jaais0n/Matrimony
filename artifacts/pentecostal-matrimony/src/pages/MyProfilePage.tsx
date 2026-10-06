import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { BlurImage } from '../components/ui/BlurImage';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Heart,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import {
  getGetMyProfileQueryKey,
  useGetMyProfile,
  useSaveMyProfile,
  isSeedProfile,
} from '@workspace/api-client-react';
import type { ProfileInput } from '@workspace/api-client-react';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { useUser } from '../auth';
import { PaymentModal, INDIAN_RUPEE_PLANS } from '../components/ui/PaymentModal';
import { compressImage, safeSetLocalStorage } from '../utils/storageHelper';

interface ProfilePhotoItem {
  id: string;
  url: string;
  isPrimary: boolean;
  sizeKB?: number;
}

const blankProfile: ProfileInput = {
  displayName: '',
  dateOfBirth: '',
  gender: 'woman',
  heightCm: '' as any,
  weightKg: null,
  motherTongue: '',
  maritalStatus: 'Never Married',
  location: '',
  country: 'India',
  introduction: '',
  published: true,
  faith: {
    religion: 'Christianity',
    denomination: 'Assemblies of God',
    church: '',
    baptismStatus: 'Water & Holy Spirit Baptized',
    baptismYear: '' as any,
    churchInvolvement: '',
    ministryInvolvement: '',
    spiritualExpectations: '',
    faithDescription: '',
  },
  education: {
    qualification: '',
    degree: '',
    institution: '',
    fieldOfStudy: '',
  },
  career: {
    occupation: '',
    company: '',
    workLocation: '',
    employmentStatus: 'Full-time',
    workingAbroad: false,
    country: 'India',
  },
  family: {
    familyStatus: 'Middle Class',
    fatherOccupation: '',
    motherOccupation: '',
    siblings: '',
    background: '',
    values: '',
  },
  preferences: {
    ageMin: '' as any,
    ageMax: '' as any,
    locations: [],
    denomination: '',
    education: '',
    occupation: '',
    workLocation: '',
    familyValues: '',
    spiritualExpectations: '',
    other: '',
  },
};

type ActiveHubTab = 'profile' | 'account' | 'privacy' | 'membership' | 'help';

export function MyProfilePage() {
  const { user } = useUser();
  const me = useGetMyProfile();
  const save = useSaveMyProfile();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<ActiveHubTab>('profile');
  const [form, setForm] = useState<ProfileInput>(blankProfile);
  const [photos, setPhotos] = useState<ProfilePhotoItem[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Account settings states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);

  // Privacy states
  const [photoVisibility, setPhotoVisibility] = useState<'all_members' | 'connections_only' | 'on_request'>('all_members');
  const [contactVisibility, setContactVisibility] = useState<'mutual_only' | 'private'>('mutual_only');
  const [profilePubliclyVisible, setProfilePubliclyVisible] = useState(true);
  const [privacyToast, setPrivacyToast] = useState(false);

  // Help & Prayer Request state
  const [prayerRequest, setPrayerRequest] = useState('');
  const [prayerSent, setPrayerSent] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Membership & Payment states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activePlanId, setActivePlanId] = useState<'free' | 'premium' | 'elite'>('free');

  useEffect(() => {
    const checkPlan = () => {
      try {
        const rawAuth = localStorage.getItem('pm_auth_user');
        if (rawAuth) {
          const authUser = JSON.parse(rawAuth);
          if (authUser.planTier === 'elite' || authUser.plan?.toLowerCase().includes('elite')) {
            setActivePlanId('elite');
            return;
          }
          if (authUser.planTier === 'premium' || authUser.plan?.toLowerCase().includes('premium') || authUser.isVip) {
            setActivePlanId('premium');
            return;
          }
        }
        const accountsRaw = localStorage.getItem('pm_registered_accounts');
        if (accountsRaw && user?.id) {
          const accounts = JSON.parse(accountsRaw);
          const matched = accounts.find(
            (a: any) =>
              a.id === user.id ||
              (user.primaryEmailAddress?.emailAddress && a.email?.toLowerCase() === user.primaryEmailAddress.emailAddress.toLowerCase())
          );
          if (matched) {
            if (matched.planTier === 'elite' || matched.plan?.toLowerCase().includes('elite')) {
              setActivePlanId('elite');
              return;
            }
            if (matched.planTier === 'premium' || matched.plan?.toLowerCase().includes('premium') || matched.isVip) {
              setActivePlanId('premium');
              return;
            }
          }
        }
        setActivePlanId('free');
      } catch {
        setActivePlanId('free');
      }
    };
    checkPlan();
    window.addEventListener('pm:sync', checkPlan);
    return () => window.removeEventListener('pm:sync', checkPlan);
  }, [user?.id, user?.primaryEmailAddress?.emailAddress]);

  useEffect(() => {
    if (!user?.id) {
      setForm(blankProfile);
      setPhotos([]);
      return;
    }

    const currentUserId = user.id;

    // Reset form immediately on account switch so previous account's details never bleed through
    setForm({
      ...blankProfile,
      displayName: user.fullName || '',
    });
    setPhotos([]);

    // 1. Database-first fetch for this specific logged-in user
    fetch(`/api/profiles/me?userId=${encodeURIComponent(currentUserId)}`)
      .then((r) => r.json())
      .then((p) => {
        if (p && !p.notFound && (p.displayName || p.location || p.introduction)) {
          setForm({
            displayName: p.displayName || user.fullName || '',
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
            gender: (p.gender as ProfileInput['gender']) || 'woman',
            heightCm: p.heightCm || ('' as any),
            weightKg: p.weightKg || null,
            motherTongue: p.motherTongue || '',
            maritalStatus: p.maritalStatus || 'Never Married',
            location: p.location || '',
            country: p.country || 'India',
            introduction: p.introduction || '',
            published: p.published !== undefined ? p.published : true,
            faith: p.faith || blankProfile.faith,
            education: p.education || blankProfile.education,
            career: p.career || blankProfile.career,
            family: p.family || blankProfile.family,
            preferences: p.preferences || blankProfile.preferences,
          });

          if (p.photos && p.photos.length > 0) {
            const loaded: ProfilePhotoItem[] = p.photos.map((ph: any, idx: number) => ({
              id: ph.id || `photo_${idx}`,
              url: ph.url,
              isPrimary: ph.isPrimary !== undefined ? ph.isPrimary : idx === 0,
            }));
            if (!loaded.some((ph) => ph.isPrimary) && loaded.length > 0) {
              loaded[0].isPrimary = true;
            }
            setPhotos(loaded);
          }
          return;
        }

        // 2. Fallback to localStorage if server returns empty
        const userSpecificKey = `pm_user_profile_${currentUserId}`;
        const rawSaved = localStorage.getItem(userSpecificKey) || localStorage.getItem('pm_my_profile');
        if (rawSaved) {
          try {
            const p = JSON.parse(rawSaved);
            if (p && !isSeedProfile(p) && (p.displayName || p.location || p.introduction)) {
              setForm({
                displayName: p.displayName || user.fullName || '',
                dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
                gender: (p.gender as ProfileInput['gender']) || 'woman',
                heightCm: p.heightCm || ('' as any),
                weightKg: p.weightKg || null,
                motherTongue: p.motherTongue || '',
                maritalStatus: p.maritalStatus || 'Never Married',
                location: p.location || '',
                country: p.country || 'India',
                introduction: p.introduction || '',
                published: p.published !== undefined ? p.published : true,
                faith: p.faith || blankProfile.faith,
                education: p.education || blankProfile.education,
                career: p.career || blankProfile.career,
                family: p.family || blankProfile.family,
                preferences: p.preferences || blankProfile.preferences,
              });

              if (p.photos && p.photos.length > 0) {
                const loaded: ProfilePhotoItem[] = p.photos.map((ph: any, idx: number) => ({
                  id: ph.id || `photo_${idx}`,
                  url: ph.url,
                  isPrimary: ph.isPrimary !== undefined ? ph.isPrimary : idx === 0,
                }));
                if (!loaded.some((ph) => ph.isPrimary) && loaded.length > 0) {
                  loaded[0].isPrimary = true;
                }
                setPhotos(loaded);
              }
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, [user?.id, user?.fullName]);

  // Calculate profile completeness score
  const calculateCompleteness = () => {
    let score = 0;
    if (photos.length > 0) score += 25;
    if (form.displayName && form.dateOfBirth && form.gender) score += 20;
    if (form.faith.denomination && form.faith.church) score += 20;
    if (form.career.occupation || form.education.qualification) score += 15;
    if (form.location) score += 10;
    if (form.introduction && form.introduction.length > 20) score += 10;
    return Math.min(score, 100);
  };

  const completeness = calculateCompleteness();

  const setTop = (key: keyof ProfileInput, val: any) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const setSectionField = (section: 'faith' | 'education' | 'career' | 'family' | 'preferences', field: string, val: any) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: val,
      },
    }));
  };

  const handleUploadPhoto = async (file: File, replaceIndex?: number) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    setUploadSuccessMessage(null);

    try {
      const compressedDataUrl = await compressImage(file);
      const newPhotoItem: ProfilePhotoItem = {
        id: `photo_${Date.now()}`,
        url: compressedDataUrl,
        isPrimary: replaceIndex !== undefined ? photos[replaceIndex]?.isPrimary || false : photos.length === 0,
      };

      let updatedPhotos: ProfilePhotoItem[];
      if (replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < photos.length) {
        updatedPhotos = [...photos];
        updatedPhotos[replaceIndex] = newPhotoItem;
      } else {
        if (photos.length >= 3) {
          alert('Maximum 3 photos allowed. You can replace or remove an existing photo.');
          setIsUploadingPhoto(false);
          return;
        }
        updatedPhotos = [...photos, newPhotoItem];
      }

      if (!updatedPhotos.some((ph) => ph.isPrimary) && updatedPhotos.length > 0) {
        updatedPhotos[0].isPrimary = true;
      }

      setPhotos(updatedPhotos);

      // Auto-save photos so changes persist immediately
      if (user?.id) {
        const updatedForm = { ...form, photos: updatedPhotos as any };
        setForm(updatedForm);
        safeSetLocalStorage(`pm_user_profile_${user.id}`, { ...updatedForm, photos: updatedPhotos });
        safeSetLocalStorage('pm_my_profile', { ...updatedForm, photos: updatedPhotos });
        try {
          const raw = localStorage.getItem('pm_registered_profiles');
          const profiles = (raw ? JSON.parse(raw) : []).filter((p: any) => !isSeedProfile(p));
          const idx = profiles.findIndex((p: any) => p.userId === user.id || p.id === `prof_${user.id}`);
          if (idx >= 0) {
            profiles[idx].photos = updatedPhotos;
            safeSetLocalStorage('pm_registered_profiles', profiles);
          }
        } catch {}
      }

      setUploadSuccessMessage(`✓ Photo uploaded successfully`);
      setTimeout(() => setUploadSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to compress/upload photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSetPrimary = (index: number) => {
    const updated = photos.map((ph, idx) => ({
      ...ph,
      isPrimary: idx === index,
    }));
    setPhotos(updated);
    if (user?.id) {
      safeSetLocalStorage(`pm_user_profile_${user.id}`, { ...form, photos: updated });
      safeSetLocalStorage('pm_my_profile', { ...form, photos: updated });
    }
    setUploadSuccessMessage(`Primary display photo updated.`);
    setTimeout(() => setUploadSuccessMessage(null), 3000);
  };

  const handleRemovePhoto = (index: number) => {
    let updated = photos.filter((_, idx) => idx !== index);
    if (updated.length > 0 && !updated.some((p) => p.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setPhotos(updated);
    if (user?.id) {
      const updatedProfile = {
        ...form,
        id: (form as any).id || `prof_${user.id}`,
        userId: user.id,
        photos: updated,
        primaryPhotoUrl: updated[0]?.url || '',
      };
      safeSetLocalStorage(`pm_user_profile_${user.id}`, updatedProfile);
      safeSetLocalStorage('pm_my_profile', updatedProfile);

      // Directly persist photo deletion to Neon PostgreSQL database
      fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile),
      }).catch(() => {});
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...form,
      published: true,
      photos: photos as any,
    };

    save.mutate(
      { data: dataToSave },
      {
        onSuccess: () => {
          setSaved(true);
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
          setTimeout(() => setSaved(false), 3000);
        },
      }
    );

    // Save directly to localStorage for instant persistence
    if (user?.id) {
      safeSetLocalStorage(`pm_user_profile_${user.id}`, dataToSave);
      safeSetLocalStorage('pm_my_profile', dataToSave);
      try {
        const raw = localStorage.getItem('pm_registered_profiles');
        const profiles = (raw ? JSON.parse(raw) : []).filter((p: any) => !isSeedProfile(p));
        const fullProfile = {
          id: `prof_${user.id}`,
          userId: user.id,
          ...dataToSave,
          updatedAt: new Date().toISOString(),
        };
        const idx = profiles.findIndex((p: any) => p.userId === user.id || p.id === `prof_${user.id}`);
        if (idx >= 0) {
          profiles[idx] = fullProfile;
        } else {
          profiles.push(fullProfile);
        }
        safeSetLocalStorage('pm_registered_profiles', profiles.filter((p: any) => !isSeedProfile(p)));

        // Sync to backend API server (cross-device)
        fetch('/api/profiles/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullProfile),
        }).catch(() => {});
      } catch {}
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match. Please verify.' });
      return;
    }

    try {
      const rawAccounts = localStorage.getItem('pm_registered_accounts');
      if (rawAccounts) {
        const accounts = JSON.parse(rawAccounts);
        const idx = accounts.findIndex((a: any) => a.id === user?.id || (user?.primaryEmailAddress?.emailAddress && a.email === user.primaryEmailAddress.emailAddress));
        if (idx >= 0) {
          accounts[idx].password = newPassword;
          localStorage.setItem('pm_registered_accounts', JSON.stringify(accounts));
        }
      }
    } catch {}

    setPasswordMessage({ type: 'success', text: 'Password successfully updated! Your account is protected.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordMessage(null), 4000);
  };

  const handleSavePrivacy = () => {
    safeSetLocalStorage('pm_privacy_settings', {
      photoVisibility,
      contactVisibility,
      profilePubliclyVisible,
    });
    setPrivacyToast(true);
    setTimeout(() => setPrivacyToast(false), 3000);
  };

  const handleSendPrayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerRequest.trim()) return;
    setPrayerSent(true);
    setPrayerRequest('');
    setTimeout(() => setPrayerSent(false), 5000);
  };

  const primaryPhoto = photos.find((p) => p.isPrimary)?.url || photos[0]?.url;
  const memberId = user?.id ? `PM-${user.id.replace('user_', '').toUpperCase().slice(0, 8)}` : 'PM-MEM';

  const faqs = [
    {
      q: 'How does Pentecostal church & baptism verification work?',
      a: 'Our pastoral administration reviews your submitted home church, pastor name, and water/Holy Spirit baptism details. Once confirmed, a verified badge is placed on your card.',
    },
    {
      q: 'Can I keep my photos private until I accept an interest?',
      a: 'Yes! In the Privacy & Safety tab, you can set Photo Visibility to "Connections Only" or "On Request Only" so only candidates you approve can view your gallery.',
    },
    {
      q: 'How do Express Interests work?',
      a: 'You can express interest in any published profile. When the other candidate accepts, both of you can message directly and exchange contact numbers.',
    },
    {
      q: 'Is my phone number and email publicly visible?',
      a: 'No. Your phone number and email are kept confidential and are only shared when you mutually accept an interest with another member.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-16 text-slate-900">
      {/* Top Banner / Account Header */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 text-white pt-8 pb-8 sm:pb-10 px-4 sm:px-6 relative overflow-hidden border-b border-rose-900/40">
        <div className="pointer-events-none absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-10 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="mx-auto max-w-5xl relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Profile Avatar with Camera Trigger */}
              <div className="relative group">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden border-2 border-rose-400/40 bg-slate-800 shadow-md">
                  {primaryPhoto ? (
                    <BlurImage src={primaryPhoto} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-rose-900/50 text-rose-300">
                      <User size={36} />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md transition group-hover:scale-105"
                  title="Update Photo"
                >
                  <Camera size={13} />
                </button>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {form.displayName || user?.fullName || 'My Account'}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    <ShieldCheck size={11} /> Verified Member
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-rose-200/80">
                  <span className="font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded-md text-amber-200 font-semibold tracking-wide">
                    {memberId}
                  </span>
                  <span>•</span>
                  <span>{form.faith.denomination || 'Pentecostal Believer'}</span>
                  {form.location && (
                    <>
                      <span>•</span>
                      <span>{form.location}</span>
                    </>
                  )}
                </div>

                {/* Profile Completeness Bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-36 sm:w-48 bg-white/15 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-rose-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-amber-200">
                    {completeness}% Profile Complete
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
              <Link
                href="/discover"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm backdrop-blur-xs"
              >
                Browse Candidates →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Hub with Sidebar Navigation */}
      <div className="mx-auto max-w-5xl px-3 sm:px-6 mt-6 sm:mt-8">
        {/* Mobile Horizontal Navigation Tabs (Visible on Mobile/Tablet < lg) */}
        <div className="lg:hidden mb-4 overflow-x-auto no-scrollbar flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          {[
            { id: 'profile', label: 'Edit Profile', icon: User, color: 'text-rose-600' },
            { id: 'account', label: 'Account & Password', icon: KeyRound, color: 'text-slate-500' },
            { id: 'privacy', label: 'Privacy & Safety', icon: Shield, color: 'text-slate-500' },
            { id: 'membership', label: 'Plans & Quotas', icon: Award, color: 'text-amber-500' },
            { id: 'help', label: 'Help & Support', icon: HelpCircle, color: 'text-purple-600' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as typeof activeTab)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : item.color} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left Navigation Sidebar - Desktop only */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-6 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Account Hub
              </div>

              {/* Tab 1: Edit Profile */}
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                  activeTab === 'profile'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-rose-50/80 hover:text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <User size={16} className={activeTab === 'profile' ? 'text-white' : 'text-rose-600'} />
                  <span className="truncate">Edit Matrimonial Profile</span>
                </div>
                {activeTab === 'profile' && <ChevronRight size={14} />}
              </button>

              {/* Tab 2: Account Settings */}
              <button
                type="button"
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                  activeTab === 'account'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-rose-50/80 hover:text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <KeyRound size={16} className={activeTab === 'account' ? 'text-white' : 'text-slate-500'} />
                  <span className="truncate">Account & Password</span>
                </div>
                {activeTab === 'account' && <ChevronRight size={14} />}
              </button>

              {/* Tab 3: Privacy & Safety */}
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                  activeTab === 'privacy'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-rose-50/80 hover:text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Shield size={16} className={activeTab === 'privacy' ? 'text-white' : 'text-slate-500'} />
                  <span className="truncate">Privacy & Safety</span>
                </div>
                {activeTab === 'privacy' && <ChevronRight size={14} />}
              </button>

              {/* Tab 4: Plans & Quotas */}
              <button
                type="button"
                onClick={() => setActiveTab('membership')}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                  activeTab === 'membership'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-rose-50/80 hover:text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Award size={16} className={activeTab === 'membership' ? 'text-white' : 'text-amber-500'} />
                  <span className="truncate">Plans & Quotas</span>
                </div>
                {activeTab === 'membership' && <ChevronRight size={14} />}
              </button>

              {/* Tab 5: Help & Support Center */}
              <button
                type="button"
                onClick={() => setActiveTab('help')}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                  activeTab === 'help'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-rose-50/80 hover:text-rose-800'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <HelpCircle size={16} className={activeTab === 'help' ? 'text-white' : 'text-purple-600'} />
                  <span className="truncate">Help & Pastoral Care</span>
                </div>
                {activeTab === 'help' && <ChevronRight size={14} />}
              </button>

              {/* Pastoral Quote Card */}
              <div className="pt-3 border-t border-slate-100 px-3 text-[11px] text-slate-500 italic">
                “He who finds a wife finds what is good and receives favor from the Lord.”
                <span className="block text-[10px] font-bold text-rose-700 not-italic mt-0.5">— Proverbs 18:22</span>
              </div>
            </div>
          </div>

          {/* Right Main Panel */}
          <div className="lg:col-span-3">

            {/* TAB 1: EDIT MATRIMONIAL PROFILE (ONLY PLACE TO EDIT) */}
            {activeTab === 'profile' && (
              <div className="rounded-2xl border border-rose-100 bg-white p-6 sm:p-8 shadow-sm relative">
                <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1 border border-rose-200">
                      Matrimonial Profile Editor
                    </span>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">
                      Edit Profile Details
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      This is the only area where your candidate profile details can be edited.
                    </p>
                  </div>
                  {saved && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-2xs self-start">
                      <Check size={14} className="stroke-[3]" /> Profile Saved & Active
                    </span>
                  )}
                </div>

                <form onSubmit={submit} className="space-y-8">
                  {/* Photo Management Section */}
                  <div className="rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50/40 to-white p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-rose-100 pb-3 mb-4">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                          <Camera size={14} className="text-rose-600" />
                          Profile Photos ({photos.length} of 3)
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Upload clear, modest photos. Primary photo is displayed in search cards.
                        </p>
                      </div>
                    </div>

                    {uploadSuccessMessage && (
                      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-2xs">
                        <span>{uploadSuccessMessage}</span>
                        <button type="button" onClick={() => setUploadSuccessMessage(null)}>
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* 3 Photo Slots Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[0, 1, 2].map((slotIndex) => {
                        const photo = photos[slotIndex];
                        const slotTitle =
                          slotIndex === 0 ? 'Primary Portrait' : slotIndex === 1 ? 'Secondary Photo' : 'Third Photo';

                        if (photo) {
                          return (
                            <div
                              key={photo.id || slotIndex}
                              className={`group relative rounded-2xl border overflow-hidden bg-white shadow-2xs transition ${
                                photo.isPrimary ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 hover:border-rose-300'
                              }`}
                            >
                              <div className="aspect-[4/5] w-full overflow-hidden bg-slate-100 relative">
                                <BlurImage
                                  src={photo.url}
                                  alt={`Photo ${slotIndex + 1}`}
                                  className="h-full w-full object-cover"
                                  showSpinner
                                />
                                {photo.isPrimary && (
                                  <div className="absolute top-2 left-2 z-10">
                                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-700 text-white text-[10px] font-bold px-2 py-0.5 shadow-sm">
                                      <Star size={10} className="fill-white" /> Primary
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-1">
                                {!photo.isPrimary ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimary(slotIndex)}
                                    className="text-[11px] font-bold text-slate-700 hover:text-rose-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition"
                                  >
                                    <Star size={12} /> Set Primary
                                  </button>
                                ) : (
                                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 px-2 py-1">
                                    <Check size={12} /> Primary
                                  </span>
                                )}

                                <div className="flex items-center gap-1">
                                  <label className="cursor-pointer text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 transition">
                                    Replace
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleUploadPhoto(f, slotIndex);
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(slotIndex)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"
                                    title="Delete photo"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <label
                            key={slotIndex}
                            className="group cursor-pointer relative aspect-[4/5] rounded-2xl border-2 border-dashed border-rose-200 hover:border-rose-400 bg-white/80 hover:bg-rose-50/40 flex flex-col items-center justify-center p-4 text-center transition shadow-2xs"
                          >
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingPhoto}
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadPhoto(f);
                              }}
                            />
                            <div className="h-10 w-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-700 group-hover:text-white transition shadow-2xs mb-2">
                              <Upload size={18} />
                            </div>
                            <span className="text-xs font-bold text-slate-800 group-hover:text-rose-700 transition">
                              {slotTitle}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Click to upload
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {isUploadingPhoto && (
                      <div className="mt-4 text-center text-xs font-bold text-rose-700 animate-pulse flex items-center justify-center gap-1.5">
                        <Sparkles size={14} /> Uploading & optimizing photo...
                      </div>
                    )}
                  </div>

                  {/* Section 1: Personal Details */}
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">1</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Personal Details
                      </h3>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Display Name</label>
                        <input
                          type="text"
                          value={form.displayName}
                          onChange={(e) => setTop('displayName', e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Date of Birth</label>
                        <input
                          type="date"
                          value={form.dateOfBirth}
                          onChange={(e) => setTop('dateOfBirth', e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Height (cm)</label>
                        <input
                          type="number"
                          value={form.heightCm}
                          onChange={(e) => setTop('heightCm', Number(e.target.value))}
                          placeholder="e.g. 165"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Mother Tongue</label>
                        <input
                          type="text"
                          value={form.motherTongue}
                          onChange={(e) => setTop('motherTongue', e.target.value)}
                          placeholder="e.g. Malayalam, Tamil, English"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Location (City, State)</label>
                        <input
                          type="text"
                          value={form.location}
                          onChange={(e) => setTop('location', e.target.value)}
                          placeholder="e.g. Kochi, Kerala"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Marital Status</label>
                        <select
                          value={form.maritalStatus}
                          onChange={(e) => setTop('maritalStatus', e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        >
                          <option value="Never Married">Never Married</option>
                          <option value="Widowed">Widowed</option>
                          <option value="Divorced">Divorced (Biblical grounds)</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Personal Testimony & Introduction</label>
                      <textarea
                        value={form.introduction}
                        onChange={(e) => setTop('introduction', e.target.value)}
                        placeholder="Share your spiritual journey, how you came to Christ, and what values matter most to you..."
                        className="mt-1 min-h-[90px] w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Section 2: Faith & Church Life */}
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">2</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Faith & Spiritual Life
                      </h3>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Denomination</label>
                        <input
                          type="text"
                          value={form.faith.denomination}
                          onChange={(e) => setSectionField('faith', 'denomination', e.target.value)}
                          placeholder="e.g. Assemblies of God, IPC, Church of God"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Home Church</label>
                        <input
                          type="text"
                          value={form.faith.church}
                          onChange={(e) => setSectionField('faith', 'church', e.target.value)}
                          placeholder="e.g. AG Centre, IPC Ebenezer"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Baptism Status</label>
                        <input
                          type="text"
                          value={form.faith.baptismStatus}
                          onChange={(e) => setSectionField('faith', 'baptismStatus', e.target.value)}
                          placeholder="e.g. Water & Holy Spirit Baptized"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Ministry Involvement</label>
                        <input
                          type="text"
                          value={form.faith.ministryInvolvement}
                          onChange={(e) => setSectionField('faith', 'ministryInvolvement', e.target.value)}
                          placeholder="e.g. Worship team, Sunday School, Youth leader"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Education & Career */}
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">3</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Education & Career
                      </h3>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Qualification / Degree</label>
                        <input
                          type="text"
                          value={form.education.qualification}
                          onChange={(e) => setSectionField('education', 'qualification', e.target.value)}
                          placeholder="e.g. B.Tech, MBA, MBBS"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Field of Study</label>
                        <input
                          type="text"
                          value={form.education.fieldOfStudy}
                          onChange={(e) => setSectionField('education', 'fieldOfStudy', e.target.value)}
                          placeholder="e.g. Computer Science, Medicine, Finance"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Occupation</label>
                        <input
                          type="text"
                          value={form.career.occupation}
                          onChange={(e) => setSectionField('career', 'occupation', e.target.value)}
                          placeholder="e.g. Software Engineer, Physician"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Company / Employer</label>
                        <input
                          type="text"
                          value={form.career.company}
                          onChange={(e) => setSectionField('career', 'company', e.target.value)}
                          placeholder="e.g. Tech Corp, Hospital"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Partner Preferences */}
                  <div>
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">4</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Partner Expectations & Preferences
                      </h3>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Preferred Denomination</label>
                        <input
                          type="text"
                          value={form.preferences.denomination}
                          onChange={(e) => setSectionField('preferences', 'denomination', e.target.value)}
                          placeholder="e.g. Any Pentecostal, Assemblies of God"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Preferred Occupation / Education</label>
                        <input
                          type="text"
                          value={form.preferences.occupation}
                          onChange={(e) => setSectionField('preferences', 'occupation', e.target.value)}
                          placeholder="e.g. Professional, Graduate, Any"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-6">
                    <p className="text-xs text-slate-500">
                      Changes are synchronized automatically with cloud servers.
                    </p>
                    <button
                      type="submit"
                      disabled={save.isPending}
                      className="w-full sm:w-auto rounded-xl bg-rose-700 px-8 py-3 text-xs font-bold text-white uppercase tracking-wider shadow-md hover:bg-rose-800 transition active:scale-[0.98] cursor-pointer"
                    >
                      {save.isPending ? 'Saving Profile...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: ACCOUNT SETTINGS & PASSWORD */}
            {activeTab === 'account' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Security & Login Credentials
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Account Settings
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Manage your email, registered phone, and account access password.
                  </p>
                </div>

                {/* Account Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                      <Mail size={14} className="text-rose-600" />
                      <span>Registered Email Address</span>
                    </div>
                    <div className="font-semibold text-slate-800 text-sm">
                      {user?.primaryEmailAddress?.emailAddress || 'Not set'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>Account ID</span>
                    </div>
                    <div className="font-mono text-slate-800 text-sm font-semibold">
                      {memberId}
                    </div>
                  </div>
                </div>

                {/* Change Password Form */}
                <div className="rounded-2xl border border-slate-200/80 p-5 bg-slate-50/40">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3">
                    <KeyRound size={15} className="text-rose-600" />
                    Change Account Password
                  </h3>

                  {passwordMessage && (
                    <div
                      className={`mb-4 rounded-xl border p-3 text-xs font-semibold flex items-center gap-2 ${
                        passwordMessage.type === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-rose-200 bg-rose-50 text-rose-800'
                      }`}
                    >
                      {passwordMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>{passwordMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        New Password (Min. 6 Characters)
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="rounded-xl bg-slate-900 text-white px-5 py-2.5 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                    >
                      Update Password
                    </button>
                  </form>
                </div>

                {/* Notifications Preferences */}
                <div className="pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 mb-3">
                    <Bell size={15} className="text-amber-600" />
                    Communication & Notifications
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Match Interest Alerts</div>
                        <div className="text-[11px] text-slate-500">Notify when another verified candidate expresses interest in your profile</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationsEnabled}
                        onChange={(e) => setNotificationsEnabled(e.target.checked)}
                        className="h-4 w-4 rounded-sm text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Pastoral & Platform Announcements</div>
                        <div className="text-[11px] text-slate-500">Receive periodic faith encouragement and matrimonial events bulletins</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailAlertsEnabled}
                        onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                        className="h-4 w-4 rounded-sm text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PRIVACY & SAFETY */}
            {activeTab === 'privacy' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 border border-emerald-200">
                    Privacy Controls
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Privacy & Visibility Settings
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Configure who can see your photos, contact information, and matrimonial card.
                  </p>
                </div>

                {privacyToast && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Privacy preferences saved successfully!</span>
                  </div>
                )}

                {/* Photo Visibility */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Photo Visibility
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'all_members', title: 'All Members', desc: 'Visible to all authenticated members' },
                      { id: 'connections_only', title: 'Connections Only', desc: 'Visible only after mutual interest' },
                      { id: 'on_request', title: 'On Request', desc: 'Blurred until you explicitly grant access' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPhotoVisibility(opt.id as any)}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                          photoVisibility === opt.id
                            ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                          <span>{opt.title}</span>
                          {photoVisibility === opt.id && <Check size={14} className="text-rose-600" />}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Number Visibility */}
                <div className="space-y-3 pt-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Phone & WhatsApp Visibility
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setContactVisibility('mutual_only')}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                        contactVisibility === 'mutual_only'
                          ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span>Mutual Interest Only</span>
                        {contactVisibility === 'mutual_only' && <Check size={14} className="text-rose-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Only candidates whose interest you have mutually accepted can view your contact.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setContactVisibility('private')}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                        contactVisibility === 'private'
                          ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span>Strictly Private</span>
                        {contactVisibility === 'private' && <Check size={14} className="text-rose-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Contact is never disclosed automatically; only direct in-app messaging.
                      </div>
                    </button>
                  </div>
                </div>

                {/* Discovery Listing Toggle */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
                    <div>
                      <div className="text-xs font-bold text-slate-900">Show Profile in Public Directory</div>
                      <div className="text-[11px] text-slate-500">
                        When enabled, your profile appears in the Discover & Search sections for matching candidates.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={profilePubliclyVisible}
                      onChange={(e) => setProfilePubliclyVisible(e.target.checked)}
                      className="h-4 w-4 rounded-sm text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSavePrivacy}
                    className="rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-6 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Save Privacy Settings
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: MEMBERSHIP & PLANS */}
            {activeTab === 'membership' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                    Membership Tier
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Plans & Monthly Quotas
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Review your active quota in Indian Rupees (₹) for sending interests, direct messaging, and profile visibility.
                  </p>
                </div>

                {/* Active Plan Card */}
                <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50/50 p-5 sm:p-6 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                          <Award size={14} /> Active Plan:
                        </span>
                        <span className="rounded-full bg-rose-700 text-white px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
                          {INDIAN_RUPEE_PLANS[activePlanId].badge}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mt-1">
                        {INDIAN_RUPEE_PLANS[activePlanId].name}
                      </h3>
                      <div className="mt-1 flex items-baseline gap-1.5 text-xs text-slate-600">
                        <span className="font-extrabold text-slate-900">
                          {INDIAN_RUPEE_PLANS[activePlanId].priceInr === 0 ? '₹0 Free' : `₹${INDIAN_RUPEE_PLANS[activePlanId].priceInr.toLocaleString('en-IN')}`}
                        </span>
                        <span>•</span>
                        <span>{INDIAN_RUPEE_PLANS[activePlanId].durationLabel}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold">{INDIAN_RUPEE_PLANS[activePlanId].monthlyEquivalent}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 max-w-md">
                        {INDIAN_RUPEE_PLANS[activePlanId].description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPaymentModalOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-5 py-2.5 text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
                    >
                      {activePlanId === 'free' ? 'Upgrade Plan (₹ INR) →' : 'Extend / Change Plan →'}
                    </button>
                  </div>

                  {/* Quotas Counter */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-rose-100">
                    <div className="p-3 bg-white rounded-xl border border-rose-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Express Interests</div>
                      <div className="text-lg font-black text-rose-700 mt-0.5">
                        {activePlanId === 'free' ? '10 Left' : 'Unlimited'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {activePlanId === 'free' ? 'Renews on 1st of month' : 'Unmetered VIP Privileges'}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-rose-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Direct Chat</div>
                      <div className="text-lg font-black text-emerald-700 mt-0.5">Unlimited</div>
                      <div className="text-[10px] text-slate-500">With mutual connections</div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-rose-100">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Verification</div>
                      <div className="text-lg font-black text-blue-700 mt-0.5">
                        {activePlanId === 'free' ? 'Standard Review' : 'Priority Review'}
                      </div>
                      <div className="text-[10px] text-slate-500">100% Manual pastoral check</div>
                    </div>
                  </div>
                </div>

                {/* VIP Perks Highlight */}
                <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Looking for Dedicated Matchmaking Support?
                  </h4>
                  <p className="text-xs text-slate-600 mb-3">
                    Our pastoral team assists families seeking like-minded Pentecostal partners with personalized guidance and family coordination.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPaymentModalOpen(true)}
                    className="text-xs font-bold text-rose-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    View All Indian Rupee Plans (₹ INR) <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: HELP CENTER & PASTORAL SUPPORT */}
            {activeTab === 'help' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 uppercase tracking-wider mb-1">
                    Support & Guidance
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Help Center & Pastoral Care
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Frequently asked questions, community guidelines, and pastoral prayer support.
                  </p>
                </div>

                {/* FAQ Accordion */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Frequently Asked Questions
                  </h3>

                  <div className="space-y-2">
                    {faqs.map((faq, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 overflow-hidden transition"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                          className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
                        >
                          <span>{faq.q}</span>
                          <span className="text-slate-400 text-sm">{activeFaq === idx ? '−' : '+'}</span>
                        </button>
                        {activeFaq === idx && (
                          <div className="p-3.5 pt-0 text-xs text-slate-600 bg-slate-50/50 border-t border-slate-100">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pastoral Prayer Request Box */}
                <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2 mb-1">
                    <Heart size={14} className="text-purple-600" />
                    Submit a Confidential Prayer Request
                  </h3>
                  <p className="text-xs text-purple-800/80 mb-3">
                    Our pastoral team upholds your matrimonial journey in prayer during our weekly prayer fellowship.
                  </p>

                  {prayerSent ? (
                    <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      <span>Thank you. Your prayer request has been received by our pastoral team. God bless you!</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSendPrayer} className="space-y-3">
                      <textarea
                        value={prayerRequest}
                        onChange={(e) => setPrayerRequest(e.target.value)}
                        placeholder="Write your prayer request here..."
                        className="w-full rounded-xl border border-purple-200 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:border-purple-500 min-h-[80px]"
                        required
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-purple-700 hover:bg-purple-800 text-white px-5 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Send to Pastoral Team
                      </button>
                    </form>
                  )}
                </div>

                {/* Contact Support */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-800">Need Immediate Assistance or Want to Report Misconduct?</div>
                    <div className="text-slate-500 text-[11px]">Our moderation stewards are available Monday through Saturday.</div>
                  </div>
                  <a
                    href="mailto:support@pentecostalmatrimony.org"
                    className="inline-flex items-center gap-1 font-bold text-rose-700 hover:underline shrink-0"
                  >
                    <Mail size={13} /> support@pentecostalmatrimony.org
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment & Subscription Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        defaultPlanId={activePlanId === 'free' ? 'premium' : activePlanId}
        onSuccess={(plan) => {
          setActivePlanId(plan.id);
        }}
      />
    </div>
  );
}
