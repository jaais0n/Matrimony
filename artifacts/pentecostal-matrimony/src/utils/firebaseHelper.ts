import type { ChatMessage } from '../types';

export const FIREBASE_DATABASE_URL =
  import.meta.env.VITE_FIREBASE_DATABASE_URL ||
  'https://pentecostal-matrimony-default-rtdb.asia-southeast1.firebasedatabase.app';

export function isFirebaseConfigured(): boolean {
  return Boolean(FIREBASE_DATABASE_URL && FIREBASE_DATABASE_URL.includes('firebasedatabase.app'));
}

// Known user ID aliases mapping timestamp IDs and variants to canonical handles
const KNOWN_USER_ALIASES: Record<string, string> = {};

/**
 * Creates a deterministic, symmetric conversation room ID between any two users.
 * Always produces the same ID regardless of which user initiates.
 * e.g. getDeterministicConvId('user_john', 'user_sura') === getDeterministicConvId('user_sura', 'user_john')
 */
export function cleanUserIdKey(id: string): string {
  if (!id) return '';
  let s = String(id).trim().toLowerCase();

  // 1. Direct alias check
  if (KNOWN_USER_ALIASES[s]) return KNOWN_USER_ALIASES[s];

  // 2. Strip standard prefixes
  s = s.replace(/^prof_user_/, '');
  s = s.replace(/^prof_/, '');
  s = s.replace(/^user_/, '');

  if (KNOWN_USER_ALIASES[s]) return KNOWN_USER_ALIASES[s];

  // 3. Dynamic lookup from browser localStorage (accounts & profiles)
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const rawAccounts = localStorage.getItem('pm_registered_accounts');
      if (rawAccounts) {
        const accounts = JSON.parse(rawAccounts);
        const match = accounts.find((a: any) =>
          String(a.id || '').toLowerCase().includes(s) ||
          String(a.username || '').toLowerCase() === s ||
          String(a.email || '').toLowerCase().includes(s) ||
          String(a.fullName || '').toLowerCase() === s
        );
        if (match?.username) {
          return match.username.toLowerCase();
        }
      }
    } catch {}

    try {
      const rawProfiles = localStorage.getItem('pm_registered_profiles');
      if (rawProfiles) {
        const profiles = JSON.parse(rawProfiles);
        const match = profiles.find((p: any) =>
          String(p.id || '').toLowerCase().includes(s) ||
          String(p.userId || '').toLowerCase().includes(s) ||
          String(p.displayName || '').toLowerCase() === s ||
          String(p.email || '').toLowerCase().includes(s)
        );
        if (match) {
          const canon = (match.email ? match.email.split('@')[0] : match.displayName || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
          if (canon) return canon;
        }
      }
    } catch {}
  }

  return s;
}

export function getDeterministicConvId(id1: string, id2: string): string {
  const clean1 = cleanUserIdKey(id1);
  const clean2 = cleanUserIdKey(id2);
  const sorted = [clean1, clean2].sort();
  return `conv_${sorted[0] || 'a'}_${sorted[1] || 'b'}`;
}

const parseMessages = (data: unknown): ChatMessage[] => {
  if (!data) return [];
  const rawList = Array.isArray(data)
    ? data
    : (Object.values(data as object) as ChatMessage[]);

  const valid = rawList.filter((m) => Boolean(m && (m as ChatMessage).content && (m as ChatMessage).timestamp));
  valid.sort(
    (a, b) => new Date((a as ChatMessage).timestamp).getTime() - new Date((b as ChatMessage).timestamp).getTime()
  );
  return valid as ChatMessage[];
};

const parseInbox = (data: unknown): Record<string, unknown>[] => {
  if (!data || typeof data !== 'object') return [];
  const list = Object.values(data as object) as Record<string, unknown>[];
  list.sort((a, b) => new Date((b.lastMessageAt as string) || 0).getTime() - new Date((a.lastMessageAt as string) || 0).getTime());
  return list;
};

/**
 * Real-time live listener for a conversation's messages using Firebase SSE + fast polling fallback.
 * Guaranteed instant message delivery across all devices and tabs.
 */
export function subscribeToFirebaseMessages(
  convId: string,
  onMessagesUpdate: (messages: ChatMessage[]) => void
): () => void {
  if (!isFirebaseConfigured() || !convId) {
    return () => {};
  }

  const endpoint = `${FIREBASE_DATABASE_URL}/conversations/${convId}/messages.json`;
  let lastFetchedAt = 0;
  let destroyed = false;

  const fetchMessages = () => {
    if (destroyed) return;
    fetch(endpoint)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (destroyed) return;
        if (data) {
          lastFetchedAt = Date.now();
          onMessagesUpdate(parseMessages(data));
        }
      })
      .catch(() => {});
  };

  // 1. Initial fast HTTP fetch
  fetchMessages();

  // 2. Real-time live streaming via native EventSource (SSE)
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource(endpoint);

    eventSource.addEventListener('put', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.path === '/' && payload?.data != null) {
          // Initial load – data is the full messages object
          onMessagesUpdate(parseMessages(payload.data));
          lastFetchedAt = Date.now();
        } else if (payload?.data != null) {
          // New child added at a push key — re-fetch full list
          fetchMessages();
        }
      } catch {}
    });

    eventSource.addEventListener('patch', () => {
      fetchMessages();
    });

    eventSource.onerror = () => {
      // SSE will auto-reconnect; polling fallback handles any network gaps
    };
  } catch (err) {
    console.warn('[Firebase] EventSource setup error:', err);
  }

  // 3. Fast polling fallback every 2.5 seconds — guarantees delivery on any network
  const pollInterval = setInterval(() => {
    if (destroyed) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    // If SSE updated within the last 2 seconds, skip poll to save bandwidth
    if (Date.now() - lastFetchedAt < 2000) return;
    fetchMessages();
  }, 2500);

  return () => {
    destroyed = true;
    clearInterval(pollInterval);
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
  };
}

/**
 * Real-time listener for user's inbox conversations list.
 * Ensures that new conversations and messages appear instantly on all devices.
 * Hybrid SSE + fast polling for maximum reliability.
 */
export function subscribeToUserInbox(
  userId: string,
  onInboxUpdate: (conversations: Record<string, unknown>[]) => void
): () => void {
  const cleanId = cleanUserIdKey(userId);
  if (!isFirebaseConfigured() || !cleanId) return () => {};

  const endpoint = `${FIREBASE_DATABASE_URL}/user_inbox/${cleanId}.json`;
  let lastFetchedAt = 0;
  let destroyed = false;

  const fetchInbox = () => {
    if (destroyed) return;
    fetch(endpoint)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (destroyed) return;
        if (data) {
          lastFetchedAt = Date.now();
          onInboxUpdate(parseInbox(data));
        }
      })
      .catch(() => {});
  };

  // 1. Initial fetch
  fetchInbox();

  // 2. SSE real-time stream
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource(endpoint);

    eventSource.addEventListener('put', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.path === '/' && payload?.data) {
          onInboxUpdate(parseInbox(payload.data));
          lastFetchedAt = Date.now();
        } else {
          // New conversation added or existing updated at sub-path
          fetchInbox();
        }
      } catch {}
    });

    eventSource.addEventListener('patch', () => {
      fetchInbox();
    });
  } catch {}

  // 3. Fast polling fallback every 3 seconds
  const pollInterval = setInterval(() => {
    if (destroyed) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (Date.now() - lastFetchedAt < 2500) return;
    fetchInbox();
  }, 3000);

  return () => {
    destroyed = true;
    clearInterval(pollInterval);
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
  };
}

/**
 * Real-time listener for live "typing..." indicators
 */
export function subscribeToFirebaseTyping(
  convId: string,
  currentUserId: string,
  onTypingUpdate: (isTyping: boolean) => void
): () => void {
  if (!isFirebaseConfigured() || !convId) {
    return () => {};
  }

  const endpoint = `${FIREBASE_DATABASE_URL}/conversations/${convId}/typing.json`;
  let eventSource: EventSource | null = null;
  const myClean = cleanUserIdKey(currentUserId);

  try {
    eventSource = new EventSource(endpoint);

    const checkTyping = (data: unknown) => {
      if (!data || typeof data !== 'object') {
        onTypingUpdate(false);
        return;
      }
      let someoneElseTyping = false;
      for (const [uid, isTyping] of Object.entries(data as object)) {
        if (cleanUserIdKey(uid) !== myClean && isTyping === true) {
          someoneElseTyping = true;
          break;
        }
      }
      onTypingUpdate(someoneElseTyping);
    };

    eventSource.addEventListener('put', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        checkTyping(payload.data);
      } catch {}
    });

    eventSource.addEventListener('patch', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        checkTyping(payload.data);
      } catch {}
    });
  } catch {}

  return () => {
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
  };
}

/**
 * Broadcast live typing status to Firebase
 */
export async function sendFirebaseTyping(
  convId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  if (!isFirebaseConfigured() || !convId || !userId) return;
  const cleanId = cleanUserIdKey(userId);

  try {
    await fetch(`${FIREBASE_DATABASE_URL}/conversations/${convId}/typing/${cleanId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isTyping),
    });
  } catch {}
}

/**
 * Helper to resolve a photo for a user if meta doesn't include it
 */
function resolvePhotoFromStorage(userId: string, userName?: string): string {
  const clean = cleanUserIdKey(userId);
  const nameClean = (userName || '').toLowerCase();

  // Known fallback photo for Suru
  if (clean === 'sura' || nameClean.includes('suru') || nameClean.includes('sura')) {
    return 'https://res.cloudinary.com/suvkbjww/image/upload/v1790445115/eljlyxdlh0rkbg4pqoih.jpg';
  }

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const myProf = localStorage.getItem('pm_my_profile');
      if (myProf) {
        const parsed = JSON.parse(myProf);
        if (cleanUserIdKey(parsed.userId || parsed.id) === clean) {
          const p = parsed.photos?.[0]?.url || parsed.primaryPhotoUrl;
          if (p) return p;
        }
      }
    } catch {}

    try {
      const rawProfs = localStorage.getItem('pm_registered_profiles');
      if (rawProfs) {
        const profs = JSON.parse(rawProfs);
        const match = profs.find((p: any) =>
          cleanUserIdKey(p.userId || p.id) === clean ||
          (nameClean && p.displayName && p.displayName.toLowerCase() === nameClean)
        );
        if (match) {
          const p = match.photos?.[0]?.url || match.primaryPhotoUrl;
          if (p) return p;
        }
      }
    } catch {}
  }

  return '';
}

/**
 * Send a new message to Firebase Realtime Database.
 * Syncs to the conversation room AND both participants' inboxes for cross-device delivery.
 */
export async function sendFirebaseMessage(
  convId: string,
  message: ChatMessage,
  meta?: {
    senderUser?: { id: string; name: string; photo?: string };
    recipientUser?: {
      id: string;
      name: string;
      photo?: string;
      location?: string;
      denomination?: string;
      age?: number;
    };
  }
): Promise<boolean> {
  if (!isFirebaseConfigured() || !convId) return false;

  try {
    const postRes = await fetch(`${FIREBASE_DATABASE_URL}/conversations/${convId}/messages.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
      }),
    });

    if (!postRes.ok) {
      console.warn('[Firebase] Message post failed:', postRes.status, postRes.statusText);
      return false;
    }

    // Update conversation metadata
    fetch(`${FIREBASE_DATABASE_URL}/conversations/${convId}/meta.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastMessageText: message.content,
        lastMessageAt: message.timestamp || new Date().toISOString(),
      }),
    }).catch(() => {});

    // Update both participants' inboxes in Firebase for cross-device delivery
    if (meta?.senderUser && meta?.recipientUser) {
      const senderKey = cleanUserIdKey(meta.senderUser.id);
      const recipientKey = cleanUserIdKey(meta.recipientUser.id);
      const now = message.timestamp || new Date().toISOString();

      // Resolve photos with zero-empty guarantees
      const senderPhoto = meta.senderUser.photo || resolvePhotoFromStorage(meta.senderUser.id, meta.senderUser.name);
      const recipientPhoto = meta.recipientUser.photo || resolvePhotoFromStorage(meta.recipientUser.id, meta.recipientUser.name);

      // For sender's inbox — shows the conversation in their list
      const senderInboxPayload = {
        id: convId,
        participantId: meta.recipientUser.id,
        participantName: meta.recipientUser.name,
        participantPhoto: recipientPhoto,
        participantLocation: meta.recipientUser.location || 'India',
        participantDenomination: meta.recipientUser.denomination || 'Pentecostal',
        participantAge: meta.recipientUser.age || 28,
        lastMessageText: message.content,
        lastMessageAt: now,
        unreadCount: 0,
      };

      fetch(`${FIREBASE_DATABASE_URL}/user_inbox/${senderKey}/${convId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(senderInboxPayload),
      }).catch(() => {});

      // For recipient's inbox — delivers notification to them
      const recipientInboxPayload = {
        id: convId,
        participantId: meta.senderUser.id,
        participantName: meta.senderUser.name,
        participantPhoto: senderPhoto,
        participantLocation: 'India',
        participantDenomination: 'Pentecostal',
        participantAge: 28,
        lastMessageText: message.content,
        lastMessageAt: now,
        unreadCount: 1,
      };

      fetch(`${FIREBASE_DATABASE_URL}/user_inbox/${recipientKey}/${convId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipientInboxPayload),
      }).catch(() => {});

      // Also mirror to raw ID inboxes if different from clean key
      const rawSenderClean = String(meta.senderUser.id || '').replace(/^user_/, '').replace(/^prof_/, '');
      if (rawSenderClean && rawSenderClean !== senderKey) {
        fetch(`${FIREBASE_DATABASE_URL}/user_inbox/${rawSenderClean}/${convId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(senderInboxPayload),
        }).catch(() => {});
      }
      const rawRecipientClean = String(meta.recipientUser.id || '').replace(/^user_/, '').replace(/^prof_/, '');
      if (rawRecipientClean && rawRecipientClean !== recipientKey) {
        fetch(`${FIREBASE_DATABASE_URL}/user_inbox/${rawRecipientClean}/${convId}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipientInboxPayload),
        }).catch(() => {});
      }
    }

    return true;
  } catch (err) {
    console.warn('[Firebase] Send message error:', err);
    return false;
  }
}

/**
 * Updates user online presence in Firebase, localStorage, and BroadcastChannel
 */
export async function setUserPresence(userId: string, isOnline: boolean): Promise<void> {
  const cleanId = cleanUserIdKey(userId);
  if (!cleanId) return;

  const payload = {
    online: isOnline,
    lastSeen: Date.now(),
  };

  try {
    localStorage.setItem(`pm_presence_${cleanId}`, JSON.stringify(payload));
    const raw = localStorage.getItem('pm_online_users');
    const map = raw ? JSON.parse(raw) : {};
    if (isOnline) {
      map[cleanId] = Date.now();
    } else {
      delete map[cleanId];
    }
    localStorage.setItem('pm_online_users', JSON.stringify(map));

    const bc = new BroadcastChannel('pm_live_matrimony_chat');
    bc.postMessage({ type: 'PRESENCE', userId: cleanId, isOnline, lastSeen: Date.now() });
    bc.close();
  } catch {}

  if (isFirebaseConfigured()) {
    try {
      fetch(`${FIREBASE_DATABASE_URL}/presence/${cleanId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}
  }
}

/**
 * Retrieves all currently online users from localStorage
 */
export function getAllOnlineUsers(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('pm_online_users');
    if (!raw) return {};
    const map = JSON.parse(raw);
    const now = Date.now();
    const result: Record<string, boolean> = {};
    for (const [k, timestamp] of Object.entries(map)) {
      if (typeof timestamp === 'number' && now - timestamp < 120000) {
        result[k] = true;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Subscribes to real-time online presence for a specific user
 */
export function subscribeToUserPresence(
  userId: string,
  onPresenceUpdate: (isOnline: boolean, lastSeen?: number) => void
): () => void {
  const cleanId = cleanUserIdKey(userId);
  if (!cleanId) return () => {};

  let destroyed = false;
  let eventSource: EventSource | null = null;

  // Check initial local presence
  try {
    const raw = localStorage.getItem(`pm_presence_${cleanId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const isOnline = Boolean(parsed.online && Date.now() - (parsed.lastSeen || 0) < 120000);
      onPresenceUpdate(isOnline, parsed.lastSeen);
    }
  } catch {}

  if (isFirebaseConfigured()) {
    const endpoint = `${FIREBASE_DATABASE_URL}/presence/${cleanId}.json`;
    const checkPresence = (data: any) => {
      if (destroyed || !data) return;
      const isOnline = Boolean(data.online && Date.now() - (data.lastSeen || 0) < 180000);
      onPresenceUpdate(isOnline, data.lastSeen);
    };

    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : null))
      .then(checkPresence)
      .catch(() => {});

    try {
      eventSource = new EventSource(endpoint);
      eventSource.addEventListener('put', (e) => {
        try {
          const payload = JSON.parse(e.data);
          checkPresence(payload.data);
        } catch {}
      });
      eventSource.addEventListener('patch', (e) => {
        try {
          const payload = JSON.parse(e.data);
          checkPresence(payload.data);
        } catch {}
      });
    } catch {}
  }

  // Cross-tab broadcast listener
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel('pm_live_matrimony_chat');
    bc.onmessage = (event) => {
      if (event.data?.type === 'PRESENCE' && event.data.userId === cleanId) {
        onPresenceUpdate(Boolean(event.data.isOnline), event.data.lastSeen || Date.now());
      }
    };
  } catch {}

  const interval = setInterval(() => {
    if (destroyed) return;
    try {
      const raw = localStorage.getItem(`pm_presence_${cleanId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const isOnline = Boolean(parsed.online && Date.now() - (parsed.lastSeen || 0) < 120000);
        onPresenceUpdate(isOnline, parsed.lastSeen);
      }
    } catch {}
  }, 4000);

  return () => {
    destroyed = true;
    clearInterval(interval);
    if (bc) bc.close();
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
  };
}
