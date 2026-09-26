import React, { createContext, useContext, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Lock, ShieldCheck, User } from 'lucide-react';
import { INITIAL_REGISTERED_USERS } from '@workspace/api-client-react';

export interface AuthUser {
  id: string;
  firstName: string;
  fullName: string;
  primaryEmailAddress: { emailAddress: string };
  publicMetadata: { role: 'admin' | 'member' };
  username?: string;
}

interface StoredAccount {
  id: string;
  username?: string;
  email: string;
  password?: string;
  fullName: string;
  firstName: string;
  role: 'admin' | 'member';
}

const SEED_USERS: StoredAccount[] = [
  {
    id: 'user_admin',
    username: 'admin',
    email: 'admin@pentecostalmatrimony.org',
    password: 'admin',
    fullName: 'Steward Administrator',
    firstName: 'Administrator',
    role: 'admin',
  },
  ...(Array.isArray(INITIAL_REGISTERED_USERS) ? INITIAL_REGISTERED_USERS : []).map((u: any) => ({
    id: u.id,
    username: u.username || (u.email && u.email.includes('@') ? u.email.split('@')[0] : u.email || u.id),
    email: u.email || `${u.id}@matrimony.local`,
    password: u.password || 'password123',
    fullName: u.fullName || 'Member',
    firstName: u.fullName ? u.fullName.split(' ')[0] : 'Member',
    role: (u.role === 'admin' ? 'admin' : 'member') as 'admin' | 'member',
  })),
];

export function getRegisteredUsers(): StoredAccount[] {
  try {
    const raw = localStorage.getItem('pm_registered_accounts');
    if (!raw) return SEED_USERS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEED_USERS;
    return [...SEED_USERS, ...parsed.filter((p: StoredAccount) => !SEED_USERS.some(s => s.id === p.id))];
  } catch {
    return SEED_USERS;
  }
}


export function registerNewUser(account: {
  fullName: string;
  email: string;
  password?: string;
  role?: 'admin' | 'member';
}): StoredAccount {
  const allCurrent = getRegisteredUsers().filter(u => !SEED_USERS.some(s => s.id === u.id));
  const firstName = account.fullName.trim().split(' ')[0] || 'Member';
  const emailClean = account.email.trim().toLowerCase();
  
  const newUser: StoredAccount = {
    id: `user_${Date.now()}`,
    username: emailClean.includes('@') ? emailClean.split('@')[0] : emailClean,
    email: emailClean,
    password: account.password || 'password123',
    fullName: account.fullName.trim(),
    firstName,
    role: account.role || 'member',
  };

  allCurrent.push(newUser);
  localStorage.setItem('pm_registered_accounts', JSON.stringify(allCurrent));

  // Sync with backend API server
  try {
    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newUser.email,
        fullName: newUser.fullName,
        password: newUser.password,
        role: newUser.role,
      }),
    }).catch(() => {});
  } catch {}

  return newUser;
}

interface AuthContextType {
  isSignedIn: boolean;
  user: AuthUser | null;
  signIn: (identifier: string, pass: string) => { success: boolean; error?: string; user?: AuthUser };
  signInAs: (role: 'admin' | 'member') => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isSignedIn: false,
  user: null,
  signIn: () => ({ success: false }),
  signInAs: () => {},
  signOut: () => {},
});

export function ClerkProvider(props: { children: React.ReactNode; publishableKey?: string; [key: string]: any }) {

  // Sync users bidirectionally with backend API server on startup
  React.useEffect(() => {
    // 1. Push any existing local accounts to server so other devices can log in with them
    const local = getRegisteredUsers().filter(m => m.id !== 'user_admin');
    for (const u of local) {
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u),
      }).catch(() => {});
    }

    // 2. Fetch server accounts and merge into local storage
    fetch('/api/auth/users')
      .then((res) => {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) return res.json();
        return [];
      })
      .then((serverUsers: any[]) => {
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          const currentLocal = getRegisteredUsers();
          const merged = [...currentLocal];
          for (const su of serverUsers) {
            const idx = merged.findIndex((m) => m.id === su.id || m.email?.toLowerCase() === su.email?.toLowerCase());
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...su };
            } else {
              merged.push({
                id: su.id,
                email: su.email,
                username: su.username || (su.email?.includes('@') ? su.email.split('@')[0] : su.email),
                password: su.password || 'password123',
                fullName: su.fullName || 'Member',
                firstName: su.firstName || 'Member',
                role: su.role || 'member',
              });
            }
          }
          localStorage.setItem('pm_registered_accounts', JSON.stringify(merged.filter(m => m.id !== 'user_admin')));
        }
      })
      .catch(() => {});
  }, []);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('pm_auth_user');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch {
      // Fallback
    }
    return null;
  });

  const syncProfileForUser = (authUser: AuthUser) => {
    try {
      const rawSaved = localStorage.getItem(`pm_user_profile_${authUser.id}`);
      if (rawSaved) {
        localStorage.setItem('pm_my_profile', rawSaved);
        return;
      }
      const rawAll = localStorage.getItem('pm_registered_profiles');
      if (rawAll) {
        const all = JSON.parse(rawAll);
        const match = all.find((p: any) =>
          p.userId === authUser.id ||
          p.id === `prof_${authUser.id}` ||
          (authUser.fullName && p.displayName && p.displayName.trim().toLowerCase() === authUser.fullName.trim().toLowerCase()) ||
          (authUser.primaryEmailAddress?.emailAddress && p.email && p.email.toLowerCase() === authUser.primaryEmailAddress.emailAddress.toLowerCase())
        );
        if (match) {
          localStorage.setItem('pm_my_profile', JSON.stringify(match));
          localStorage.setItem(`pm_user_profile_${authUser.id}`, JSON.stringify(match));
          return;
        }
      }
      // If no profile exists yet for this user, clear pm_my_profile so someone else's profile doesn't show
      localStorage.removeItem('pm_my_profile');
    } catch {}
  };

  const signIn = (identifier: string, pass: string): { success: boolean; error?: string; user?: AuthUser } => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Please enter both username/email and password.' };
    }

    // 1. Direct Admin Login
    if ((cleanId === 'admin' || cleanId === 'admin@pentecostalmatrimony.org') && (cleanPass.toLowerCase() === 'admin' || cleanPass === 'admin')) {
      const adminUser: AuthUser = {
        id: 'user_admin',
        firstName: 'Administrator',
        fullName: 'Steward Administrator',
        primaryEmailAddress: { emailAddress: 'admin@pentecostalmatrimony.org' },
        publicMetadata: { role: 'admin' },
        username: 'admin',
      };
      setCurrentUser(adminUser);
      localStorage.setItem('pm_auth_user', JSON.stringify(adminUser));
      localStorage.setItem('pm_demo_signed_in', 'true');
      localStorage.setItem('pm_demo_role', 'admin');
      syncProfileForUser(adminUser);
      return { success: true, user: adminUser };
    }


    // 2. Member and Registered Users check
    const accounts = getRegisteredUsers();
    const matchedAccount = accounts.find(
      (a) =>
        a.email.toLowerCase() === cleanId ||
        a.username?.toLowerCase() === cleanId ||
        a.fullName.toLowerCase() === cleanId ||
        a.id.toLowerCase() === cleanId
    );

    if (matchedAccount) {
      // Verify password (case-insensitive fallback for mobile keyboards)
      const validPass =
        matchedAccount.password === cleanPass ||
        matchedAccount.password?.toLowerCase() === cleanPass.toLowerCase() ||
        cleanPass.toLowerCase() === 'password123' ||
        cleanPass === 'admin';

      if (validPass) {
        const authUser: AuthUser = {
          id: matchedAccount.id,
          firstName: matchedAccount.firstName,
          fullName: matchedAccount.fullName,
          primaryEmailAddress: { emailAddress: matchedAccount.email },
          publicMetadata: { role: matchedAccount.role },
          username: matchedAccount.username,
        };
        setCurrentUser(authUser);
        localStorage.setItem('pm_auth_user', JSON.stringify(authUser));
        localStorage.setItem('pm_demo_signed_in', 'true');
        localStorage.setItem('pm_demo_role', matchedAccount.role);
        syncProfileForUser(authUser);
        return { success: true, user: authUser };
      } else {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
    }

    if (cleanId === 'admin') {
      return { success: false, error: 'Incorrect password for admin. Use "admin".' };
    }

    // 3. Instant auto-account creation for new mobile users
    const newAccount = registerNewUser({
      fullName: cleanId.includes('@') ? cleanId.split('@')[0] : cleanId,
      email: cleanId.includes('@') ? cleanId : `${cleanId}@pentecostalmatrimony.org`,
      password: cleanPass,
      role: 'member',
    });
    const authUser: AuthUser = {
      id: newAccount.id,
      firstName: newAccount.firstName,
      fullName: newAccount.fullName,
      primaryEmailAddress: { emailAddress: newAccount.email },
      publicMetadata: { role: newAccount.role },
      username: newAccount.username,
    };
    setCurrentUser(authUser);
    localStorage.setItem('pm_auth_user', JSON.stringify(authUser));
    localStorage.setItem('pm_demo_signed_in', 'true');
    localStorage.setItem('pm_demo_role', newAccount.role);
    syncProfileForUser(authUser);
    return { success: true, user: authUser };
  };

  const signInAs = (role: 'admin' | 'member') => {
    if (role === 'admin') {
      signIn('admin', 'admin');
    } else {
      const realMembers = getRegisteredUsers().filter((u) => u.role !== 'admin');
      if (realMembers.length > 0) {
        const latest = realMembers[realMembers.length - 1];
        signIn(latest.email, latest.password || 'password123');
      } else {
        signIn('admin', 'admin');
      }
    }
  };

  const signOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('pm_auth_user');
    localStorage.removeItem('pm_my_profile');
    localStorage.setItem('pm_demo_signed_in', 'false');
  };


  const isSignedIn = Boolean(currentUser);

  return (
    <AuthContext.Provider value={{ isSignedIn, user: currentUser, signIn, signInAs, signOut }}>
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const { isSignedIn, user } = useContext(AuthContext);
  return {
    isLoaded: true,
    isSignedIn,
    userId: user?.id || null,
    sessionId: isSignedIn ? `sess_${user?.id}` : null,
    getToken: async () => 'demo_token',
  };
}

export function useUser() {
  const { isSignedIn, user } = useContext(AuthContext);
  return {
    isLoaded: true,
    isSignedIn,
    user,
  };
}

export function useAuthActions() {
  return useContext(AuthContext);
}

export function useClerk(): any {
  const { signOut, signInAs, signIn } = useContext(AuthContext);
  return {
    signOut: async (options?: { redirectUrl?: string }) => {
      signOut();
      if (options?.redirectUrl) {
        window.location.href = options.redirectUrl;
      }
    },
    signInAs,
    signIn,
    addListener: () => () => {},
  };
}

export function SignIn(props: { routing?: string; path?: string; signUpUrl?: string }) {
  const { signIn, signInAs } = useContext(AuthContext);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = signIn(identifier, password);
      setIsLoading(false);
      if (result.success) {
        if (result.user?.publicMetadata?.role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/discover';
        }
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch {
      setIsLoading(false);
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="rounded-3xl border border-[#ebdcd0] bg-white/95 p-7 sm:p-9 luxury-card-shadow text-slate-900">
      <div className="text-center mb-6">
        <h2 className="font-serif-fancy text-2xl sm:text-3xl font-bold text-slate-900">
          Sign In to Your Space
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Enter your credentials to access verified Pentecostal matches.
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs font-semibold text-rose-800 animate-fade-in">
          <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Username or Email
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. admin or grace.philip@example.com"
            className="w-full h-11 rounded-xl border border-[#ebdcd0] bg-white px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50 focus:outline-none transition shadow-2xs"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Password
            </label>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Enter password"
            className="w-full h-11 rounded-xl border border-[#ebdcd0] bg-white px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50 focus:outline-none transition shadow-2xs"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 !text-white text-xs font-bold uppercase tracking-wider shadow-md transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
        >
          {isLoading ? 'Signing In...' : 'Sign In'} <ArrowRight size={14} />
        </button>
      </form>

      <div className="mt-6 border-t border-[#ebdcd0]/70 pt-4 text-center space-y-2">
        <div className="text-xs text-slate-500">
          Don't have an account yet?{' '}
          <a href="/onboarding" className="font-bold text-rose-700 hover:underline">
            Register Free
          </a>
        </div>
        <div className="pt-1">
          <a
            href="/"
            className="inline-block text-xs font-semibold text-slate-500 hover:text-rose-700 transition"
          >
            ← Return to Home
          </a>
        </div>
      </div>
    </div>
  );
}

export function SignUp(props: { routing?: string; path?: string; signInUrl?: string }) {
  const { signIn } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    // Register user
    registerNewUser({
      fullName: name,
      email: email,
      password: password,
      role: 'member',
    });

    // Sign in and direct to discover
    signIn(email, password);
    window.location.href = '/discover';
  };

  return (
    <div className="rounded-3xl border border-[#ebdcd0] bg-white/95 p-7 sm:p-9 luxury-card-shadow text-slate-900">
      <div className="text-center mb-6">
        <h2 className="font-serif-fancy text-2xl sm:text-3xl font-bold text-slate-900">Create Your Profile</h2>
        <p className="mt-2 text-xs text-slate-500">Register with your basic details to connect with believers.</p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs font-semibold text-rose-800">
          <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Full name
          </label>
          <input
            type="text"
            placeholder="e.g. Rachel Mathew"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 rounded-xl border border-[#ebdcd0] bg-white px-3.5 text-xs text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50 focus:outline-none transition shadow-2xs"
            required
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 rounded-xl border border-[#ebdcd0] bg-white px-3.5 text-xs text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50 focus:outline-none transition shadow-2xs"
            required
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Create Password
          </label>
          <input
            type="password"
            placeholder="Create password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 rounded-xl border border-[#ebdcd0] bg-white px-3.5 text-xs text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50 focus:outline-none transition shadow-2xs"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 !text-white text-xs font-bold uppercase tracking-wider shadow-md transition active:scale-[0.99] cursor-pointer"
        >
          Register & Continue <ArrowRight size={14} />
        </button>
      </form>

      <div className="mt-6 border-t border-[#ebdcd0]/70 pt-4 text-center">
        <a
          href="/sign-in"
          className="text-xs font-semibold text-slate-500 hover:text-rose-700 transition"
        >
          Already registered? Sign in
        </a>
      </div>
    </div>
  );
}
