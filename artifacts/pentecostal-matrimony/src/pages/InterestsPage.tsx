import { useState } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Heart, MessageSquare, User, X } from 'lucide-react';
import {
  getListMyInterestsQueryKey,
  useListMyInterests,
  useRespondToInterest,
} from '@workspace/api-client-react';

export function InterestsPage() {
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const interestsQuery = useListMyInterests({ direction: tab });
  const respondMutation = useRespondToInterest();
  const queryClient = useQueryClient();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDecision = (id: string, decision: 'accepted' | 'declined') => {
    respondMutation.mutate(
      { interestId: id, data: { decision } },
      {
        onSuccess: () => {
          showToast(
            decision === 'accepted'
              ? 'Interest accepted! You are now connected. Private chat is unlocked.'
              : 'Interest declined respectfully.'
          );
          queryClient.invalidateQueries({ queryKey: getListMyInterestsQueryKey({ direction: tab }) });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12 text-slate-900">
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 rounded-lg border border-emerald-300 bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg animate-in fade-in">
          {toastMessage}
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-rose-100 bg-white p-6 sm:p-8 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-700" />
          <span className="inline-block rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 border border-rose-200 uppercase tracking-wider mb-2">
            Intentional Expressions
          </span>
          <h1 className="text-2xl font-extrabold sm:text-3xl text-slate-900">
            Interest Management
          </h1>
          <p className="mt-2 text-xs text-slate-600">
            A serious matrimonial covenant alternative to casual dating mechanics. Mutual acceptance unlocks direct private communication.
          </p>

          <div className="mt-6 flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setTab('incoming')}
              className={`px-5 py-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                tab === 'incoming'
                  ? 'border-rose-600 text-rose-700 bg-rose-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Heart size={14} className={tab === 'incoming' ? 'text-rose-600 fill-rose-100' : ''} />
              Received Interests
            </button>
            <button
              onClick={() => setTab('outgoing')}
              className={`px-5 py-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                tab === 'outgoing'
                  ? 'border-rose-600 text-rose-700 bg-rose-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <User size={14} className={tab === 'outgoing' ? 'text-rose-600' : ''} />
              Sent Interests
            </button>
          </div>
        </div>

        <div className="mt-6">
          {interestsQuery.isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
              Loading interests...
            </div>
          ) : Array.isArray(interestsQuery.data) && interestsQuery.data.length > 0 ? (
            <div className="space-y-3">
              {interestsQuery.data.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-rose-200"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        item.primaryPhotoUrl ||
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={item.displayName}
                      className="h-16 w-16 rounded-xl border border-slate-200 object-cover shadow-inner"
                    />
                    <div>
                      <Link
                        href={`/profiles/${item.profileId || 'prof_2'}`}
                        className="text-base font-bold text-slate-900 hover:text-rose-700 transition"
                      >
                        {item.displayName}, {item.age}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">{item.location}</p>
                      <p className="mt-1 text-[11px] text-slate-600">
                        {tab === 'incoming'
                          ? `${item.displayName} has expressed interest in your profile.`
                          : 'You expressed interest in this profile.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {item.status === 'accepted' ? (
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800">
                          <Check size={12} className="text-emerald-600 stroke-[3]" /> You're Connected
                        </span>
                        <Link
                          href="/messages"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-rose-800 transition"
                        >
                          <MessageSquare size={13} /> Chat Now
                        </Link>
                      </div>
                    ) : item.status === 'declined' ? (
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                        Declined
                      </span>
                    ) : tab === 'incoming' ? (
                      <>
                        <button
                          onClick={() => handleDecision(item.id, 'accepted')}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                        >
                          <Check size={14} className="stroke-[2.5]" /> Accept
                        </button>
                        <button
                          onClick={() => handleDecision(item.id, 'declined')}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition"
                        >
                          <X size={14} /> Decline
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800">
                        Pending Review
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-3">
                <Heart size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {tab === 'incoming' ? 'No incoming interests yet.' : 'No interests sent yet.'}
              </h3>
              <p className="mt-2 text-xs text-slate-600 max-w-sm mx-auto">
                {tab === 'incoming'
                  ? 'When a member sees shared spiritual alignment, their request will appear here.'
                  : 'Browse the directory to discover compatible profiles and send thoughtful expressions.'}
              </p>
              <Link
                href="/discover"
                className="mt-5 inline-block rounded-xl bg-rose-700 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-rose-800 transition uppercase tracking-wider"
              >
                Browse Directory
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
