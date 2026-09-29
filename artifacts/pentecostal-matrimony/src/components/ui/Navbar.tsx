import { useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { Bell, LogOut, Shield, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react';
import { useClerk, useUser } from '../../auth';
import { useUnreadMessagesCount } from '../../utils/useUnreadMessages';

export function Navbar({ activeRole }: { activeRole?: string; onToggleRole?: (role: string) => void }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();

  const demoRole = typeof window !== 'undefined' ? localStorage.getItem('pm_demo_role') : null;
  const currentRole = String(activeRole || (user?.publicMetadata?.role as string) || demoRole || 'user');
  const isAdmin = currentRole === 'admin' || currentRole === 'moderator' || user?.id === 'user_admin';

  // Unread messages count for Messages nav item with live dot notification
  const unreadMessagesCount = useUnreadMessagesCount(user?.id);

  // Fetch notifications to show red dot only when real unread notifications exist
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: () => customFetch<any[]>('/api/notifications').catch(() => []),
    staleTime: 1000 * 30,
  });

  const unreadCount = useMemo(() => {
    let count = (notifications || []).filter((n: any) => !n.read).length;
    try {
      const raw = localStorage.getItem('pm_user_notifications');
      if (raw) {
        const localNotifs = JSON.parse(raw);
        if (Array.isArray(localNotifs)) {
          count += localNotifs.filter((n: any) => !n.read).length;
        }
      }
    } catch {}
    return count;
  }, [notifications]);

  // Fetch logged-in user's profile photo for the My Profile header button
  const userPhotoUrl = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const myProfRaw = localStorage.getItem('pm_my_profile');
      if (myProfRaw) {
        const p = JSON.parse(myProfRaw);
        if (p?.photos && Array.isArray(p.photos) && p.photos.length > 0) {
          const primary = p.photos.find((ph: any) => ph.isPrimary) || p.photos[0];
          if (primary?.url) return primary.url;
        }
      }
      if (user?.id) {
        const userProfRaw = localStorage.getItem(`pm_user_profile_${user.id}`);
        if (userProfRaw) {
          const p = JSON.parse(userProfRaw);
          if (p?.photos && Array.isArray(p.photos) && p.photos.length > 0) {
            const primary = p.photos.find((ph: any) => ph.isPrimary) || p.photos[0];
            if (primary?.url) return primary.url;
          }
        }
      }
      if (user?.imageUrl && !user.imageUrl.includes('gravatar') && !user.imageUrl.includes('default')) {
        return user.imageUrl;
      }
    } catch {}
    return null;
  }, [user]);

  const navLinks = [
    { label: 'Discover', href: '/discover' },
    { label: 'Search', href: '/search' },
    { label: 'Interests', href: '/interests' },
    { label: 'Messages', href: '/messages' },
    { label: 'My Profile', href: '/my-profile' },
    ...(isAdmin ? [{ label: 'Admin Hub', href: '/admin' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#ebdcd0]/80 bg-[#fdfbf9]/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-700 via-rose-800 to-rose-950 font-extrabold text-xs sm:text-sm text-amber-200 shadow-md border border-rose-600/30 tracking-widest group-hover:scale-105 transition-transform shrink-0">
              PM
            </div>
            <div className="min-w-0">
              <span className="block font-black text-xs sm:text-sm uppercase tracking-[0.12em] sm:tracking-[0.16em] text-slate-900 group-hover:text-rose-700 transition truncate max-w-[145px] sm:max-w-none">
                Pentecostal Matrimony
              </span>
              <span className="hidden sm:block text-[10px] uppercase font-semibold tracking-wider text-rose-600">
                Verified Covenant Fellowship
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
            {navLinks.map((item) => {
              const active = location === item.href;
              const isMessages = item.href === '/messages';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-xs font-bold tracking-wide transition py-1 relative inline-flex items-center gap-1.5 ${
                    active
                      ? 'border-b-2 border-rose-600 text-rose-700'
                      : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  <span>{item.label}</span>
                  {isMessages && unreadMessagesCount > 0 && (
                    <span className="relative flex items-center justify-center">
                      <span className="relative flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-extrabold text-white shadow-xs">
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="h-1.5 w-1.5 rounded-full bg-white mr-0.5 shrink-0" />
                        {unreadMessagesCount}
                      </span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Notifications Link with conditional unread badge */}
          <Link
            href="/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50 transition shrink-0"
            title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : "Notifications"}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600 shadow-xs animate-pulse"></span>
              </span>
            )}
          </Link>

          {/* Admin Portal link for Administrator */}
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-2xs shrink-0"
            >
              <Shield size={13} className="text-rose-400" />
              <span className="hidden sm:inline">Admin Portal</span>
            </Link>
          )}

          {/* Logout Icon Button next to My Profile */}
          <button
            onClick={() => signOut({ redirectUrl: '/' })}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50 transition shadow-2xs shrink-0"
            title="Log Out"
            aria-label="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
