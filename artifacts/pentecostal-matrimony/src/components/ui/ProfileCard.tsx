import { useState } from 'react';
import { Link } from 'wouter';
import { Bookmark, Briefcase, Church, Globe, GraduationCap, Heart, MapPin } from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';

export interface ProfileCardData {
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
  reasons?: string[];
}

interface ProfileCardProps {
  profile: ProfileCardData;
  onSendInterest?: (id: string) => void;
  onToggleSave?: (id: string, currentSaved: boolean) => void;
}

export function ProfileCard({ profile, onSendInterest, onToggleSave }: ProfileCardProps) {
  const [interestSent, setInterestSent] = useState(false);
  const [isSaved, setIsSaved] = useState(Boolean(profile.saved));

  const handleInterest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!interestSent) {
      setInterestSent(true);
      onSendInterest?.(profile.id);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    onToggleSave?.(profile.id, isSaved);
  };

  const initials = profile.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="group relative flex flex-col rounded-2xl border border-[#ebdcd0] bg-white/90 backdrop-blur-xs luxury-card-shadow transition-all duration-300 hover:border-rose-300 hover:shadow-xl overflow-hidden">
      {/* Photo Frame in Full Natural Color */}
      <Link href={`/profiles/${profile.id}`} className="relative block aspect-[1.12] w-full overflow-hidden bg-slate-100">
        {profile.primaryPhotoUrl ? (
          <img
            src={profile.primaryPhotoUrl}
            alt={profile.displayName}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-bold text-3xl text-rose-300 bg-rose-50">
            {initials}
          </div>
        )}

        {/* Verification Pill on Photo */}
        {profile.verificationStatus === 'verified' && (
          <div className="absolute left-3 top-3">
            <VerificationBadge size="sm" />
          </div>
        )}

        {/* Bookmark Action */}
        <button
          onClick={handleSave}
          className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition ${
            isSaved
              ? 'border-amber-400 bg-amber-500 text-white'
              : 'border-white/80 bg-white/90 text-slate-700 hover:bg-white hover:text-amber-600'
          }`}
          title={isSaved ? 'Remove bookmark' : 'Save profile'}
          aria-label="Save profile"
        >
          <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </Link>

      {/* Profile Information */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Name, Age & Location */}
        <div>
          <Link href={`/profiles/${profile.id}`} className="hover:text-rose-700 transition">
            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              {profile.displayName}
              {typeof profile.age === 'number' && profile.age > 0 && (
                <>
                  , <span className="font-semibold text-rose-700">{profile.age}</span>
                </>
              )}
            </h3>
          </Link>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin size={13} className="shrink-0 text-rose-500" />
            <span className="truncate">{profile.location}, {profile.country}</span>
          </p>
        </div>

        {/* Colorful Curated Information Chips */}
        <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
            <Church size={11} className="shrink-0 text-purple-600" />
            <span className="truncate max-w-[130px]">{profile.denomination || 'Pentecostal'}</span>
          </span>

          <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            <Briefcase size={11} className="shrink-0 text-blue-600" />
            <span className="truncate max-w-[120px]">{profile.occupation || 'Professional'}</span>
          </span>

          {profile.education && (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <GraduationCap size={11} className="shrink-0 text-emerald-600" />
              <span className="truncate max-w-[120px]">{profile.education}</span>
            </span>
          )}

          {profile.motherTongue && (
            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {profile.motherTongue}
            </span>
          )}

          {profile.workingAbroad && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              <Globe size={10} className="text-amber-600" /> Abroad
            </span>
          )}
        </div>

        {/* Transparent Reason Tag */}
        {profile.reasons && profile.reasons.length > 0 && (
          <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50/60 p-2 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Spiritual Alignment</p>
            <p className="mt-0.5 text-[11px] text-rose-950 font-medium line-clamp-1">
              ✓ {profile.reasons[0]}
            </p>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={handleInterest}
            disabled={interestSent}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold tracking-wide transition shadow-sm ${
              interestSent
                ? 'border border-slate-200 bg-slate-100 text-slate-500 cursor-default'
                : 'bg-rose-700 text-white hover:bg-rose-800 active:scale-[0.98]'
            }`}
          >
            <Heart size={14} fill={interestSent ? 'currentColor' : 'none'} className={interestSent ? 'text-rose-500' : 'text-rose-200'} />
            <span>{interestSent ? 'Interest Sent' : 'Express Interest'}</span>
          </button>

          <Link
            href={`/profiles/${profile.id}`}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
