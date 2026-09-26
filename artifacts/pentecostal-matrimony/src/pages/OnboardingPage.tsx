import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Lock, Shield, Upload, User, Star, Trash2, Camera, Sparkles } from 'lucide-react';
import { registerNewUser, useAuthActions } from '../auth';
import { compressImage, getApproximateKB, safeSetLocalStorage } from '../utils/storageHelper';
import type { MatrimonyProfile } from '../types';

export function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { signIn } = useAuthActions();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State across all 10 steps - completely clean for live registration
  const [accountData, setAccountData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    dateOfBirth: '',
    gender: 'woman' as 'woman' | 'man',
  });

  const [basicsData, setBasicsData] = useState({
    displayName: '',
    age: '' as number | string,
    heightCm: '' as number | string,
    weightKg: '' as number | string,
    location: '',
    country: 'India',
    motherTongue: '',
    maritalStatus: 'Never Married',
    introduction: '',
  });

  const [faithData, setFaithData] = useState({
    religion: 'Christianity',
    christianDenomination: 'Protestant / Pentecostal',
    denomination: 'Assemblies of God',
    church: '',
    baptismStatus: 'Water & Holy Spirit Baptized',
    baptismYear: '' as number | string,
    churchInvolvement: '',
    ministryInvolvement: '',
    spiritualExpectations: '',
    faithDescription: '',
  });

  const [educationData, setEducationData] = useState({
    qualification: '',
    degree: '',
    institution: '',
    fieldOfStudy: '',
  });

  const [careerData, setCareerData] = useState({
    occupation: '',
    company: '',
    workLocation: '',
    employmentStatus: 'Full-time',
    workingAbroad: false,
    country: 'India',
  });

  const [familyData, setFamilyData] = useState({
    familyStatus: 'Middle Class',
    fatherOccupation: '',
    motherOccupation: '',
    siblings: '',
    background: '',
    values: '',
  });

  const [preferencesData, setPreferencesData] = useState({
    ageMin: '' as number | string,
    ageMax: '' as number | string,
    locations: '',
    denomination: '',
    education: '',
    occupation: '',
    workLocation: '',
    familyValues: '',
    spiritualExpectations: '',
    other: '',
  });

  interface OnboardingPhoto {
    id: string;
    url: string;
    isPrimary: boolean;
    sizeKB: number;
    visibility: string;
  }

  const [photos, setPhotos] = useState<OnboardingPhoto[]>([]);
  const [photoVisibility, setPhotoVisibility] = useState('all_members');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const totalSteps = 10;

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, replaceIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file (JPG, PNG, WebP).');
      return;
    }

    try {
      setIsCompressingPhoto(true);
      setPhotoError(null);
      // High clarity compression strictly under 95KB
      const compressedDataUrl = await compressImage(file, 900, 95);
      const sizeKB = getApproximateKB(compressedDataUrl);

      setPhotos((prev) => {
        if (replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < prev.length) {
          const next = [...prev];
          next[replaceIndex] = {
            ...next[replaceIndex],
            url: compressedDataUrl,
            sizeKB,
          };
          return next;
        }

        if (prev.length >= 3) {
          setPhotoError('You can upload a maximum of 3 photos.');
          return prev;
        }

        const newPhotoItem: OnboardingPhoto = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url: compressedDataUrl,
          isPrimary: prev.length === 0,
          sizeKB,
          visibility: photoVisibility,
        };

        return [...prev, newPhotoItem];
      });
    } catch (err: any) {
      console.error('Failed to compress image:', err);
      setPhotoError('Failed to process image. Please try another photo.');
    } finally {
      setIsCompressingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSetPrimary = (index: number) => {
    setPhotos((prev) =>
      prev.map((p, i) => ({
        ...p,
        isPrimary: i === index,
      }))
    );
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length > 0 && !filtered.some((p) => p.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const handlePublish = async () => {
    const userEmail = accountData.email.trim();
    const userPass = accountData.password.trim();
    const userName = accountData.fullName.trim() || basicsData.displayName.trim() || 'New Believer';

    // 1. Authenticate & register member account
    const registered = registerNewUser({
      fullName: userName,
      email: userEmail || 'user@example.com',
      password: userPass || 'password123',
      role: 'member',
    });

    if (signIn) {
      await signIn(registered.email, userPass || 'password123');
    }

    // 2. Assemble complete profile object from all wizard steps
    const newProfile = {
      id: `prof_${registered.id}`,
      userId: registered.id,
      displayName: basicsData.displayName.trim() || userName,
      dateOfBirth: accountData.dateOfBirth || '',
      age: Number(basicsData.age) || undefined,
      gender: accountData.gender || 'woman',
      location: basicsData.location || '',
      country: basicsData.country || 'India',
      heightCm: Number(basicsData.heightCm) || undefined,
      weightKg: Number(basicsData.weightKg) || null,
      motherTongue: basicsData.motherTongue || 'Malayalam',
      maritalStatus: basicsData.maritalStatus || 'Never Married',
      introduction: basicsData.introduction || '',
      verificationStatus: 'under_review' as const,
      published: true,
      profileVisible: true,
      faith: faithData,
      education: educationData,
      career: careerData,
      family: familyData,
      preferences: preferencesData,
      photos: photos.map((p, idx) => ({
        id: p.id,
        url: p.url,
        isPrimary: p.isPrimary,
        visibility: p.visibility || photoVisibility,
        sortOrder: idx,
      })),
      updatedAt: new Date().toISOString(),
    };

    // 3. Save to backend API server for multi-device sync
    try {
      await fetch('/api/profiles/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      });
      await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      });
      // Push to shared sync store for cross-device visibility
      await fetch('/api/profiles/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([newProfile]),
      });
    } catch (err) {
      console.warn('Backend profile sync error (non-fatal):', err);
    }

    // 4. Save safely directly in user storage for instant sync (quota protected)
    safeSetLocalStorage(`pm_user_profile_${registered.id}`, newProfile);
    safeSetLocalStorage('pm_my_profile', newProfile);

    try {
      const existingRaw = localStorage.getItem('pm_registered_profiles');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updatedList = [...existing.filter((p: any) => p.id !== newProfile.id && p.userId !== registered.id), newProfile];
      safeSetLocalStorage('pm_registered_profiles', updatedList);
    } catch {}

    setLocation('/my-profile');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Onboarding Header */}
      <header className="border-b border-rose-100 bg-white sticky top-0 z-40 shadow-2xs">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-700 via-rose-800 to-rose-950 font-extrabold text-xs text-white shadow-xs">
              PM
            </div>
            <span className="font-black text-xs uppercase tracking-widest text-slate-900">
              Pentecostal Matrimony
            </span>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-rose-700">
              Step {currentStep} <span className="text-slate-400 font-normal">of {totalSteps}</span>
            </span>
            <div className="hidden sm:flex h-2 w-32 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-600 via-rose-700 to-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-3xl border border-rose-100 bg-white p-6 sm:p-10 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-700" />
          {/* STEP 1: WELCOME */}
          {currentStep === 1 && (
            <div className="text-center py-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-700 via-rose-800 to-slate-900 text-white shadow-lg">
                <span className="font-extrabold text-xl tracking-wider">PM</span>
              </div>
              <span className="inline-block mt-6 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 uppercase tracking-wider border border-rose-200">
                Welcome to Pentecostal Matrimony
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900">
                Find a partner who shares your faith and values.
              </h1>
              <p className="mt-4 text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                We are committed to helping Pentecostal Christians establish godly marriages based on biblical truth, prayer, family transparency, and mutual respect.
              </p>

              <div className="mt-10 flex flex-col gap-3 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full rounded-xl bg-rose-700 py-3.5 text-xs font-bold text-white uppercase tracking-wider shadow-md hover:bg-rose-800 transition"
                >
                  Create Profile
                </button>
                <Link
                  href="/sign-in"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider hover:bg-slate-50 transition text-center"
                >
                  Sign In
                </Link>
              </div>
            </div>
          )}

          {/* STEP 2: ACCOUNT CREATION */}
          {currentStep === 2 && (
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Step 2</p>
              <h2 className="text-2xl font-bold text-slate-900">Account Creation</h2>
              <p className="mt-1 text-xs text-slate-500">
                Your account credentials will remain strictly private and secure.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rachel Mathew"
                    value={accountData.fullName}
                    onChange={(e) => setAccountData({ ...accountData, fullName: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Email Address</label>
                    <input
                      type="email"
                      placeholder="your.email@example.com"
                      value={accountData.email}
                      onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={accountData.phone}
                      onChange={(e) => setAccountData({ ...accountData, phone: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Password</label>
                    <input
                      type="password"
                      placeholder="Create a secure password"
                      value={accountData.password}
                      onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Date of Birth</label>
                    <input
                      type="date"
                      value={accountData.dateOfBirth}
                      onChange={(e) => setAccountData({ ...accountData, dateOfBirth: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Gender</label>
                  <select
                    value={accountData.gender}
                    onChange={(e) => setAccountData({ ...accountData, gender: e.target.value as 'woman' | 'man' })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  >
                    <option value="woman">Woman</option>
                    <option value="man">Man</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PROFILE BASICS */}
          {currentStep === 3 && (
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Step 3</p>
              <h2 className="text-2xl font-bold text-slate-900">Profile Basics</h2>
              <p className="mt-1 text-xs text-slate-500">
                General details visible to verified members on the discovery card.
              </p>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Profile Display Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rachel M."
                      value={basicsData.displayName}
                      onChange={(e) => setBasicsData({ ...basicsData, displayName: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Age</label>
                    <input
                      type="number"
                      placeholder="e.g. 26"
                      value={basicsData.age}
                      onChange={(e) => setBasicsData({ ...basicsData, age: e.target.value ? Number(e.target.value) : '' })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Height (cm)</label>
                    <input
                      type="number"
                      placeholder="e.g. 165"
                      value={basicsData.heightCm}
                      onChange={(e) => setBasicsData({ ...basicsData, heightCm: e.target.value ? Number(e.target.value) : '' })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Weight (kg)</label>
                    <input
                      type="number"
                      placeholder="e.g. 54"
                      value={basicsData.weightKg}
                      onChange={(e) => setBasicsData({ ...basicsData, weightKg: e.target.value ? Number(e.target.value) : '' })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Location (City, State)</label>
                    <input
                      type="text"
                      placeholder="e.g. Kochi, Kerala"
                      value={basicsData.location}
                      onChange={(e) => setBasicsData({ ...basicsData, location: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Mother Tongue</label>
                    <input
                      type="text"
                      placeholder="e.g. Malayalam"
                      value={basicsData.motherTongue}
                      onChange={(e) => setBasicsData({ ...basicsData, motherTongue: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Marital Status</label>
                  <select
                    value={basicsData.maritalStatus}
                    onChange={(e) => setBasicsData({ ...basicsData, maritalStatus: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  >
                    <option value="Never Married">Never Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Divorced">Divorced (Biblical grounds)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Short Introduction</label>
                  <textarea
                    placeholder="Write a brief introduction about your faith journey, daily life, and aspirations..."
                    value={basicsData.introduction}
                    onChange={(e) => setBasicsData({ ...basicsData, introduction: e.target.value })}
                    className="mt-1.5 min-h-[80px] w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: FAITH & CHURCH */}
          {currentStep === 4 && (
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Step 4</p>
              <h2 className="text-2xl font-bold text-slate-900">Faith & Spiritual Background</h2>
              <p className="mt-1 text-xs text-slate-500">
                Faith is central to our platform. Share your relationship with Christ and church fellowship.
              </p>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Pentecostal Denomination</label>
                    <select
                      value={faithData.denomination}
                      onChange={(e) => setFaithData({ ...faithData, denomination: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    >
                      <option value="Assemblies of God">Assemblies of God (AG)</option>
                      <option value="Indian Pentecostal Church of God (IPC)">Indian Pentecostal Church of God (IPC)</option>
                      <option value="Church of God (Full Gospel)">Church of God (Full Gospel)</option>
                      <option value="Sharon Fellowship Church">Sharon Fellowship Church</option>
                      <option value="Independent Pentecostal">Independent Pentecostal Assembly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Home Church Assembly</label>
                    <input
                      type="text"
                      placeholder="e.g. Bethel AG Church, Trivandrum"
                      value={faithData.church}
                      onChange={(e) => setFaithData({ ...faithData, church: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Baptism Status</label>
                    <input
                      type="text"
                      placeholder="e.g. Water & Holy Spirit Baptized"
                      value={faithData.baptismStatus}
                      onChange={(e) => setFaithData({ ...faithData, baptismStatus: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Baptism Year</label>
                    <input
                      type="number"
                      placeholder="e.g. 2018"
                      value={faithData.baptismYear}
                      onChange={(e) => setFaithData({ ...faithData, baptismYear: e.target.value ? Number(e.target.value) : '' })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Church Involvement</label>
                  <input
                    type="text"
                    placeholder="e.g. Sunday School Teacher, Choir Member, Youth Leader"
                    value={faithData.churchInvolvement}
                    onChange={(e) => setFaithData({ ...faithData, churchInvolvement: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Ministry Involvement</label>
                  <input
                    type="text"
                    placeholder="e.g. Bible study coordinator, outreach mission volunteer"
                    value={faithData.ministryInvolvement}
                    onChange={(e) => setFaithData({ ...faithData, ministryInvolvement: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Spiritual Expectations</label>
                  <textarea
                    placeholder="Describe the spiritual qualities and biblical values you seek in a godly partner..."
                    value={faithData.spiritualExpectations}
                    onChange={(e) => setFaithData({ ...faithData, spiritualExpectations: e.target.value })}
                    className="mt-1.5 min-h-[70px] w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: EDUCATION */}
          {currentStep === 5 && (
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Step 5</p>
              <h2 className="text-2xl font-bold text-slate-900">Education Details</h2>
              <p className="mt-1 text-xs text-slate-500">
                Academic qualification and background.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Highest Qualification</label>
                  <input
                    type="text"
                    placeholder="e.g. M.Sc / B.Tech / MBA / MBBS"
                    value={educationData.qualification}
                    onChange={(e) => setEducationData({ ...educationData, qualification: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Degree Level</label>
                    <input
                      type="text"
                      placeholder="e.g. Post Graduate / Graduate / Doctorate"
                      value={educationData.degree}
                      onChange={(e) => setEducationData({ ...educationData, degree: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Field of Study</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science, English Literature, Commerce"
                      value={educationData.fieldOfStudy}
                      onChange={(e) => setEducationData({ ...educationData, fieldOfStudy: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">College / Institution</label>
                  <input
                    type="text"
                    placeholder="e.g. University of Kerala, NIT, IIT, Christian Medical College"
                    value={educationData.institution}
                    onChange={(e) => setEducationData({ ...educationData, institution: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: CAREER */}
          {currentStep === 6 && (
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Step 6</p>
              <h2 className="text-2xl font-bold text-slate-900">Career & Employment</h2>
              <p className="mt-1 text-xs text-slate-500">
                Professional and employment details.
              </p>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Occupation</label>
                    <input
                      type="text"
                      placeholder="e.g. Software Engineer, Assistant Professor, Doctor"
                      value={careerData.occupation}
                      onChange={(e) => setCareerData({ ...careerData, occupation: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Company / Employer</label>
                    <input
                      type="text"
                      placeholder="e.g. Infosys, Mar Ivanios College, Govt Hospital"
                      value={careerData.company}
                      onChange={(e) => setCareerData({ ...careerData, company: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Work Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Kochi, Bangalore, Trivandrum"
                      value={careerData.workLocation}
                      onChange={(e) => setCareerData({ ...careerData, workLocation: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Country</label>
                    <input
                      type="text"
                      placeholder="e.g. India, UAE, USA, UK"
                      value={careerData.country}
                      onChange={(e) => setCareerData({ ...careerData, country: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="workingAbroad"
                    checked={careerData.workingAbroad}
                    onChange={(e) => setCareerData({ ...careerData, workingAbroad: e.target.checked })}
                    className="h-4 w-4 accent-rose-700 rounded"
                  />
                  <label htmlFor="workingAbroad" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    Currently Working Abroad (NRI / Gulf / Overseas)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: FAMILY */}
          {currentStep === 7 && (
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Step 7</p>
              <h2 className="text-2xl font-bold text-slate-900">Family Background</h2>
              <p className="mt-1 text-xs text-slate-500">
                Parents, siblings, and family values.
              </p>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Father's Occupation</label>
                    <input
                      type="text"
                      placeholder="e.g. Business, Retired Professor, Pastor"
                      value={familyData.fatherOccupation}
                      onChange={(e) => setFamilyData({ ...familyData, fatherOccupation: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Mother's Occupation</label>
                    <input
                      type="text"
                      placeholder="e.g. Homemaker, Teacher, Nurse"
                      value={familyData.motherOccupation}
                      onChange={(e) => setFamilyData({ ...familyData, motherOccupation: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Siblings Details</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 elder brother (married, engineer), 1 younger sister"
                    value={familyData.siblings}
                    onChange={(e) => setFamilyData({ ...familyData, siblings: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Family Background</label>
                  <textarea
                    placeholder="Brief description of family traditions, roots, and church association..."
                    value={familyData.background}
                    onChange={(e) => setFamilyData({ ...familyData, background: e.target.value })}
                    className="mt-1.5 min-h-[60px] w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Family Values</label>
                  <textarea
                    placeholder="e.g. Christ-centered home, regular family prayer altar, humility and mutual respect..."
                    value={familyData.values}
                    onChange={(e) => setFamilyData({ ...familyData, values: e.target.value })}
                    className="mt-1.5 min-h-[60px] w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: PARTNER PREFERENCES */}
          {currentStep === 8 && (
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Step 8</p>
              <h2 className="text-2xl font-bold text-slate-900">Partner Preferences</h2>
              <p className="mt-1 text-xs text-slate-500">
                Define clear, honest preferences for age, location, and faith expectations.
              </p>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Minimum Age</label>
                    <input
                      type="number"
                      placeholder="e.g. 24"
                      value={preferencesData.ageMin}
                      onChange={(e) => setPreferencesData({ ...preferencesData, ageMin: e.target.value ? Number(e.target.value) : '' })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Maximum Age</label>
                    <input
                      type="number"
                      placeholder="e.g. 30"
                      value={preferencesData.ageMax}
                      onChange={(e) => setPreferencesData({ ...preferencesData, ageMax: e.target.value ? Number(e.target.value) : '' })}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Preferred Locations</label>
                  <input
                    type="text"
                    placeholder="e.g. Kerala, Bangalore, Chennai, Abroad"
                    value={preferencesData.locations}
                    onChange={(e) => setPreferencesData({ ...preferencesData, locations: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Preferred Denomination</label>
                  <input
                    type="text"
                    placeholder="e.g. Assemblies of God / IPC / Any Pentecostal"
                    value={preferencesData.denomination}
                    onChange={(e) => setPreferencesData({ ...preferencesData, denomination: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Spiritual & Faith Expectations</label>
                  <textarea
                    placeholder="e.g. Active church member who honors biblical principles and maintains daily prayer..."
                    value={preferencesData.spiritualExpectations}
                    onChange={(e) => setPreferencesData({ ...preferencesData, spiritualExpectations: e.target.value })}
                    className="mt-1.5 min-h-[60px] w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 9: PHOTOS */}
          {currentStep === 9 && (
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Step 9</p>
              <h2 className="text-2xl font-bold text-slate-900">Profile Photography</h2>
              <p className="mt-1 text-xs text-slate-500">
                Upload up to 3 clear, modest portrait photos. Each photo is automatically compressed to <strong>under 100 KB</strong> with crystal clarity.
              </p>

              {photoError && (
                <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center justify-between">
                  <span>{photoError}</span>
                  <button type="button" onClick={() => setPhotoError(null)} className="font-bold underline text-rose-800">Dismiss</button>
                </div>
              )}

              {isCompressingPhoto && (
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                  <span>Compressing and optimizing photo for HD clarity under 100 KB...</span>
                </div>
              )}

              <div className="mt-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Profile Photos ({photos.length}/3)
                    </label>
                    <span className="text-[11px] text-slate-500">Max 3 photos · &lt; 100 KB each</span>
                  </div>

                  {/* 3 Photo Grid Slots */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Render uploaded photos */}
                    {photos.map((photo, index) => (
                      <div
                        key={photo.id || index}
                        className={`relative group rounded-2xl border-2 overflow-hidden transition-all bg-white shadow-xs ${
                          photo.isPrimary ? 'border-rose-600 ring-2 ring-rose-200' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="relative aspect-square w-full bg-slate-100">
                          <img
                            src={photo.url}
                            alt={`Photo ${index + 1}`}
                            className="h-full w-full object-cover"
                          />

                          {/* Primary Badge */}
                          {photo.isPrimary && (
                            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-rose-700 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                              <Star size={11} fill="white" />
                              Primary
                            </span>
                          )}

                          {/* Size Indicator Badge */}
                          <span className="absolute top-2 right-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 backdrop-blur-xs">
                            ✓ {photo.sizeKB || getApproximateKB(photo.url)} KB
                          </span>
                        </div>

                        {/* Actions footer */}
                        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-1">
                          {!photo.isPrimary ? (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(index)}
                              className="text-[11px] font-bold text-slate-600 hover:text-rose-700 transition"
                            >
                              Set Primary
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-rose-700">Primary Photo</span>
                          )}

                          <div className="flex items-center gap-1">
                            <label className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-900 p-1 hover:bg-slate-100 rounded">
                              Change
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(e, index)}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition"
                              title="Delete photo"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Empty Slots up to 3 */}
                    {Array.from({ length: Math.max(0, 3 - photos.length) }).map((_, slotIdx) => (
                      <label
                        key={`empty_${slotIdx}`}
                        className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-rose-50/40 hover:border-rose-300 transition-all cursor-pointer p-4 text-center group"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 group-hover:border-rose-300 group-hover:scale-105 transition shadow-2xs">
                          <Camera size={22} className="text-slate-400 group-hover:text-rose-600 transition" />
                        </div>
                        <span className="mt-3 text-xs font-bold text-slate-700 group-hover:text-rose-700">
                          {photos.length === 0 && slotIdx === 0 ? 'Upload Primary Photo' : '+ Add Photo'}
                        </span>
                        <span className="mt-1 text-[10px] text-slate-400">
                          Under 100 KB · HD Clear
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e)}
                          className="hidden"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">Photo Visibility Control</label>
                  <select
                    value={photoVisibility}
                    onChange={(e) => setPhotoVisibility(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-600 focus:outline-none transition"
                  >
                    <option value="all_members">Visible to All Verified Members</option>
                    <option value="connections_only">Visible Only to Mutual Connections</option>
                    <option value="private">Private (Upon request approval)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 10: REVIEW & PUBLISH */}
          {currentStep === 10 && (
            <div>
              <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Step 10</p>
              <h2 className="text-2xl font-bold text-slate-900">Review Profile</h2>
              <p className="mt-1 text-xs text-slate-500">
                Please review your complete matrimonial profile before publishing.
              </p>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 space-y-5 shadow-xs">
                <div className="flex items-center gap-4">
                  {photos.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={(photos.find((p) => p.isPrimary) || photos[0]).url}
                        alt={basicsData.displayName || 'Preview'}
                        className="h-20 w-20 rounded-2xl border-2 border-rose-600 object-cover shadow-xs"
                      />
                      {photos.length > 1 && (
                        <div className="flex flex-col gap-1.5">
                          {photos.filter((p) => !p.isPrimary).slice(0, 2).map((extraPhoto, i) => (
                            <img
                              key={i}
                              src={extraPhoto.url}
                              alt="Extra preview"
                              className="h-9 w-9 rounded-lg border border-slate-200 object-cover shadow-2xs"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-400">
                      <User size={32} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {basicsData.displayName || accountData.fullName || 'New Member'}{basicsData.age ? `, ${basicsData.age}` : ''}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {basicsData.location || 'Location not specified'}{basicsData.country ? `, ${basicsData.country}` : ''}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                      ✓ Profile Ready for Review
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
                  <div>
                    <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Denomination</p>
                    <p className="mt-0.5 text-rose-700 font-semibold">{faithData.denomination || 'Pentecostal'}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Home Church</p>
                    <p className="mt-0.5 text-slate-800">{faithData.church || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Education</p>
                    <p className="mt-0.5 text-slate-800">{educationData.qualification || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Occupation</p>
                    <p className="mt-0.5 text-slate-800 font-semibold">
                      {careerData.occupation ? `${careerData.occupation}${careerData.company ? ` at ${careerData.company}` : ''}` : 'Not specified'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 text-xs">
                  <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Introduction</p>
                  <p className="mt-1 text-slate-700 leading-relaxed">
                    {basicsData.introduction || 'No introduction provided yet.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <Shield size={16} className="shrink-0 mt-0.5 text-rose-700" />
                  <p className="text-slate-600 leading-relaxed">
                    By publishing, you confirm that all information provided is accurate and truthful. Contact details are strictly protected and never publicly displayed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 10 && currentStep > 1 && (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 rounded-xl bg-rose-700 px-6 py-2.5 text-xs font-bold text-white uppercase tracking-wider shadow-sm hover:bg-rose-800 transition cursor-pointer"
              >
                Continue <ArrowRight size={14} />
              </button>
            )}

            {currentStep === 10 && (
              <button
                type="button"
                onClick={handlePublish}
                className="flex items-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 px-8 py-3 text-xs font-bold text-white uppercase tracking-wider shadow-md transition cursor-pointer"
              >
                <Check size={16} /> Publish Profile
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
