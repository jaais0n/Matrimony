import React, { createContext, useContext, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Lock, ShieldCheck, User, Phone } from 'lucide-react';
import { INITIAL_REGISTERED_USERS, setAuthTokenGetter } from '@workspace/api-client-react';
import { checkEmailExists, checkPhoneExists, generateUniqueUserId, normalizeEmail, isPhoneMatch } from './utils/userValidation';

// Configure bearer token provider for automatic authentication on all API calls
setAuthTokenGetter(() => {
  try {
    const raw = localStorage.getItem('pm_auth_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u.id || u.email || null;
    }
  } catch {}
  return null;
});

export interface AuthUser {
  id: string;
  firstName: string;
  fullName: string;
  primaryEmailAddress: { emailAddress: string };
  publicMetadata: { role: 'admin' | 'member' };
  username?: string;
  imageUrl?: string;
}

interface StoredAccount {
  id: string;
  username?: string;
  email: string;
  phone?: string;
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
    phone: '+91 98765 00000',
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

export async function fetchLiveDatabaseUsers(): Promise<StoredAccount[]> {
  try {
    const res = await fetch(`/api/auth/users?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((u: any) => ({
      id: u.id,
      username: u.username || (u.email && u.email.includes('@') ? u.email.split('@')[0] : u.email || u.id),
      email: u.email || `${u.id}@matrimony.local`,
      phone: u.phone,
      password: u.password || 'password123',
      fullName: u.fullName || 'Member',
      firstName: u.firstName || (u.fullName ? u.fullName.split(' ')[0] : 'Member'),
      role: (u.role === 'admin' ? 'admin' : 'member') as 'admin' | 'member',
    }));
  } catch (err) {
    console.warn('Failed to fetch live database users:', err);
    return [];
  }
}

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

export async function registerNewUser(account: {
  fullName: string;
  email: string;
  phone?: string;
  password?: string;
  role?: 'admin' | 'member';
}): Promise<StoredAccount> {
  const emailClean = normalizeEmail(account.email);
  if (!emailClean) {
    throw new Error('Please enter a valid email address.');
  }

  // Enforce unique email: Multiple accounts with the same Gmail/email are strictly not allowed
  if (checkEmailExists(emailClean)) {
    throw new Error(`An account with the email "${emailClean}" already exists. Multiple accounts with the same email are not allowed.`);
  }

  // Enforce unique phone: Multiple accounts with the same phone number are strictly not allowed
  const phoneClean = account.phone ? account.phone.trim() : '';
  if (phoneClean && checkPhoneExists(phoneClean)) {
    throw new Error(`The phone number "${phoneClean}" is already registered to another account. Multiple accounts with the same phone number are not allowed.`);
  }

  const allCurrent = getRegisteredUsers().filter(u => !SEED_USERS.some(s => s.id === u.id));
  const firstName = account.fullName.trim().split(' ')[0] || 'Member';
  const username = emailClean.includes('@') ? emailClean.split('@')[0] : emailClean;

  // Generate completely separate, unique user ID for this user
  const uniqueId = generateUniqueUserId(emailClean, account.fullName);

  const newUser: StoredAccount = {
    id: uniqueId,
    username,
    email: emailClean,
    phone: phoneClean || undefined,
    password: account.password || 'password123',
    fullName: account.fullName.trim(),
    firstName,
    role: account.role || 'member',
  };

  // 1. Sync with backend API server and persist in Neon DB
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        fullName: newUser.fullName,
        password: newUser.password,
        role: newUser.role,
        isNewRegistration: true,
      }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      if (errJson?.error) {
        throw new Error(errJson.error);
      }
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('already exists') || err.message.includes('already registered'))) {
      throw err;
    }
  }

  allCurrent.push(newUser);
  localStorage.setItem('pm_registered_accounts', JSON.stringify(allCurrent));

  return newUser;
}

interface AuthContextType {
  isSignedIn: boolean;
  user: AuthUser | null;
  isDbVerified: boolean;
  isCheckingDb: boolean;
  signIn: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  signInAs: (role: 'admin' | 'member') => Promise<void>;
  signOut: () => void;
  verifyCurrentSessionWithDb: (targetUser?: AuthUser | null) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  isSignedIn: false,
  user: null,
  isDbVerified: false,
  isCheckingDb: false,
  signIn: async () => ({ success: false }),
  signInAs: async () => {},
  signOut: () => {},
  verifyCurrentSessionWithDb: async () => false,
});

export function ClerkProvider(props: { children: React.ReactNode; publishableKey?: string; [key: string]: any }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('pm_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        return parsed;
      }
    } catch {}
    return null;
  });

  const [isCheckingDb, setIsCheckingDb] = useState<boolean>(() => {
    try {
      const savedUser = localStorage.getItem('pm_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.id !== 'user_admin' && parsed?.publicMetadata?.role !== 'admin') {
          return true;
        }
      }
    } catch {}
    return false;
  });

  const [isDbVerified, setIsDbVerified] = useState<boolean>(() => {
    try {
      const savedUser = localStorage.getItem('pm_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.id === 'user_admin' || parsed?.publicMetadata?.role === 'admin') {
          return true;
        }
        return false;
      }
      return true; // Unauthenticated guest
    } catch {}
    return false;
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
      localStorage.removeItem('pm_my_profile');
    } catch {}
  };

  const signOut = React.useCallback(() => {
    setCurrentUser(null);
    setIsDbVerified(false);
    setIsCheckingDb(false);
    localStorage.removeItem('pm_auth_user');
    localStorage.removeItem('pm_my_profile');
    localStorage.removeItem('pm_active_conv_id');
    localStorage.setItem('pm_demo_signed_in', 'false');
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith('pm_user_profile_') ||
            k.startsWith('pm_active_conv_') ||
            k.startsWith('pm_user_conversations_'))
        ) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
    window.dispatchEvent(new CustomEvent('pm:sync'));
  }, []);

  // Strict session verification against live Neon DB
  const verifyCurrentSessionWithDb = React.useCallback(async (target?: AuthUser | null): Promise<boolean> => {
    const userToVerify = target !== undefined ? target : currentUser;
    if (!userToVerify) {
      setIsCheckingDb(false);
      setIsDbVerified(true);
      return true;
    }

    if (userToVerify.id === 'user_admin' || userToVerify.publicMetadata?.role === 'admin') {
      setIsDbVerified(true);
      setIsCheckingDb(false);
      return true;
    }

    setIsCheckingDb(true);
    try {
      const liveUsers = await fetchLiveDatabaseUsers();
      const userEmail = userToVerify.primaryEmailAddress?.emailAddress?.toLowerCase();
      const existsInDb = liveUsers.some((su) => {
        if (su.id === userToVerify.id) return true;
        if (userEmail && su.email && su.email.toLowerCase() === userEmail) return true;
        return false;
      });

      if (existsInDb) {
        setIsDbVerified(true);
        setIsCheckingDb(false);
        return true;
      } else {
        // Account does NOT exist in the database! Purge session immediately
        localStorage.removeItem('pm_auth_user');
        localStorage.removeItem('pm_demo_signed_in');
        localStorage.removeItem('pm_demo_role');
        localStorage.removeItem('pm_my_profile');
        sessionStorage.setItem('pm_auth_error', 'Your account was not found in the database. Portal entry is not allowed.');
        setCurrentUser(null);
        setIsDbVerified(false);
        setIsCheckingDb(false);
        window.dispatchEvent(new CustomEvent('pm:sync'));
        return false;
      }
    } catch (err) {
      console.warn('Database verification check failed:', err);
      setIsDbVerified(false);
      setIsCheckingDb(false);
      return false;
    }
  }, [currentUser]);

  // Run DB verification on startup, focus, and sync
  React.useEffect(() => {
    verifyCurrentSessionWithDb();

    const onSync = () => {
      verifyCurrentSessionWithDb();
    };

    const onFocus = () => {
      verifyCurrentSessionWithDb();
    };

    window.addEventListener('pm:sync', onSync);
    window.addEventListener('focus', onFocus);

    // Heartbeat check every 30 seconds
    const interval = setInterval(() => {
      const savedUser = localStorage.getItem('pm_auth_user');
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          if (u?.id !== 'user_admin' && u?.publicMetadata?.role !== 'admin') {
            verifyCurrentSessionWithDb(u);
          }
        } catch {}
      }
    }, 30000);

    return () => {
      window.removeEventListener('pm:sync', onSync);
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [verifyCurrentSessionWithDb]);

  const signIn = async (
    identifier: string,
    pass: string
  ): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Please enter both username/email and password.' };
    }

    // 1. Direct Admin Login
    if (
      (cleanId === 'admin' || cleanId === 'admin@pentecostalmatrimony.org') &&
      (cleanPass.toLowerCase() === 'admin' || cleanPass === 'admin')
    ) {
      const adminUser: AuthUser = {
        id: 'user_admin',
        firstName: 'Administrator',
        fullName: 'Steward Administrator',
        primaryEmailAddress: { emailAddress: 'admin@pentecostalmatrimony.org' },
        publicMetadata: { role: 'admin' },
        username: 'admin',
      };
      setCurrentUser(adminUser);
      setIsDbVerified(true);
      setIsCheckingDb(false);
      localStorage.setItem('pm_auth_user', JSON.stringify(adminUser));
      localStorage.setItem('pm_demo_signed_in', 'true');
      localStorage.setItem('pm_demo_role', 'admin');
      syncProfileForUser(adminUser);
      return { success: true, user: adminUser };
    }

    if (cleanId === 'admin') {
      return { success: false, error: 'Incorrect password for admin. Use "admin".' };
    }

    // 2. Query Live Database Users: User MUST exist in the database!
    setIsCheckingDb(true);
    let liveDbUsers = await fetchLiveDatabaseUsers();

    const matchedAccount = liveDbUsers.find(
      (a) =>
        a.email.toLowerCase() === cleanId ||
        a.username?.toLowerCase() === cleanId ||
        a.fullName.toLowerCase() === cleanId ||
        a.id.toLowerCase() === cleanId ||
        (a.phone && isPhoneMatch(a.phone, cleanId))
    );

    // If NOT found in database: STRICTLY DENY ENTRY!
    if (!matchedAccount) {
      setIsCheckingDb(false);
      setIsDbVerified(false);
      try {
        const localAccounts = getRegisteredUsers().filter(
          (u) =>
            u.email.toLowerCase() !== cleanId &&
            u.id.toLowerCase() !== cleanId &&
            (!u.phone || !isPhoneMatch(u.phone, cleanId))
        );
        localStorage.setItem('pm_registered_accounts', JSON.stringify(localAccounts));
      } catch {}

      return {
        success: false,
        error: 'Account not found in database. This user is not registered or has been deleted from the database. Portal entry is not allowed.',
      };
    }

    // Verify password
    const validPass =
      matchedAccount.password === cleanPass ||
      matchedAccount.password?.toLowerCase() === cleanPass.toLowerCase() ||
      (matchedAccount.role === 'admin' && (cleanPass === 'admin' || cleanPass.toLowerCase() === 'admin'));

    if (!validPass) {
      setIsCheckingDb(false);
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    const authUser: AuthUser = {
      id: matchedAccount.id,
      firstName: matchedAccount.firstName,
      fullName: matchedAccount.fullName,
      primaryEmailAddress: { emailAddress: matchedAccount.email },
      publicMetadata: { role: matchedAccount.role },
      username: matchedAccount.username,
    };

    setCurrentUser(authUser);
    setIsDbVerified(true);
    setIsCheckingDb(false);
    localStorage.setItem('pm_auth_user', JSON.stringify(authUser));
    localStorage.setItem('pm_demo_signed_in', 'true');
    localStorage.setItem('pm_demo_role', matchedAccount.role);
    syncProfileForUser(authUser);

    // Keep local accounts in sync
    try {
      const current = getRegisteredUsers().filter((u) => u.id !== authUser.id);
      current.push(matchedAccount);
      localStorage.setItem('pm_registered_accounts', JSON.stringify(current));
    } catch {}

    // Pull profile in background
    fetch(`/api/profiles/me?userId=${encodeURIComponent(authUser.id)}`)
      .then((r) => r.json())
      .then((myProfile) => {
        if (myProfile && !myProfile.notFound && (myProfile.displayName || myProfile.location || myProfile.photos?.length)) {
          localStorage.setItem('pm_my_profile', JSON.stringify(myProfile));
          localStorage.setItem(`pm_user_profile_${authUser.id}`, JSON.stringify(myProfile));
          window.dispatchEvent(new CustomEvent('pm:sync'));
        }
      })
      .catch(() => {});

    return { success: true, user: authUser };
  };

  const signInAs = async (role: 'admin' | 'member') => {
    if (role === 'admin') {
      await signIn('admin', 'admin');
    } else {
      const liveUsers = await fetchLiveDatabaseUsers();
      const realMembers = liveUsers.filter((u) => u.role !== 'admin');
      if (realMembers.length > 0) {
        const latest = realMembers[realMembers.length - 1];
        await signIn(latest.email, latest.password || 'password123');
      } else {
        await signIn('admin', 'admin');
      }
    }
  };

  const isSignedIn = Boolean(currentUser);

  return (
    <AuthContext.Provider
      value={{
        isSignedIn,
        user: currentUser,
        isDbVerified,
        isCheckingDb,
        signIn,
        signInAs,
        signOut,
        verifyCurrentSessionWithDb,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const { isSignedIn, user, isDbVerified, isCheckingDb, signOut } = useContext(AuthContext);
  return {
    isLoaded: !isCheckingDb,
    isSignedIn,
    isDbVerified,
    isCheckingDb,
    user,
    userId: user?.id || null,
    sessionId: isSignedIn ? `sess_${user?.id}` : null,
    getToken: async () => 'demo_token',
    signOut,
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
  const { signIn } = useContext(AuthContext);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('error') === 'not_in_db') {
        return 'Access Denied: Your account does not exist in the database. Please register a new account to enter the portal.';
      }
      const savedError = sessionStorage.getItem('pm_auth_error');
      if (savedError) {
        sessionStorage.removeItem('pm_auth_error');
        return savedError;
      }
    } catch {}
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn(identifier, password);
      if (result.success) {
        if (result.user?.publicMetadata?.role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/discover';
        }
      } else {
        setIsLoading(false);
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Login failed. Please check your credentials.');
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
          className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 !text-white text-xs font-bold uppercase tracking-wider shadow-md transition active:scale-[0.99] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin text-rose-200" size={16} />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <span>Sign In</span> <ArrowRight size={14} />
            </>
          )}
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
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = normalizeEmail(email);
    const cleanPhone = phone.trim();
    const cleanPass = password.trim();

    if (!cleanName || !cleanEmail || !cleanPass) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    // Check unique email constraint
    if (checkEmailExists(cleanEmail)) {
      setError(`An account with the email "${cleanEmail}" already exists. Multiple accounts with the same Gmail/email are not allowed.`);
      return;
    }

    // Check unique phone constraint
    if (cleanPhone) {
      if (cleanPhone.replace(/\D/g, '').length < 10) {
        setError('Please enter a valid 10-digit phone number.');
        return;
      }
      if (checkPhoneExists(cleanPhone)) {
        setError(`The phone number "${cleanPhone}" is already registered to another account. Multiple accounts with the same phone number are not allowed.`);
        return;
      }
    }

    if (cleanPass.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);

    try {
      await registerNewUser({
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone || undefined,
        password: cleanPass,
        role: 'member',
      });

      const signResult = await signIn(cleanEmail, cleanPass);
      if (signResult.success) {
        window.location.href = '/discover';
      } else {
        setIsLoading(false);
        setError(signResult.error || 'Authentication error after registration.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Registration failed. Please try again.');
    }
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
            Phone number
          </label>
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full h-11 rounded-xl border border-[#ebdcd0] bg-white px-3.5 text-xs text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200/50 focus:outline-none transition shadow-2xs"
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
          disabled={isLoading}
          className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 !text-white text-xs font-bold uppercase tracking-wider shadow-md transition active:scale-[0.99] cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin text-rose-200" size={16} />
              <span>Registering...</span>
            </>
          ) : (
            <>
              <span>Register & Continue</span> <ArrowRight size={14} />
            </>
          )}
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
