import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
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
import { compressImage, getApproximateKB, safeSetLocalStorage, uploadPhotoToCloud } from '../utils/storageHelper';

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

export function MyProfilePage() {
  const { user } = useUser();
  const me = useGetMyProfile();
  const save = useSaveMyProfile();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ProfileInput>(blankProfile);
  const [photos, setPhotos] = useState<ProfilePhotoItem[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const isOwned = (p: any): boolean => {
      if (!p || !user) return false;
      if (p.userId && (p.userId === user.id || p.userId === `user_${user.id}`)) return true;
      if (p.id && (p.id === `prof_${user.id}` || p.id === user.id)) return true;
      if (user.primaryEmailAddress?.emailAddress && p.email && p.email.toLowerCase() === user.primaryEmailAddress.emailAddress.toLowerCase()) return true;
      if (user.fullName && p.displayName && p.displayName.trim().toLowerCase() === user.fullName.trim().toLowerCase()) return true;
      return false;
    };

    // 1. If backend / API returned real profile data belonging to current user
    if (me.data && isOwned(me.data) && (me.data.displayName || me.data.location || me.data.introduction)) {
      const p = me.data;
      setForm({
        displayName: p.displayName || user?.fullName || '',
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
          isPrimary: ph.isPrimary ?? (idx === 0),
          sizeKB: getApproximateKB(ph.url),
        }));
        setPhotos(loaded);
      }
      return;
    }

    // 2. Otherwise check user-specific localStorage profile
    if (user?.id) {
      try {
        let p: any = null;
        const userSpecificRaw = localStorage.getItem(`pm_user_profile_${user.id}`);
        if (userSpecificRaw) {
          p = JSON.parse(userSpecificRaw);
        } else {
          // Check pm_my_profile ONLY if it is confirmed to belong to this user
          const myProfRaw = localStorage.getItem('pm_my_profile');
          if (myProfRaw) {
            const cand = JSON.parse(myProfRaw);
            if (isOwned(cand)) p = cand;
          }
          // Also check registered profiles
          if (!p) {
            const allRaw = localStorage.getItem('pm_registered_profiles');
            if (allRaw) {
              const all = JSON.parse(allRaw);
              p = all.find((cand: any) => isOwned(cand));
            }
          }
        }

        if (p && isOwned(p)) {
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
              isPrimary: ph.isPrimary ?? (idx === 0),
              sizeKB: getApproximateKB(ph.url),
            }));
            setPhotos(loaded);
          }
          return;
        }
      } catch {}

      // 3. Initialize fresh profile for current user with registered name
      if (user.fullName) {
        setForm((prev) => ({ ...prev, displayName: user.fullName || '' }));
      }
    }
  }, [me.data, user?.id, user?.fullName]);


  const setTop = (key: string, value: string | number | boolean) => {
    setForm((old) => ({ ...old, [key]: value }));
  };

  const setSectionField = (section: keyof ProfileInput, key: string, value: string | number | boolean | null) => {
    setForm((old) => ({
      ...old,
      [section]: {
        ...(old[section] as unknown as Record<string, unknown>),
        [key]: value,
      },
    }));
  };

  const handleUploadPhoto = async (file: File, replaceIndex?: number) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      // Compress and upload to Cloudinary CDN (or fallback to local compressed <50KB)
      const cloudResult = await uploadPhotoToCloud(file, 720, 48);
      const photoUrl = cloudResult.url;
      const sizeKB = cloudResult.sizeKB;

      let updatedPhotos: ProfilePhotoItem[];
      if (replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < photos.length) {
        updatedPhotos = photos.map((item, idx) =>
          idx === replaceIndex ? { ...item, url: photoUrl, sizeKB } : item
        );
      } else {
        if (photos.length >= 3) {
          setUploadSuccessMessage('Maximum 3 photos allowed. You can replace an existing photo.');
          setIsUploadingPhoto(false);
          return;
        }
        const newPhotoItem: ProfilePhotoItem = {
          id: `photo_${Date.now()}`,
          url: photoUrl,
          isPrimary: photos.length === 0,
          sizeKB,
        };
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
      safeSetLocalStorage(`pm_user_profile_${user.id}`, { ...form, photos: updated });
      safeSetLocalStorage('pm_my_profile', { ...form, photos: updated });
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

        // Also push to shared profiles store so all devices can see it
        fetch('/api/profiles/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([fullProfile]),
        }).catch(() => {});
      } catch {}
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Profile Edit Form */}
        <div className="rounded-3xl border border-rose-100 bg-white p-6 sm:p-10 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-700" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 mb-8 gap-4">
            <div>
              <span className="inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1 border border-rose-200">
                Account & Matrimonial Profile
              </span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Edit Your Profile</h1>
              <p className="mt-1 text-xs text-slate-600">
                Update your personal, faith, career, and family details. Changes save directly to your published card.
              </p>
            </div>
            <Link
              href="/discover"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50/60 transition shadow-2xs shrink-0 self-start sm:self-center"
            >
              Browse Matches →
            </Link>
          </div>

          <form onSubmit={submit} className="space-y-8">
            {/* Dedicated Profile Photos Management Section (Up to 3 Photos) */}
            <div className="rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50/50 to-white p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-rose-100 pb-4 mb-5 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-700 text-white text-xs font-bold shadow-xs">
                      <Camera size={13} />
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Profile Photos ({photos.length} of 3)
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Add up to 3 clear, modest photos for your profile.
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
                          <img
                            src={photo.url}
                            alt={`Photo ${slotIndex + 1}`}
                            className="h-full w-full object-cover"
                          />
                          {/* Badges */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                            {photo.isPrimary && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-700 text-white text-[10px] font-bold px-2 py-0.5 shadow-sm">
                                <Star size={10} className="fill-white" /> Primary
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Controls */}
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
                              <Check size={12} /> Primary Card
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

                  // Empty Slot
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
                      <div className="h-12 w-12 rounded-2xl bg-rose-100/70 text-rose-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-700 group-hover:text-white transition shadow-2xs mb-2">
                        <Upload size={20} />
                      </div>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-rose-700 transition">
                        {slotTitle}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Click to add photo
                      </span>
                    </label>
                  );
                })}
              </div>

              {isUploadingPhoto && (
                <div className="mt-4 text-center text-xs font-bold text-rose-700 animate-pulse flex items-center justify-center gap-1.5">
                  <Sparkles size={14} /> Uploading photo...
                </div>
              )}
            </div>

            {/* Section 1: The Basics */}
            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-xs font-bold">1</span>
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
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Mother Tongue</label>
                  <input
                    type="text"
                    value={form.motherTongue}
                    onChange={(e) => setTop('motherTongue', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Location (City, State)</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setTop('location', e.target.value)}
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
                  className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Section 2: Faith & Church */}
            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold">2</span>
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
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Home Church</label>
                  <input
                    type="text"
                    value={form.faith.church}
                    onChange={(e) => setSectionField('faith', 'church', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Baptism Status</label>
                  <input
                    type="text"
                    value={form.faith.baptismStatus}
                    onChange={(e) => setSectionField('faith', 'baptismStatus', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Ministry Involvement</label>
                  <input
                    type="text"
                    value={form.faith.ministryInvolvement}
                    onChange={(e) => setSectionField('faith', 'ministryInvolvement', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Education & Career */}
            <div>
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">3</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Education & Career
                </h3>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Qualification</label>
                  <input
                    type="text"
                    value={form.education.qualification}
                    onChange={(e) => setSectionField('education', 'qualification', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Field of Study</label>
                  <input
                    type="text"
                    value={form.education.fieldOfStudy}
                    onChange={(e) => setSectionField('education', 'fieldOfStudy', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Occupation</label>
                  <input
                    type="text"
                    value={form.career.occupation}
                    onChange={(e) => setSectionField('career', 'occupation', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Company / Employer</label>
                  <input
                    type="text"
                    value={form.career.company}
                    onChange={(e) => setSectionField('career', 'company', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-100 pt-6">
              {saved && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                  <Check size={14} className="stroke-[3]" /> Profile Saved & Active
                </span>
              )}
              <button
                type="submit"
                disabled={save.isPending}
                className="w-full sm:w-auto rounded-xl bg-rose-700 px-7 py-3 text-xs font-bold text-white uppercase tracking-wider shadow-md hover:bg-rose-800 transition active:scale-[0.98]"
              >
                {save.isPending ? 'Saving Profile...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
