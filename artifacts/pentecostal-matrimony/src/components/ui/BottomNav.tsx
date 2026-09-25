import { Link, useLocation } from 'wouter';
import { Compass, Flame, Heart, MessageSquare, User } from 'lucide-react';

export function BottomNav() {
  const [location] = useLocation();

  const items = [
    { label: 'Discover', href: '/discover', icon: Compass },
    { label: 'Matches', href: '/matches', icon: Flame },
    { label: 'Interests', href: '/interests', icon: Heart },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
    { label: 'Profile', href: '/my-profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-slate-200/90 bg-white/95 backdrop-blur-md md:hidden shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const active = location === item.href || (item.href === '/discover' && location === '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center py-1 transition ${
              active ? 'text-rose-700 font-bold' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <div className={`p-1 rounded-full ${active ? 'bg-rose-50 text-rose-700' : ''}`}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} fill={active && item.icon === Heart ? '#be123c' : 'none'} />
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
