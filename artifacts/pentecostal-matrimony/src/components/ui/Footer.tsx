import { Link } from 'wouter';
import { Heart, Lock, ShieldCheck, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="hidden md:block relative overflow-hidden border-t border-rose-950/40 bg-gradient-to-b from-[#1c0b15] via-[#14070f] to-[#0a0307] text-slate-300 pb-12 pt-16 text-xs">
      {/* Subtle Ambient Radial Glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-64 w-[700px] bg-rose-600/10 blur-3xl rounded-full" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Scripture / Covenant Quote Banner */}
        <div className="mb-12 rounded-2xl border border-rose-900/50 bg-rose-950/30 p-5 text-center backdrop-blur-sm shadow-inner">
          <p className="font-serif-fancy text-sm sm:text-base italic text-amber-200/90 font-medium">
            "What therefore God hath joined together, let not man put asunder."
          </p>
          <span className="font-script-fancy text-lg text-rose-400 block mt-1">
            Matthew 19:6 • Dedicated to Godly Christian Covenants
          </span>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-5">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3 group inline-flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 via-rose-800 to-amber-700 text-amber-200 font-extrabold text-sm tracking-wider shadow-lg border border-amber-400/30 group-hover:scale-105 transition-transform">
                <Heart size={16} className="fill-amber-200" />
              </div>
              <div>
                <span className="block font-serif-fancy text-base font-bold text-white tracking-wide">
                  Pentecostal Matrimony
                </span>
                <span className="font-script-fancy text-lg text-rose-400 -mt-1 block">
                  Covenant Fellowship
                </span>
              </div>
            </Link>

            <p className="max-w-sm text-xs leading-relaxed text-slate-400">
              A dignified matrimonial sanctuary exclusively built for Pentecostal Christian believers.
              Rooted in biblical alignment, pastoral transparency, family honor, and lifelong covenant prayer.
            </p>

            <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck size={13} /> Pastoral Verified
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400">
                <Lock size={13} /> 100% Contact Privacy
              </span>
            </div>

            <p className="text-[11px] text-slate-500 pt-2">
              © {new Date().getFullYear()} Pentecostal Matrimony. Dedicated to God's glory and holy homes.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-serif-fancy font-bold tracking-wider text-amber-300 text-xs uppercase">
              Explore
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
              <li>
                <Link href="/discover" className="hover:text-amber-200 transition">
                  Browse Believers
                </Link>
              </li>
              <li>
                <Link href="/matches" className="hover:text-amber-200 transition">
                  Spiritual Compatibility
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-amber-200 transition">
                  Denomination Directory
                </Link>
              </li>
              <li>
                <Link href="/subscription" className="hover:text-amber-200 transition">
                  Steward Membership
                </Link>
              </li>
              <li>
                <Link href="/onboarding" className="hover:text-amber-200 transition">
                  10-Step Profile Creation
                </Link>
              </li>
            </ul>
          </div>

          {/* Assemblies Links */}
          <div>
            <h4 className="font-serif-fancy font-bold tracking-wider text-amber-300 text-xs uppercase">
              Pentecostal Faith
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
              <li>
                <span className="text-slate-400 hover:text-slate-200 cursor-pointer">
                  Assemblies of God (AG)
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-slate-200 cursor-pointer">
                  Indian Pentecostal Church (IPC)
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-slate-200 cursor-pointer">
                  Church of God (Full Gospel)
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-slate-200 cursor-pointer">
                  Sharon Fellowship
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-slate-200 cursor-pointer">
                  Independent Assemblies
                </span>
              </li>
            </ul>
          </div>

          {/* Trust & Support */}
          <div>
            <h4 className="font-serif-fancy font-bold tracking-wider text-amber-300 text-xs uppercase">
              Pastoral & Trust
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
              <li>
                <Link href="/settings/privacy" className="hover:text-amber-200 transition">
                  Privacy & Contact Safety
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-amber-200 transition">
                  Steward Administration
                </Link>
              </li>
              <li>
                <a href="#pastoral-verification" className="hover:text-amber-200 transition">
                  Pastoral Reference Standards
                </a>
              </li>
              <li>
                <a href="mailto:pastor@pentecostalmatrimony.org" className="hover:text-amber-200 transition">
                  Pastoral Helpline
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-amber-200 transition">
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </footer>
  );
}
