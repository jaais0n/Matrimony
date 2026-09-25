import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Lock,
  MessageCircle,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  UserPlus,
  Compass,
  CalendarCheck,
  X
} from 'lucide-react';
import { useAuth, useClerk, useUser } from '../auth';
import { Footer } from '../components/ui/Footer';

const HERO_CARDS = [
  {
    id: 'grace',
    name: 'Grace',
    age: 26,
    match: '99% Match',
    denomination: 'Assemblies of God',
    profession: 'Architect',
    tag: 'Worship Team',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=500',
  },
  {
    id: 'joshua',
    name: 'Joshua',
    age: 28,
    match: '97% Match',
    denomination: 'IPC Ebenezer',
    profession: 'Tech Lead',
    tag: 'Youth Leader',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=500',
  },
  {
    id: 'believer_1',
    name: 'Verified Believer',
    age: 25,
    match: '94% Match',
    denomination: 'Church of God',
    profession: 'Healthcare',
    tag: 'Water Baptized',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=500',
  },
  {
    id: 'julian',
    name: 'Julian',
    age: 30,
    match: '92% Match',
    denomination: 'Church of God',
    profession: 'Civil Eng',
    tag: 'Sunday School',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=500',
  },
  {
    id: 'sharon',
    name: 'Sharon',
    age: 27,
    match: '96% Match',
    denomination: 'Sharon Fellow.',
    profession: 'Physiotherapist',
    tag: 'Choir Member',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=500',
  },
];

export function LandingPage() {
  const [, setLocation] = useLocation();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | 'elite'>('premium');
  const [isSpread, setIsSpread] = useState(false);
  const [activeSection, setActiveSection] = useState<'home' | 'journey' | 'plans' | 'testimonials'>('home');
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);

  const scrollToSection = (id: 'home' | 'journey' | 'plans' | 'testimonials') => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExploreBelievers = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isSignedIn) {
      setLocation('/discover');
    } else {
      setShowRestrictedModal(true);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      // While scrolling down, spread the cards! When at top, tuck them into back side
      if (window.scrollY > 20) {
        setIsSpread(true);
      } else {
        setIsSpread(false);
      }

      // Track active section for single-page nav highlight
      const sections = ['testimonials', 'plans', 'journey', 'home'];
      const scrollPos = window.scrollY + 220;
      for (const sec of sections) {
        const el = document.getElementById(sec);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sec as any);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#fdfbf9] text-slate-900 selection:bg-rose-500 selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* Top Floating Glass Header (Matches SoulSync reference) */}
      <header className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full border border-rose-100/80 bg-white/90 px-6 backdrop-blur-md shadow-sm transition-all hover:shadow-md">
          {/* Logo with Fancy Script / Serif Accent */}
          <button
            type="button"
            onClick={() => scrollToSection('home')}
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-700 text-white shadow-sm transition-transform group-hover:scale-105">
              <Heart size={16} className="fill-white" />
            </div>
            <span className="font-serif-fancy text-lg font-bold tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors">
              Pentecostal <span className="font-script-fancy text-2xl font-normal text-rose-600 -ml-0.5">Matrimony</span>
            </span>
          </button>

          {/* Navigation Links - Single Page Smooth Scrolling */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold">
            <button
              type="button"
              onClick={() => scrollToSection('home')}
              className={`transition pb-1 cursor-pointer ${
                activeSection === 'home'
                  ? 'text-rose-700 font-bold border-b-2 border-rose-700'
                  : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('journey')}
              className={`transition pb-1 cursor-pointer ${
                activeSection === 'journey'
                  ? 'text-rose-700 font-bold border-b-2 border-rose-700'
                  : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('plans')}
              className={`transition pb-1 cursor-pointer ${
                activeSection === 'plans'
                  ? 'text-rose-700 font-bold border-b-2 border-rose-700'
                  : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              Membership
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('testimonials')}
              className={`transition pb-1 cursor-pointer ${
                activeSection === 'testimonials'
                  ? 'text-rose-700 font-bold border-b-2 border-rose-700'
                  : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              Testimonies
            </button>
          </nav>

          {/* Right Action Button */}
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/discover"
                  className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-4 py-2 text-xs font-bold !text-white shadow-sm hover:bg-rose-800 transition active:scale-95"
                >
                  <span>Portal</span>
                  <div className="h-5 w-5 rounded-full overflow-hidden border border-white/60">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"
                      alt="Member Avatar"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ redirectUrl: '/' })}
                  className="text-[11px] font-semibold text-slate-500 hover:text-rose-700 px-2 py-1 transition cursor-pointer"
                  title="Sign Out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-5 py-2 text-xs font-bold !text-white shadow-sm hover:bg-rose-800 hover:shadow transition active:scale-95"
              >
                <span>Sign In</span>
                <div className="h-5 w-5 rounded-full overflow-hidden border border-white/60">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"
                    alt="Member Avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION WITH FANNED CARD STACK */}
      <section id="home" className="relative pt-12 pb-24 sm:pt-20 sm:pb-32 overflow-hidden">
        {/* Soft Warm Blush Glow Background */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[750px] w-full max-w-7xl bg-gradient-to-b from-[#fbeee6]/80 via-[#fdfbf9]/60 to-transparent blur-2xl -z-10" />
        
        {/* Soft Pastel Arch behind the cards */}
        <div className="pointer-events-none absolute top-64 left-1/2 -translate-x-1/2 h-[340px] w-[950px] rounded-t-full bg-gradient-to-t from-rose-200/40 via-amber-100/30 to-transparent blur-xl -z-10" />

        <div className="mx-auto max-w-5xl px-4 text-center">
          {/* Fancy Serif Headline with Script Accent */}
          <h1 className="font-serif-fancy text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.12]">
            Find Meaningful Connections <br className="hidden sm:inline" />
            <span className="font-normal italic text-slate-800">That Last for a </span>
            <span className="font-script-fancy text-5xl sm:text-7xl md:text-8xl font-normal text-rose-600 block sm:inline">
              Lifetime
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-sm sm:text-base text-slate-600 leading-relaxed">
            Meet genuine, God-fearing believers through thoughtful matching based on
            shared Pentecostal faith, pastoral integrity, and lifelong marriage goals.
          </p>

          {/* Call to Actions (Pill Buttons matching reference) */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="w-full sm:w-auto rounded-full bg-rose-700 px-8 py-3.5 text-xs font-bold uppercase tracking-wider !text-white shadow-md hover:bg-rose-800 transition active:scale-95 text-center"
            >
              Start Matching
            </Link>
            <button
              type="button"
              onClick={handleExploreBelievers}
              className="w-full sm:w-auto rounded-full border border-[#ebdcd0] bg-white/90 px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-800 hover:border-rose-400 hover:text-rose-700 transition luxury-card-shadow cursor-pointer"
            >
              Explore Believers
            </button>
          </div>
        </div>

        {/* ICONIC FANNED-OUT PROFILE CARDS ARC (SPREAD ON SCROLL) */}
        <div 
          onClick={() => setIsSpread(!isSpread)}
          className="relative mx-auto mt-14 sm:mt-20 max-w-6xl px-4 flex flex-col items-center justify-center cursor-pointer"
        >
          
          {/* Concentric Pastel Rainbow Arches directly behind the cards */}
          <div className={`pointer-events-none absolute -top-8 sm:-top-12 left-1/2 -translate-x-1/2 flex items-center justify-center -z-10 select-none transition-all duration-700 ease-out ${
            isSpread ? 'scale-100 opacity-90' : 'scale-75 opacity-25'
          }`}>
            {/* Outer Arch */}
            <div className="h-[280px] sm:h-[380px] md:h-[440px] w-[560px] sm:w-[780px] md:w-[940px] rounded-t-full border-[20px] sm:border-[34px] md:border-[44px] border-rose-100/50 opacity-70" />
            {/* Mid Arch */}
            <div className="absolute h-[230px] sm:h-[310px] md:h-[360px] w-[460px] sm:w-[650px] md:w-[780px] rounded-t-full border-[18px] sm:border-[28px] md:border-[36px] border-amber-100/60 opacity-80" />
            {/* Inner Arch */}
            <div className="absolute h-[180px] sm:h-[240px] md:h-[280px] w-[360px] sm:w-[520px] md:w-[620px] rounded-t-full border-[14px] sm:border-[22px] md:border-[28px] border-rose-200/50 opacity-90" />
          </div>

          {/* Symmetrical Fan Container */}
          <div className="relative flex items-end justify-center -space-x-4 sm:-space-x-6 md:-space-x-8 perspective-1000 pt-4 pb-8 select-none">
            
            {/* Card 1: Far Left (-16 deg on spread, tucked in back when at top) */}
            <div className={`relative w-36 sm:w-48 md:w-56 flex-shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border-2 border-white bg-white transition-all duration-700 ease-out ${
              isSpread
                ? 'transform -rotate-[16deg] translate-y-8 sm:translate-y-10 translate-x-0 z-10 opacity-100'
                : 'transform rotate-0 translate-y-0 translate-x-20 sm:translate-x-32 md:translate-x-44 scale-90 z-10 opacity-60'
            }`}>
              <div className="h-56 sm:h-72 md:h-84 w-full overflow-hidden bg-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400"
                  alt="Verified Member"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute inset-x-2 bottom-2 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-md p-2.5 sm:p-3 shadow-md">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif-fancy text-xs sm:text-sm font-bold text-slate-900 truncate">Verified Believer, 25</h4>
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">94% Match</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="text-[8px] sm:text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Water Baptized</span>
                  <span className="text-[8px] sm:text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Healthcare</span>
                </div>
              </div>
            </div>

            {/* Card 2: Mid Left (-8 deg on spread, tucked in back when at top) */}
            <div className={`relative w-38 sm:w-50 md:w-58 flex-shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 border-white bg-white transition-all duration-700 ease-out ${
              isSpread
                ? 'transform -rotate-[8deg] translate-y-2 sm:translate-y-3 translate-x-0 z-20 opacity-100'
                : 'transform rotate-0 translate-y-0 translate-x-10 sm:translate-x-16 md:translate-x-22 scale-95 z-20 opacity-80'
            }`}>
              <div className="h-58 sm:h-76 md:h-88 w-full overflow-hidden bg-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"
                  alt="Joshua V."
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-md p-2.5 sm:p-3.5 shadow-md">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif-fancy text-xs sm:text-base font-bold text-slate-900 truncate">Joshua, 28</h4>
                  <span className="text-[9px] sm:text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">97% Match</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1 sm:gap-1.5">
                  <span className="text-[8px] sm:text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">IPC Ebenezer</span>
                  <span className="text-[8px] sm:text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">Tech Lead</span>
                </div>
              </div>
            </div>

            {/* Card 3: Center Featured (Apex elevation) */}
            <div className={`relative w-42 sm:w-54 md:w-62 flex-shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white transition-all duration-700 ease-out ${
              isSpread
                ? 'transform rotate-0 -translate-y-3 sm:-translate-y-4 z-30 scale-105'
                : 'transform rotate-0 translate-y-0 z-30 scale-100'
            }`}>
              <div className="h-64 sm:h-82 md:h-96 w-full overflow-hidden bg-slate-100 relative">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=500"
                  alt="Grace E. Thomas"
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-3 right-3 rounded-full bg-rose-600 text-white p-1 shadow-md">
                  <Sparkles size={14} />
                </div>
              </div>
              <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-md p-3 sm:p-4 shadow-lg border border-rose-100/60">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif-fancy text-sm sm:text-lg font-bold text-slate-900 truncate">Grace, 26</h4>
                  <span className="text-[10px] sm:text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/50">
                    99% Match
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1 sm:gap-1.5">
                  <span className="text-[9px] sm:text-[10px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md">
                    Assemblies of God
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    Architect
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md hidden sm:inline-block">
                    Worship Team
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Mid Right (+8 deg on spread, tucked in back when at top) */}
            <div className={`relative w-38 sm:w-50 md:w-58 flex-shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 border-white bg-white transition-all duration-700 ease-out ${
              isSpread
                ? 'transform rotate-[8deg] translate-y-2 sm:translate-y-3 translate-x-0 z-20 opacity-100'
                : 'transform rotate-0 translate-y-0 -translate-x-10 sm:-translate-x-16 md:-translate-x-22 scale-95 z-20 opacity-80'
            }`}>
              <div className="h-58 sm:h-76 md:h-88 w-full overflow-hidden bg-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400"
                  alt="Julian Toby"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-md p-2.5 sm:p-3.5 shadow-md">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif-fancy text-xs sm:text-base font-bold text-slate-900 truncate">Julian, 30</h4>
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">92% Match</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1 sm:gap-1.5">
                  <span className="text-[8px] sm:text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">Church of God</span>
                  <span className="text-[8px] sm:text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">Civil Eng</span>
                </div>
              </div>
            </div>

            {/* Card 5: Far Right (+16 deg on spread, tucked in back when at top) */}
            <div className={`relative w-36 sm:w-48 md:w-56 flex-shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border-2 border-white bg-white transition-all duration-700 ease-out ${
              isSpread
                ? 'transform rotate-[16deg] translate-y-8 sm:translate-y-10 translate-x-0 z-10 opacity-100'
                : 'transform rotate-0 translate-y-0 -translate-x-20 sm:-translate-x-32 md:-translate-x-44 scale-90 z-10 opacity-60'
            }`}>
              <div className="h-56 sm:h-72 md:h-84 w-full overflow-hidden bg-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400"
                  alt="Sharon M."
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute inset-x-2 bottom-2 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-md p-2.5 sm:p-3 shadow-md">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif-fancy text-xs sm:text-sm font-bold text-slate-900 truncate">Sharon, 27</h4>
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">96% Match</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="text-[8px] sm:text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Sharon Fellow.</span>
                  <span className="text-[8px] sm:text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Physiotherapist</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* YOUR JOURNEY TO CONNECTION (WARM CHAMPAGNE SILK LUXURY) */}
      <section id="journey" className="py-24 sm:py-32 bg-gradient-to-b from-[#fdfbf9] via-[#f7f0ea] to-[#fbf4ee] border-t border-[#ebdcd0] relative overflow-hidden">
        {/* Soft Ambient Radial Glow */}
        <div className="pointer-events-none absolute top-12 left-1/4 h-80 w-80 rounded-full bg-rose-200/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-12 right-1/4 h-80 w-80 rounded-full bg-amber-200/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center">
            <h2 className="font-serif-fancy text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
              Your Journey to Covenant Connection
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-rose-500 to-amber-500" />
            <p className="mx-auto mt-4 max-w-xl text-xs sm:text-sm text-slate-600 leading-relaxed">
              A dignified, respectful path from initial prayerful discovery to holy Christian matrimony.
            </p>
          </div>

          {/* 4 Minimalist Outline Step Cards (Luxury Glass Surfaces) */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Step 1 */}
            <div className="group rounded-3xl border border-[#ebdcd0] bg-white/85 backdrop-blur-md p-7 luxury-card-shadow hover:shadow-xl hover:border-rose-300 transition-all duration-300">
              <h3 className="font-serif-fancy text-xl font-bold text-slate-900">Create Profile</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Tell your story, your water baptism testimony, family background, and partner preferences.
              </p>
              
              <div className="mt-8 flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br from-[#faf4ee] to-[#f3e7dc] border border-[#ebdcd0] group-hover:border-rose-200 transition-colors">
                <div className="flex h-14 w-12 flex-col items-center justify-center rounded-xl border border-rose-300/80 bg-white shadow-xs relative">
                  <div className="h-5 w-5 rounded-full border border-slate-300 bg-slate-100 mb-1" />
                  <div className="h-1.5 w-6 rounded-full bg-slate-200" />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px] font-bold">
                    +
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group rounded-3xl border border-[#ebdcd0] bg-white/85 backdrop-blur-md p-7 luxury-card-shadow hover:shadow-xl hover:border-rose-300 transition-all duration-300">
              <h3 className="font-serif-fancy text-xl font-bold text-slate-900">Discover Matches</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Browse verified Pentecostal profiles aligned with your denomination and spiritual convictions.
              </p>
              
              <div className="mt-8 flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br from-[#faf4ee] to-[#f3e7dc] border border-[#ebdcd0] group-hover:border-rose-200 transition-colors">
                <div className="relative">
                  <div className="h-14 w-10 rounded-lg border border-slate-200 bg-white shadow-xs transform -rotate-12 absolute -left-2 top-0" />
                  <div className="h-14 w-10 rounded-lg border border-rose-300 bg-white shadow-md relative flex items-center justify-center text-rose-500">
                    <Heart size={14} className="fill-rose-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group rounded-3xl border border-[#ebdcd0] bg-white/85 backdrop-blur-md p-7 luxury-card-shadow hover:shadow-xl hover:border-rose-300 transition-all duration-300">
              <h3 className="font-serif-fancy text-xl font-bold text-slate-900">Start Conversations</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Connect deeply through intentional messaging while maintaining phone number and contact privacy.
              </p>
              
              <div className="mt-8 flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br from-[#faf4ee] to-[#f3e7dc] border border-[#ebdcd0] group-hover:border-rose-200 transition-colors">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-11 w-14 items-center justify-center rounded-2xl rounded-bl-none border border-rose-300/80 bg-white shadow-xs text-rose-500">
                    <MessageCircle size={16} />
                  </div>
                  <div className="flex h-8 w-10 items-center justify-center rounded-2xl rounded-br-none border border-slate-200 bg-white shadow-xs text-slate-400">
                    <span className="text-[10px] font-bold">•••</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="group rounded-3xl border border-[#ebdcd0] bg-white/85 backdrop-blur-md p-7 luxury-card-shadow hover:shadow-xl hover:border-rose-300 transition-all duration-300">
              <h3 className="font-serif-fancy text-xl font-bold text-slate-900">Holy Matrimony</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Involve parents, consult pastors, and take the step from digital discovery into a blessed covenant.
              </p>
              
              <div className="mt-8 flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br from-[#faf4ee] to-[#f3e7dc] border border-[#ebdcd0] group-hover:border-rose-200 transition-colors">
                <div className="flex items-center gap-2 text-rose-500">
                  <Users size={28} className="stroke-[1.5]" />
                  <Heart size={14} className="fill-rose-500 -mt-3 -ml-2" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PRICING & MEMBERSHIP PLANS (WARM BLUSH LUXURY PALETTE) */}
      <section id="plans" className="py-24 sm:py-32 bg-gradient-to-b from-[#fbf4ee] via-[#f7eee6] to-[#fcf8f4] border-t border-[#ebded4] relative overflow-hidden">
        {/* Soft Radial Ambient Lighting */}
        <div className="pointer-events-none absolute top-1/3 right-10 h-96 w-96 rounded-full bg-amber-200/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 left-10 h-96 w-96 rounded-full bg-rose-200/20 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center">
            <h2 className="font-serif-fancy text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Find the Plan That Fits You
            </h2>
            <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-rose-500" />
            <p className="mx-auto mt-3 text-xs sm:text-sm text-slate-500">
              Transparent, honest plans designed to support serious believers and family stewards.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 items-stretch">
            
            {/* Free Plan */}
            <div className="flex flex-col justify-between rounded-3xl border border-[#ebdcd0] bg-white/90 backdrop-blur-sm p-8 luxury-card-shadow hover:shadow-xl hover:border-rose-300 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif-fancy text-xl font-bold text-slate-900">Free</h3>
                  <span className="rounded-full bg-[#f4ebe3] border border-[#ebdcd0] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                    Basic
                  </span>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">$0</span>
                  <span className="text-xs text-slate-500 ml-1">/mo</span>
                </div>

                <div className="mt-6 border-t border-[#ebdcd0]/70 pt-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">What you get</p>
                  <ul className="space-y-3 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-rose-500 flex-shrink-0" />
                      <span>Create verified profile</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-rose-500 flex-shrink-0" />
                      <span>Send limited daily interests</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-rose-500 flex-shrink-0" />
                      <span>Basic denomination filters</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/onboarding"
                  className="block w-full text-center rounded-full border border-[#ebdcd0] bg-white py-2.5 text-xs font-bold uppercase tracking-wider text-slate-800 hover:border-rose-400 hover:text-rose-600 transition"
                >
                  Get Started
                </Link>
              </div>
            </div>

            {/* Premium Plan (Featured in reference with luxury warm glow) */}
            <div className="relative flex flex-col justify-between rounded-3xl border-2 border-rose-400/80 bg-gradient-to-b from-white via-[#fff9f6] to-[#fff2ec] p-8 shadow-2xl shadow-rose-900/10 transform md:-translate-y-2">
              <div className="absolute -top-3.5 right-6 rounded-full bg-rose-700 px-4 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                Popular Choice
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif-fancy text-xl font-bold text-slate-900">Premium</h3>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-rose-600">$29</span>
                  <span className="text-xs text-slate-500 ml-1">/mo</span>
                </div>

                <div className="mt-6 border-t border-rose-200/60 pt-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-4">What you get</p>
                  <ul className="space-y-3 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-rose-600 flex-shrink-0" />
                      <span><strong>Unlimited</strong> daily interests</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-rose-600 flex-shrink-0" />
                      <span>See who viewed & liked your profile</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-rose-600 flex-shrink-0" />
                      <span>Advanced denomination & assembly filters</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-rose-600 flex-shrink-0" />
                      <span>Priority in pastoral verification queue</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/subscription"
                  className="block w-full text-center rounded-full bg-rose-700 py-3 text-xs font-bold uppercase tracking-wider !text-white shadow-md hover:bg-rose-800 transition active:scale-95"
                >
                  Choose Premium
                </Link>
              </div>
            </div>

            {/* Elite Plan */}
            <div className="flex flex-col justify-between rounded-3xl border border-[#ebdcd0] bg-white/90 backdrop-blur-sm p-8 luxury-card-shadow hover:shadow-xl hover:border-amber-400/60 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif-fancy text-xl font-bold text-slate-900">Elite</h3>
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    VIP Steward
                  </span>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900">$59</span>
                  <span className="text-xs text-slate-500 ml-1">/mo</span>
                </div>

                <div className="mt-6 border-t border-[#ebdcd0]/70 pt-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">What you get</p>
                  <ul className="space-y-3 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-rose-500 flex-shrink-0" />
                      <span>Everything in Premium</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-rose-500 flex-shrink-0" />
                      <span>Dedicated family steward assistance</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-rose-500 flex-shrink-0" />
                      <span>Pastoral reference check concierge</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-rose-500 flex-shrink-0" />
                      <span>Exclusive profile highlight badge</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href="/subscription"
                  className="block w-full text-center rounded-full border border-[#ebdcd0] bg-white py-2.5 text-xs font-bold uppercase tracking-wider text-slate-800 hover:border-amber-400 hover:text-amber-700 transition"
                >
                  Go Elite
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* DEVOUT BELIEVERS / COMPATIBILITY (WARM LUXURY SILK SURFACE) */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-[#fcf7f2] via-[#f8f1e8] to-[#fbf5ee] border-t border-[#ebdcd0] relative overflow-hidden">
        {/* Soft Ambient Radial Accents */}
        <div className="pointer-events-none absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-rose-200/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-amber-200/25 blur-3xl" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Left Compatibility Card Display */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-[#ebdcd0] bg-white/90 backdrop-blur-md p-8 luxury-card-shadow">
                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-rose-300 shadow-md">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
                      alt="Believer Bride"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <Heart size={14} className="fill-rose-500" />
                  </div>
                  <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-rose-300 shadow-md">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
                      alt="Believer Groom"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                {/* Compatibility Metrics */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                      <span>Spiritual Harmony (Baptism & Faith)</span>
                      <span className="text-rose-600 font-extrabold">98%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#faefe6] overflow-hidden">
                      <div className="h-full rounded-full bg-rose-500 w-[98%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                      <span>Family & Pastoral Values</span>
                      <span className="text-rose-600 font-extrabold">94%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#faefe6] overflow-hidden">
                      <div className="h-full rounded-full bg-rose-400 w-[94%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                      <span>Life Goals & Calling</span>
                      <span className="text-rose-600 font-extrabold">91%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#faefe6] overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500 w-[91%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Text Column */}
            <div className="lg:col-span-6 space-y-6">
              <h2 className="font-serif-fancy text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                Devout Believers, <br />
                <span className="font-script-fancy text-4xl sm:text-5xl text-rose-600 font-normal">
                  Just Like You
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Our platform is thoughtfully designed for Christian believers seeking authentic holy matrimony,
                whether you're looking for spiritual companionship, pastoral alignment, or lifelong covenant devotion.
              </p>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Connect with thoughtful, like-minded believers who value honesty, prayer, family honor, and shared spiritual purpose. From meaningful private conversations to lasting marriages built on Christ.
              </p>

              <div className="pt-2">
                <Link
                  href="/onboarding"
                  className="inline-block rounded-full bg-rose-700 px-8 py-3 text-xs font-bold uppercase tracking-wider !text-white hover:bg-rose-800 transition active:scale-95 shadow-md"
                >
                  Join Now
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* WHAT OUR USERS SAY (WARM CHAMPAGNE AMBIENCE WITH LUXURY CARDS) */}
      <section id="testimonials" className="py-20 sm:py-28 bg-gradient-to-b from-[#fbf5ee] via-[#f7f0ea] to-[#f5eae0] border-t border-[#ebdcd0] relative overflow-hidden">
        {/* Soft Radial Ambient Lighting */}
        <div className="pointer-events-none absolute top-10 right-1/3 h-96 w-96 rounded-full bg-amber-100/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 left-10 h-80 w-80 rounded-full bg-rose-200/20 blur-3xl" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center">
            <h2 className="font-serif-fancy text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              What Our Blessed Couples Say
            </h2>
            <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-rose-500" />
            <p className="mx-auto mt-3 text-xs sm:text-sm text-slate-500">
              Real stories of prayer, pastoral discernment, and God’s perfect timing.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
            
            {/* Testimonial 1 */}
            <div className="flex flex-col justify-between rounded-3xl border border-[#ebdcd0] bg-white/90 backdrop-blur-sm p-6 luxury-card-shadow hover:shadow-xl hover:border-rose-300 transition-all duration-300">
              <div>
                <div className="h-10 w-10 rounded-full overflow-hidden mb-4 border border-rose-200 shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150"
                    alt="Daniel"
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "I had almost given up on digital matrimony because everything felt superficial. Pentecostal Matrimony felt completely different. The faith transparency introduced me to someone who truly shared my Pentecostal roots."
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#ebdcd0]/70">
                <span className="font-script-fancy text-2xl text-slate-800 block">
                  Daniel Morris
                </span>
                <span className="text-[10px] text-slate-400">Assemblies of God, Kottayam</span>
              </div>
            </div>

            {/* Testimonial 2 (Couple Video Thumbnail card like reference) */}
            <div className="relative group rounded-3xl overflow-hidden shadow-md flex items-center justify-center min-h-[280px] border border-[#ebdcd0]">
              <img
                src="https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&q=80&w=500"
                alt="Married Couple"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/20 transition-colors" />
              
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-rose-600 shadow-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                <Play size={20} className="fill-rose-600 ml-1" />
              </div>

              <div className="absolute bottom-4 inset-x-4 text-center z-10">
                <span className="font-script-fancy text-2xl text-white drop-shadow-md">
                  Thomas & Susan
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-100 drop-shadow">
                  Blessed Marriage 2024
                </span>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="flex flex-col justify-between rounded-3xl border border-[#ebdcd0] bg-white/90 backdrop-blur-sm p-6 luxury-card-shadow hover:shadow-xl hover:border-rose-300 transition-all duration-300">
              <div>
                <div className="h-10 w-10 rounded-full overflow-hidden mb-4 border border-rose-200 shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150"
                    alt="Rosie"
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "What stood out most was the quality of genuine connections. Instead of endless casual browsing, every person here is intentional about building something lasting. We found each other within two months."
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#ebdcd0]/70">
                <span className="font-script-fancy text-2xl text-slate-800 block">
                  Rosie Alexander
                </span>
                <span className="text-[10px] text-slate-400">IPC Central, Bangalore</span>
              </div>
            </div>

            {/* Testimonial 4 */}
            <div className="flex flex-col justify-between rounded-3xl border border-[#ebdcd0] bg-white/90 backdrop-blur-sm p-6 luxury-card-shadow hover:shadow-xl hover:border-rose-300 transition-all duration-300">
              <div>
                <div className="h-10 w-10 rounded-full overflow-hidden mb-4 border border-rose-200 shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150"
                    alt="Savannah"
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "I loved how safe and thoughtfully designed the experience felt. From pastoral verification to private messaging, everything eliminated the awkwardness of traditional arranged marriage setups."
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#ebdcd0]/70">
                <span className="font-script-fancy text-2xl text-slate-800 block">
                  Savannah Philip
                </span>
                <span className="text-[10px] text-slate-400">Church of God, Dubai</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-24 bg-gradient-to-b from-[#f5eae0] via-[#fbf2eb] to-[#f6e6dc] text-center border-t border-[#ebdcd0] relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-rose-200/30 blur-3xl" />

        <div className="mx-auto max-w-3xl px-4 relative z-10">
          <span className="font-script-fancy text-4xl sm:text-5xl text-rose-600 block mb-2">
            A Holy Covenant Awaits
          </span>
          <h2 className="font-serif-fancy text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Begin Your Sacred Journey Today
          </h2>
          <p className="mt-4 text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Join hundreds of verified Pentecostal believers who are prayerfully preparing for marriage with pastoral honor.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/onboarding"
              className="rounded-full bg-rose-700 px-8 py-3.5 text-xs font-bold uppercase tracking-wider !text-white shadow-md hover:bg-rose-800 transition active:scale-95"
            >
              Start Free Registration
            </Link>
            <button
              type="button"
              onClick={handleExploreBelievers}
              className="rounded-full border border-[#ebdcd0] bg-white/90 backdrop-blur-sm px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-800 hover:border-rose-400 hover:text-rose-600 luxury-card-shadow transition cursor-pointer"
            >
              {isSignedIn ? 'Explore Believers' : 'Registered Member Directory'}
            </button>
          </div>
        </div>
      </section>

      {/* RESTRICTED ACCESS MODAL FOR UNREGISTERED GUESTS */}
      {showRestrictedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-[#ebdcd0] bg-white p-7 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setShowRestrictedModal(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 mb-4">
              <Lock size={26} />
            </div>

            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
              Registered Believers Only
            </span>

            <h3 className="mt-4 font-serif-fancy text-2xl font-bold text-slate-900 leading-snug">
              Partner Profiles Are Reserved for Registered Members
            </h3>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              To honor biblical marriage intentions, family dignity, and pastoral oversight, our believer directory is kept private. Full profiles are only visible to registered Christian members.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href="/onboarding"
                onClick={() => setShowRestrictedModal(false)}
                className="w-full rounded-full bg-rose-700 py-3 text-xs font-bold uppercase tracking-wider !text-white shadow-md hover:bg-rose-800 transition text-center"
              >
                Register Free in 2 Minutes
              </Link>
              <Link
                href="/sign-in"
                onClick={() => setShowRestrictedModal(false)}
                className="w-full rounded-full border border-slate-300 bg-white py-3 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition text-center"
              >
                Already a Member? Sign In
              </Link>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
