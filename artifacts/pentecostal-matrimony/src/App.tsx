import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { Heart } from 'lucide-react';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from './auth';

import { Navbar } from './components/ui/Navbar';
import { BottomNav } from './components/ui/BottomNav';
import { Footer } from './components/ui/Footer';

import { LandingPage } from './pages/LandingPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { MatchesPage } from './pages/MatchesPage';
import { SearchPage } from './pages/SearchPage';
import { ProfileDetailPage } from './pages/ProfileDetailPage';
import { InterestsPage } from './pages/InterestsPage';
import { MessagesPage } from './pages/MessagesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import NotFound from './pages/not-found';
import { ErrorBoundary } from './components/error-boundary';

import { safeSetLocalStorage } from './utils/storageHelper';
import { isSeedProfile, INITIAL_REGISTERED_PROFILES } from '@workspace/api-client-react';

import './index.css';

// One-time clean startup wipe for fresh testing across all devices
export function purgeLocalSeedProfiles() {
  try {
    const FRESH_KEY = 'pm_fresh_startup_v2';
    if (!localStorage.getItem(FRESH_KEY)) {
      localStorage.removeItem('pm_registered_profiles');
      localStorage.removeItem('pm_my_profile');
      // Remove any leftover profile caches
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('pm_user_profile_') || k.startsWith('pm_profile_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('pm_registered_profiles', '[]');
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

  useEffect(() => {
    const syncData = async () => {
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

        // 2. Push real local profiles to server (so other devices can see them)
        const payload = localProfiles.filter((p) => !isSeedProfile(p));
        if (payload.length > 0) {
          try {
            await fetch('/api/profiles/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          } catch (syncErr) {
            console.warn('Sync push error (non-fatal):', syncErr);
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
              // Merge: server wins for existing IDs, add new ones from server
              const existingRaw = localStorage.getItem('pm_registered_profiles');
              const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
              const merged = existing.filter((p) => !isSeedProfile(p));
              for (const sp of serverProfiles) {
                const idx = merged.findIndex((m) => m.id === sp.id || m.userId === sp.userId);
                if (idx >= 0) {
                  // Keep server version if it's newer
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
                    // Check if current pm_my_profile belongs to a different user, and remove it
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

        // 4. Also lively sync user accounts from server
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

    syncData();
    // Lively update: re-sync every 8 seconds and on window focus
    const interval = setInterval(syncData, 8000);
    window.addEventListener('focus', syncData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncData);
    };
  }, [queryClient]);


  return null;
}


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
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
          <ProtectedMemberArea activeRole={activeRole} onToggleRole={toggleRole}>
            <MatchesPage />
          </ProtectedMemberArea>
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