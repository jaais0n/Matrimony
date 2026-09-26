import { useEffect, useState } from 'react';
import { Link, useParams } from 'wouter';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Bookmark,
  Briefcase,
  Calendar,
  Check,
  Church,
  Eye,
  Flag,
  Globe,
  GraduationCap,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { useGetProfile, useSaveProfile, useSendInterest, useUnsaveProfile, isSeedProfile } from '@workspace/api-client-react';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { ReportModal } from '../components/ui/ReportModal';
import { BlockModal } from '../components/ui/BlockModal';

export function ProfileDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const profileQuery = useGetProfile(id);
  const sendInterestMutation = useSendInterest();
  const saveProfileMutation = useSaveProfile();
  const unsaveProfileMutation = useUnsaveProfile();

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [interestSent, setInterestSent] = useState(false);

  const p = profileQuery.data;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (p?.id) {
      try {
        const raw = localStorage.getItem('pm_user_interests');
        const list = raw ? JSON.parse(raw) : [];
        if (list.some((item: any) => item.profileId === p.id)) {
          setInterestSent(true);
        }
      } catch {}
    }
  }, [p?.id]);

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] pb-24 md:pb-16 text-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 animate-pulse">
          {/* Back button skeleton */}
          <div className="h-6 w-36 rounded-lg bg-slate-200 mb-6" />

          {/* Hero Profile Card Skeleton */}
          <div className="rounded-3xl border border-[#ebdcd0] bg-white p-6 sm:p-8 luxury-card-shadow overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Photo skeleton */}
              <div className="md:col-span-5 space-y-4">
                <div className="aspect-[4/5] w-full rounded-2xl bg-gradient-to-br from-slate-200 via-rose-100/40 to-slate-200" />
                <div className="flex gap-2.5">
                  <div className="h-16 w-16 rounded-xl bg-slate-200" />
                  <div className="h-16 w-16 rounded-xl bg-slate-200" />
                  <div className="h-16 w-16 rounded-xl bg-slate-200" />
                </div>
              </div>

              {/* Information skeleton */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-24 rounded-full bg-emerald-100" />
                    <div className="h-5 w-20 rounded-full bg-slate-100" />
                  </div>
                  <div className="h-8 w-64 rounded-xl bg-slate-200" />
                  <div className="h-4 w-40 rounded-lg bg-slate-100" />

                  {/* Chips skeleton */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <div className="h-7 w-28 rounded-lg bg-purple-100/60" />
                    <div className="h-7 w-28 rounded-lg bg-blue-100/60" />
                    <div className="h-7 w-24 rounded-lg bg-emerald-100/60" />
                    <div className="h-7 w-20 rounded-lg bg-amber-100/60" />
                  </div>

                  {/* Testimony box skeleton */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-2 mt-4">
                    <div className="h-3 w-36 rounded bg-rose-100" />
                    <div className="h-3.5 w-full rounded bg-slate-200" />
                    <div className="h-3.5 w-5/6 rounded bg-slate-200" />
                  </div>
                </div>

                {/* Buttons skeleton */}
                <div className="border-t border-slate-100 pt-5 flex items-center gap-3">
                  <div className="h-12 flex-1 rounded-xl bg-rose-200/70" />
                  <div className="h-12 flex-1 rounded-xl bg-rose-100/50" />
                  <div className="h-12 w-12 rounded-xl bg-slate-100" />
                  <div className="h-12 w-12 rounded-xl bg-slate-100" />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed sections skeleton */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-6 space-y-3">
                <div className="h-5 w-36 rounded-lg bg-slate-200" />
                <div className="h-4 w-4/5 rounded bg-slate-100" />
                <div className="h-4 w-2/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!p || isSeedProfile(p)) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center text-xs">
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8">
          <p className="font-bold text-slate-800">Profile not found.</p>
          <Link href="/discover" className="mt-4 inline-block rounded-lg bg-rose-700 px-4 py-2 text-white">
            Return to Directory
          </Link>
        </div>
      </div>
    );
  }

  const photos = p.photos && p.photos.length > 0 ? p.photos : [{ id: 'default', url: '' }];
  const currentPhoto = photos[activePhotoIndex] || photos[0];

  const handleInterest = () => {
    if (interestSent) return;
    sendInterestMutation.mutate(
      { profileId: p.id },
      {
        onSuccess: () => {
          setInterestSent(true);
          showToast('Interest expressed respectfully. You will be notified when they respond.');
        },
        onError: () => {
          setInterestSent(true);
          showToast('Interest expressed respectfully. You will be notified when they respond.');
        },
      }
    );
  };

  const handleSave = () => {
    saveProfileMutation.mutate({ profileId: p.id }, {
      onSuccess: () => showToast('Profile saved to your shortlist.'),
    });
  };

  const handleReport = (reason: string, details: string) => {
    showToast('Report received. Community stewards will investigate.');
  };

  const handleBlock = () => {
    showToast(`${p.displayName} has been blocked.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-16 text-slate-900">
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 rounded-lg border border-rose-300 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
          {toastMessage}
        </div>
      )}

      {/* Modals */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReport}
        profileName={p.displayName}
      />
      <BlockModal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        onConfirm={handleBlock}
        profileName={p.displayName}
      />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Back Link */}
        <Link href="/discover" className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-rose-700 mb-4 transition">
          <ArrowLeft size={14} /> Back to Directory
        </Link>

        {/* Top Profile Card Header with natural photo and vibrant tags */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            {/* Photo Gallery (Left) in Full Natural Color */}
            <div className="md:col-span-5">
              <div className="relative aspect-[1.08] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
                {currentPhoto.url ? (
                  <img
                    src={currentPhoto.url}
                    alt={p.displayName}
                    className="h-full w-full object-cover transition-transform duration-500"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-4xl text-rose-300 bg-rose-50">
                    {p.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                {p.verificationStatus === 'verified' && (
                  <div className="absolute left-3 top-3">
                    <VerificationBadge size="md" />
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {photos.length > 1 && (
                <div className="mt-3 flex gap-2">
                  {photos.map((ph, idx) => (
                    <button
                      key={ph.id || idx}
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`h-16 w-16 rounded-lg border overflow-hidden transition ${
                        activePhotoIndex === idx ? 'border-2 border-rose-600 shadow-sm' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={ph.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Core Info & Actions (Right) */}
            <div className="flex flex-col justify-between md:col-span-7">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-slate-900">
                      {p.displayName}, <span className="text-rose-700 font-bold">{p.age}</span>
                    </h1>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <MapPin size={14} className="shrink-0 text-rose-500" />
                      <span>{p.location}, {p.country}</span>
                    </p>
                  </div>
                  {p.verificationStatus === 'verified' && (
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800">
                      <ShieldCheck size={13} className="text-emerald-600" /> Verified Member
                    </span>
                  )}
                </div>

                {/* Key Quick Badges with vibrant styling */}
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 font-semibold text-purple-700">
                    <Church size={13} className="text-purple-600" /> {p.faith?.denomination || 'Pentecostal'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                    <Briefcase size={13} className="text-blue-600" /> {p.career?.occupation}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                    <GraduationCap size={13} className="text-emerald-600" /> {p.education?.qualification}
                  </span>
                  {p.career?.workingAbroad && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-bold text-amber-800 text-[11px]">
                      <Globe size={12} className="text-amber-600" /> Working Abroad
                    </span>
                  )}
                </div>

                {/* About Section */}
                <div className="mt-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">Spiritual Testimony & Introduction</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-700 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                    "{p.introduction || 'No testimony provided yet.'}"
                  </p>
                </div>
              </div>

              {/* Action Buttons: Express Interest & Message (Equally Finished) */}
              <div className="mt-6 border-t border-slate-100 pt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleInterest}
                  disabled={interestSent || sendInterestMutation.isPending}
                  className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition active:scale-[0.98] ${
                    interestSent
                      ? 'border border-slate-200 bg-slate-100 text-slate-500 cursor-default'
                      : 'bg-rose-700 text-white hover:bg-rose-800 shadow-md'
                  }`}
                >
                  <Heart size={15} fill={interestSent ? 'currentColor' : 'none'} className={interestSent ? 'text-rose-500' : 'text-rose-200'} />
                  <span>{interestSent ? 'Interest Sent' : 'Express Interest'}</span>
                </button>
                <Link
                  href={`/messages?user=${p.id}&name=${encodeURIComponent(p.displayName)}`}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/90 hover:border-rose-300 py-3 text-xs font-bold uppercase tracking-wider text-rose-800 shadow-xs transition text-center"
                >
                  <MessageCircle size={15} className="text-rose-700" />
                  <span>Message</span>
                </Link>
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="p-3 rounded-xl border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800 transition"
                  title="Report Profile"
                >
                  <Flag size={15} />
                </button>
                <button
                  onClick={() => setBlockModalOpen(true)}
                  className="p-3 rounded-xl border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800 transition"
                  title="Block Profile"
                >
                  <Ban size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Sections Breakdown with colorful section icons */}
        <div className="mt-6 space-y-6">
          {/* PERSONAL DETAILS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
                <User size={16} />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Personal Details</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-y-4 gap-x-6 sm:grid-cols-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Age</span>
                <p className="mt-0.5 font-semibold text-slate-800">{p.age} Years</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Height</span>
                <p className="mt-0.5 font-semibold text-slate-800">{p.heightCm} cm</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Weight</span>
                <p className="mt-0.5 font-semibold text-slate-800">{p.weightKg ? `${p.weightKg} kg` : 'Not specified'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mother Tongue</span>
                <p className="mt-0.5 font-semibold text-slate-800">{p.motherTongue || 'Malayalam'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Marital Status</span>
                <p className="mt-0.5 font-semibold text-slate-800">{p.maritalStatus || 'Never Married'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Native Location</span>
                <p className="mt-0.5 font-semibold text-slate-800">{p.location}, {p.country}</p>
              </div>
            </div>
          </div>

          {/* FAITH & CHURCH DETAILS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
                <Church size={16} />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Faith & Spiritual Life</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pentecostal Denomination</span>
                <p className="mt-0.5 font-semibold text-purple-900">{p.faith?.denomination}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Home Church Assembly</span>
                <p className="mt-0.5 font-semibold text-slate-800">{p.faith?.church}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Baptism Status</span>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {p.faith?.baptismStatus || 'Water & Holy Spirit Baptized'} {p.faith?.baptismYear ? `(Year ${p.faith.baptismYear})` : ''}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Church Involvement</span>
                <p className="mt-0.5 font-semibold text-slate-800">{p.faith?.churchInvolvement || 'Active Sunday service attendee'}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ministry Involvement</span>
                <p className="mt-0.5 font-semibold text-slate-800">{p.faith?.ministryInvolvement || 'None specified'}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Spiritual Expectations</span>
                <p className="mt-0.5 font-medium text-slate-700 leading-relaxed bg-purple-50/40 p-3 rounded-lg border border-purple-100">
                  {p.faith?.spiritualExpectations || 'A partner walking with Christ.'}
                </p>
              </div>
            </div>
          </div>

          {/* EDUCATION & CAREER */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  <GraduationCap size={16} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Education</h2>
              </div>
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Highest Qualification</span>
                  <p className="mt-0.5 font-semibold text-emerald-950">{p.education?.qualification}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Institution / College</span>
                  <p className="mt-0.5 font-medium text-slate-700">{p.education?.institution || 'Recognized University'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Field of Study</span>
                  <p className="mt-0.5 font-medium text-slate-700">{p.education?.fieldOfStudy}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                  <Briefcase size={16} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Career</h2>
              </div>
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Occupation</span>
                  <p className="mt-0.5 font-semibold text-blue-950">{p.career?.occupation}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Company / Employer</span>
                  <p className="mt-0.5 font-medium text-slate-700">{p.career?.company || 'Corporate / Private'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Work Location</span>
                  <p className="mt-0.5 font-medium text-slate-700">{p.career?.workLocation}, {p.career?.country}</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAMILY BACKGROUND */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                <Users size={16} />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Family Details</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Father's Occupation</span>
                <p className="mt-0.5 font-semibold text-slate-800">{p.family?.fatherOccupation}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mother's Occupation</span>
                <p className="mt-0.5 font-semibold text-slate-800">{p.family?.motherOccupation}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Siblings</span>
                <p className="mt-0.5 font-medium text-slate-700">{p.family?.siblings}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Family Background & Heritage</span>
                <p className="mt-0.5 font-medium leading-relaxed text-slate-700">{p.family?.background}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Family Values</span>
                <p className="mt-0.5 font-medium leading-relaxed text-slate-700">{p.family?.values}</p>
              </div>
            </div>
          </div>

          {/* PARTNER EXPECTATIONS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
                <Heart size={16} />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Partner Expectations</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Preferred Age</span>
                <p className="mt-0.5 font-semibold text-rose-900">{p.preferences?.ageMin} to {p.preferences?.ageMax} Years</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Preferred Denomination</span>
                <p className="mt-0.5 font-semibold text-slate-800">{p.preferences?.denomination || 'Assemblies of God / IPC / Church of God'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Preferred Locations</span>
                <p className="mt-0.5 font-medium text-slate-700">
                  {Array.isArray(p.preferences?.locations) ? p.preferences.locations.join(', ') : p.preferences?.locations || 'India or Abroad'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Preferred Education / Career</span>
                <p className="mt-0.5 font-medium text-slate-700">{p.preferences?.education || 'Graduate / Professional'}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Spiritual Expectations</span>
                <p className="mt-0.5 font-medium leading-relaxed text-slate-700">{p.preferences?.spiritualExpectations}</p>
              </div>
            </div>
          </div>

          {/* PROTECTED CONTACT INFO BANNER in soothing blue */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-6 text-xs text-blue-950 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 uppercase tracking-wider text-[11px]">Protected Contact Information</h3>
                <p className="mt-1 text-blue-800/90 leading-relaxed">
                  In accordance with our strict Christian matrimonial privacy policy, phone numbers, email addresses, and home contact details are protected.
                  Communication is initiated through respectful mutual interest. Once both parties accept, private in-app conversation is unlocked.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
