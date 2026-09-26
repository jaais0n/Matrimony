import { useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { Compass, Flame, Heart, MessageSquare, Shield, User } from 'lucide-react';
import { useUser } from '../../auth';

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useUser();

  const demoRole = typeof window !== 'undefined' ? localStorage.getItem('pm_demo_role') : null;
  const isAdmin = user?.publicMetadata?.role === 'admin' || demoRole === 'admin' || user?.id === 'user_admin';

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

  const items = [
    { label: 'Discover', href: '/discover', icon: Compass },
    { label: 'Matches', href: '/matches', icon: Flame },
    { label: 'Interests', href: '/interests', icon: Heart },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
    ...(isAdmin
      ? [{ label: 'Admin', href: '/admin', icon: Shield }]
      : [{ label: 'Profile', href: '/my-profile', icon: User }]),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-slate-200/90 bg-white/95 backdrop-blur-md md:hidden shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const active = location === item.href || (item.href === '/discover' && location === '/');
        const isProfileItem = item.href === '/my-profile';

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center py-1 transition ${
              active ? 'text-rose-700 font-bold' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <div className={`p-1 rounded-full ${active ? 'bg-rose-50 text-rose-700' : ''}`}>
              {isProfileItem && userPhotoUrl ? (
                <div className={`h-6 w-6 rounded-full overflow-hidden border ${active ? 'border-rose-600 ring-2 ring-rose-200' : 'border-slate-300'}`}>
                  <img src={userPhotoUrl} alt="Profile" className="h-full w-full object-cover" />
                </div>
              ) : (
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} fill={active && item.icon === Heart ? '#be123c' : 'none'} />
              )}
            </div>
            <span className={`text-[10px] tracking-tight ${active ? 'font-bold text-rose-800' : 'font-medium'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
