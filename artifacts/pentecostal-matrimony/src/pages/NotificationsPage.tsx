import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Bell, Check, CheckCheck, Eye, Flame, Heart, MessageSquare, ShieldCheck } from 'lucide-react';
import { customFetch } from '@workspace/api-client-react';
import type { NotificationItemData } from '../types';

export function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], refetch } = useQuery<NotificationItemData[]>({
    queryKey: ['notifications'],
    queryFn: () => customFetch('/api/notifications'),
  });

  const handleMarkAsRead = async (id: string) => {
    await customFetch(`/api/notifications/${id}/read`, { method: 'POST' });
    refetch();
  };

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => !n.read);

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_interest':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shadow-xs">
            <Heart size={16} className="fill-rose-100" />
          </div>
        );
      case 'interest_accepted':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
            <CheckCheck size={16} />
          </div>
        );
      case 'new_message':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shadow-xs">
            <MessageSquare size={16} />
          </div>
        );
      case 'profile_verified':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 border border-teal-200 shadow-xs">
            <ShieldCheck size={16} />
          </div>
        );
      case 'profile_viewed':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200 shadow-xs">
            <Eye size={16} />
          </div>
        );
      case 'new_match':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shadow-xs">
            <Flame size={16} className="fill-amber-100" />
          </div>
        );
      default:
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200 shadow-xs">
            <Bell size={16} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-rose-100 bg-white p-6 sm:p-8 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-700" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-3">
            <div>
              <span className="inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1 border border-rose-200">
                Activity Feed
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900">Notifications</h1>
            </div>
            <div className="flex gap-1.5 bg-slate-100/80 p-1 rounded-xl">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                  filter === 'all'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                  filter === 'unread'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No notifications right now.
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start justify-between gap-4 py-4 px-3 rounded-xl transition ${
                    !item.read ? 'bg-rose-50/40 border border-rose-100/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {getIcon(item.type)}
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>{item.title}</span>
                        {!item.read && (
                          <span className="h-2 w-2 rounded-full bg-rose-600 inline-block animate-pulse" />
                        )}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                        {item.message}
                      </p>
                      <span className="mt-1 block text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.link && (
                      <Link
                        href={item.link}
                        className="rounded-lg bg-rose-700 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-rose-800 transition"
                      >
                        View
                      </Link>
                    )}
                    {!item.read && (
                      <button
                        onClick={() => handleMarkAsRead(item.id)}
                        className="p-1 text-slate-400 hover:text-emerald-600 transition"
                        title="Mark as read"
                      >
                        <Check size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
