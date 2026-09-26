import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { Heart } from 'lucide-react';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from './auth';

import { Navbar } from './components/ui/Navbar';
import { BottomNav } from './components/ui/BottomNav';
import { Footer } from './components/ui/Footer';

// Core pages (eagerly loaded for instant first paint)
import { LandingPage } from './pages/LandingPage';
import { DiscoverPage } from './pages/DiscoverPage';

// Lazy-loaded secondary pages (code-split to drop bundle size from 841KB to ~160KB)
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const MatchesPage = lazy(() => import('./pages/MatchesPage').then((m) => ({ default: m.MatchesPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const ProfileDetailPage = lazy(() => import('./pages/ProfileDetailPage').then((m) => ({ default: m.ProfileDetailPage })));
const InterestsPage = lazy(() => import('./pages/InterestsPage').then((m) => ({ default: m.InterestsPage })));
const MessagesPage = lazy(() => import('./pages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const MyProfilePage = lazy(() => import('./pages/MyProfilePage').then((m) => ({ default: m.MyProfilePage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));

import NotFound from './pages/not-found';
import { ErrorBoundary } from './components/error-boundary';

import { safeSetLocalStorage } from './utils/storageHelper';
import { isSeedProfile, INITIAL_REGISTERED_PROFILES } from '@workspace/api-client-react';

import './index.css';

// One-time clean startup wipe for fresh testing across all devices
export function purgeLocalSeedProfiles() {
  try {
    const FRESH_KEY = 'pm_fresh_startup_v3';
    if (!localStorage.getItem(FRESH_KEY)) {
      localStorage.removeItem('pm_registered_profiles');
      localStorage.removeItem('pm_my_profile');
      localStorage.removeItem('pm_registered_users');
      localStorage.removeItem('pm_registered_accounts');
      localStorage.removeItem('pm_auth_user');
      // Remove any leftover profile caches
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('pm_user_profile_') || k.startsWith('pm_profile_') || k.startsWith('pm_fresh_startup_v'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('pm_registered_profiles', '[]');
      localStorage.setItem('pm_registered_accounts', '[]');
      localStorage.setItem(FRESH_KEY, 'true');
      return;
    }

    const raw = localStorage.getItem('pm_registered_profiles');
    if (!raw) {
      safeSetLocalStorage('pm_registered_profiles', []);
    } else {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((p: any) => !isSeedProfile(p));
        safeSetLocalStorage('pm_registered_profiles', cleaned);
      }
    }
    const myProfRaw = localStorage.getItem('pm_my_profile');
    if (myProfRaw) {
      const myProf = JSON.parse(myProfRaw);
      if (isSeedProfile(myProf)) {
        localStorage.removeItem('pm_my_profile');
      }
    }
  } catch {}
}

// Immediate run when module loads
purgeLocalSeedProfiles();



function DataSyncEffect() {
  const queryClient = useQueryClient();
  const lastPushedHashRef = useRef<string>('');

  useEffect(() => {
    let lastFocusSync = 0;

    const syncData = async (forcePush = false) => {
      try {
        purgeLocalSeedProfiles();

        // 1. Collect all real local profiles from this device
        let localProfiles: any[] = [];
        const raw = localStorage.getItem('pm_registered_profiles');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) localProfiles = parsed.filter((p) => !isSeedProfile(p));
          } catch {}
        }
        const myProfRaw = localStorage.getItem('pm_my_profile');
        if (myProfRaw) {
          try {
            const myProf = JSON.parse(myProfRaw);
            if (myProf && !isSeedProfile(myProf) && !localProfiles.some((p) => p.id === myProf.id || p.userId === myProf.userId)) {
              localProfiles.push(myProf);
            }
          } catch {}
        }

        // 2. Push real local profiles to server only when there is changed data
        const payload = localProfiles.filter((p) => !isSeedProfile(p));
        const currentHash = JSON.stringify(payload.map(p => `${p.id}_${p.updatedAt || ''}`));
        
        if (payload.length > 0 && (forcePush || currentHash !== lastPushedHashRef.current)) {
          lastPushedHashRef.current = currentHash;
          try {
            await fetch('/api/profiles/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          } catch (syncErr) {
            console.warn('Sync push warning (non-fatal):', syncErr);
          }
        }

        // 3. Pull ALL server profiles and merge into local storage
        const res = await fetch('/api/profiles').catch(() => null);
        if (res && res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json().catch(() => null);
            const rawServerProfiles: any[] = (data && Array.isArray(data.items)) ? data.items : (Array.isArray(data) ? data : []);
            const serverProfiles = rawServerProfiles.filter((p) => !isSeedProfile(p));

            if (serverProfiles.length > 0) {
              const existingRaw = localStorage.getItem('pm_registered_profiles');
              const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
              const merged = existing.filter((p) => !isSeedProfile(p));
              for (const sp of serverProfiles) {
                const idx = merged.findIndex((m) => m.id === sp.id || m.userId === sp.userId);
                if (idx >= 0) {
                  const serverTime = sp.updatedAt ? new Date(sp.updatedAt).getTime() : 0;
                  const localTime = merged[idx].updatedAt ? new Date(merged[idx].updatedAt).getTime() : 0;
                  if (serverTime >= localTime) {
                    merged[idx] = { ...merged[idx], ...sp };
                  }
                } else {
                  merged.push(sp);
                }
              }
              const finalMerged = merged.filter((p) => !isSeedProfile(p));
              safeSetLocalStorage('pm_registered_profiles', finalMerged);

              // Automatically restore My Profile for the currently logged-in user on this device
              try {
                const authUserRaw = localStorage.getItem('pm_auth_user');
                if (authUserRaw) {
                  const au = JSON.parse(authUserRaw);
                  const myMatch = finalMerged.find((p) => 
                    p.userId === au.id || 
                    p.id === `prof_${au.id}` || 
                    (au.primaryEmailAddress?.emailAddress && p.email && p.email.toLowerCase() === au.primaryEmailAddress.emailAddress.toLowerCase()) ||
                    (au.email && p.email && p.email.toLowerCase() === au.email.toLowerCase()) ||
                    (au.fullName && p.displayName && p.displayName.trim().toLowerCase() === au.fullName.trim().toLowerCase())
                  );
                  if (myMatch) {
                    safeSetLocalStorage('pm_my_profile', myMatch);
                    safeSetLocalStorage(`pm_user_profile_${au.id}`, myMatch);
                    queryClient.invalidateQueries({ queryKey: ['/api/profiles/me'] });
                  } else {
                    const currentMyProf = localStorage.getItem('pm_my_profile');
                    if (currentMyProf) {
                      const cmp = JSON.parse(currentMyProf);
                      if (cmp.userId && cmp.userId !== au.id && cmp.id !== `prof_${au.id}` && cmp.displayName !== au.fullName) {
                        localStorage.removeItem('pm_my_profile');
                      }
                    }
                  }
                }
              } catch {}

              queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
            }
          }
        }

        // 4. Also sync user accounts from server
        try {
          const authRes = await fetch('/api/auth/users').catch(() => null);
          if (authRes && authRes.ok) {
            const serverUsers = await authRes.json().catch(() => []);
            if (Array.isArray(serverUsers) && serverUsers.length > 0) {
              const currentLocalRaw = localStorage.getItem('pm_registered_accounts');
              const currentLocal = currentLocalRaw ? JSON.parse(currentLocalRaw) : [];
              const mergedAccounts = [...currentLocal];
              for (const su of serverUsers) {
                const idx = mergedAccounts.findIndex((m: any) => m.id === su.id || (su.email && m.email?.toLowerCase() === su.email?.toLowerCase()));
                if (idx >= 0) {
                  mergedAccounts[idx] = { ...mergedAccounts[idx], ...su };
                } else {
                  mergedAccounts.push(su);
                }
              }
              localStorage.setItem('pm_registered_accounts', JSON.stringify(mergedAccounts));
            }
          }
        } catch {}
      } catch {
        // Silently ignore sync errors
      }
    };

    // 1. Initial sync on mount
    syncData(false);

    // 2. Immediate sync when user saves profile or registers (custom event)
    const onSyncEvent = () => syncData(true);
    window.addEventListener('pm:sync', onSyncEvent);

    // 3. Gentle throttled sync when window gets focus (at most once every 3 minutes)
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusSync > 180000) {
        lastFocusSync = now;
        syncData(false);
      }
    };
    window.addEventListener('focus', onFocus);

    // 4. Gentle periodic poll (every 3 minutes only when document is visible)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncData(false);
      }
    }, 180000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('pm:sync', onSyncEvent);
      window.removeEventListener('focus', onFocus);
    };
  }, [queryClient]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes fresh in cache to eliminate repeat network requests
      gcTime: 15 * 60 * 1000,   // Keep cached in memory for 15 minutes
      retry: 1,
    },
  },
});


const basePath = import.meta.env.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, '') : '';
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function AppShell({
  children,
  activeRole,
  onToggleRole,
}: {
  children: React.ReactNode;
  activeRole: string;
  onToggleRole: (r: string) => void;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#ffffff] text-black">
      <Navbar activeRole={activeRole} onToggleRole={onToggleRole} />
      <main className="flex-1">{children}</main>
      <Footer />
      <BottomNav />
    </div>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fdfbf9] via-[#f8f1ea] to-[#fbf4ee] px-4 py-12 relative overflow-hidden">
      {/* Warm Ambient Glows */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-rose-200/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-amber-200/25 blur-3xl" />

      <div className="w-full max-w-[440px] relative z-10">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-700 text-white shadow-sm transition-transform group-hover:scale-105">
              <Heart size={18} className="fill-white" />
            </div>
            <span className="font-serif-fancy text-xl font-bold tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors">
              Pentecostal <span className="font-script-fancy text-3xl font-normal text-rose-600 -ml-0.5">Matrimony</span>
            </span>
          </Link>
        </div>
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fdfbf9] via-[#f8f1ea] to-[#fbf4ee] px-4 py-12 relative overflow-hidden">
      {/* Warm Ambient Glows */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-rose-200/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full bg-amber-200/25 blur-3xl" />

      <div className="w-full max-w-[440px] relative z-10">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-700 text-white shadow-sm transition-transform group-hover:scale-105">
              <Heart size={18} className="fill-white" />
            </div>
            <span className="font-serif-fancy text-xl font-bold tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors">
              Pentecostal <span className="font-script-fancy text-3xl font-normal text-rose-600 -ml-0.5">Matrimony</span>
            </span>
          </Link>
        </div>
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function ClerkCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  useEffect(() => addListener(() => { client.clear(); }), [addListener, client]);
  return null;
}

function ProtectedMemberArea({
  children,
  activeRole,
  onToggleRole,
}: {
  children: React.ReactNode;
  activeRole: string;
  onToggleRole: (r: string) => void;
}) {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }
  return (
    <AppShell activeRole={activeRole} onToggleRole={onToggleRole}>
      {children}
    </AppShell>
  );
}

function ProtectedAdminArea({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';

  if (!isSignedIn || !isAdmin) {
    return <Redirect to="/sign-in" />;
  }

  // Completely standalone admin portal - No consumer header, footer, or bottom nav
  return <div className="min-h-screen bg-slate-900 text-slate-900">{children}</div>;
}

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-rose-600 border-t-transparent animate-spin" />
      <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Loading...</span>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [activeRole, setActiveRole] = useState<'user' | 'admin' | 'moderator'>(() => {
    return user?.publicMetadata?.role === 'admin' ? 'admin' : 'user';
  });

  useEffect(() => {
    if (user?.publicMetadata?.role === 'admin') {
      setActiveRole('admin');
    } else {
      setActiveRole('user');
    }
  }, [user]);

  const toggleRole = (newRole: string) => {
    setActiveRole(newRole as 'user' | 'admin' | 'moderator');
  };

  return (
    <ErrorBoundary resetKey={location}>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          {/* Public Landing & Auth */}
          <Route path="/" component={LandingPage} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />

          {/* Member Space - Only Registered Customers Can See Profiles */}
          <Route path="/discover">
            <AppShell activeRole={activeRole} onToggleRole={toggleRole}>
              <DiscoverPage />
            </AppShell>
          </Route>

          <Route path="/matches">
            <Redirect to="/discover" />
          </Route>

          <Route path="/search">
            <ProtectedMemberArea activeRole={activeRole} onToggleRole={toggleRole}>
              <SearchPage />
            </ProtectedMemberArea>
          </Route>

          <Route path="/profiles/:id">
            <ProtectedMemberArea activeRole={activeRole} onToggleRole={toggleRole}>
              <ProfileDetailPage />
            </ProtectedMemberArea>
          </Route>

          <Route path="/interests">
            <ProtectedMemberArea activeRole={activeRole} onToggleRole={toggleRole}>
              <InterestsPage />
            </ProtectedMemberArea>
          </Route>

          <Route path="/messages">
            <ProtectedMemberArea activeRole={activeRole} onToggleRole={toggleRole}>
              <MessagesPage />
            </ProtectedMemberArea>
          </Route>

          <Route path="/saved">
            <ProtectedMemberArea activeRole={activeRole} onToggleRole={toggleRole}>
              <MatchesPage />
            </ProtectedMemberArea>
          </Route>

          <Route path="/notifications">
            <ProtectedMemberArea activeRole={activeRole} onToggleRole={toggleRole}>
              <NotificationsPage />
            </ProtectedMemberArea>
          </Route>

          <Route path="/my-profile">
            <ProtectedMemberArea activeRole={activeRole} onToggleRole={toggleRole}>
              <MyProfilePage />
            </ProtectedMemberArea>
          </Route>

          <Route path="/settings/privacy">
            <ProtectedMemberArea activeRole={activeRole} onToggleRole={toggleRole}>
              <PrivacyPage />
            </ProtectedMemberArea>
          </Route>

          <Route path="/subscription">
            <ProtectedMemberArea activeRole={activeRole} onToggleRole={toggleRole}>
              <SubscriptionPage />
            </ProtectedMemberArea>
          </Route>

          <Route path="/admin">
            <ProtectedAdminArea>
              <AdminDashboardPage activeRole={activeRole} />
            </ProtectedAdminArea>
          </Route>

          {/* Fallback */}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </ErrorBoundary>
  );
}


function App() {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      appearance={{
        variables: {
          colorPrimary: '#000000',
          colorForeground: '#000000',
          colorBackground: '#ffffff',
          colorInput: '#ffffff',
          colorInputForeground: '#000000',
          colorNeutral: '#000000',
          fontFamily: 'Inter, sans-serif',
          borderRadius: '0px',
        },
      }}
      routerPush={(to: string) => {
        window.history.pushState({}, '', to);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }}
      routerReplace={(to: string) => {
        window.history.replaceState({}, '', to);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }}
    >
      <QueryClientProvider client={queryClient}>
        <DataSyncEffect />
        <ClerkCacheInvalidator />
        <WouterRouter base={basePath}>
          <Router />
        </WouterRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;