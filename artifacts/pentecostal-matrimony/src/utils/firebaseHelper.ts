import type { ChatMessage, Conversation } from '../types';

export const FIREBASE_DATABASE_URL =
  import.meta.env.VITE_FIREBASE_DATABASE_URL ||
  'https://pentecostal-matrimony-default-rtdb.asia-southeast1.firebasedatabase.app';

export function isFirebaseConfigured(): boolean {
  return Boolean(FIREBASE_DATABASE_URL && FIREBASE_DATABASE_URL.includes('firebasedatabase.app'));
}

/**
 * Creates a deterministic, symmetric conversation room ID between any two users.
 * Example: User A and User B will ALWAYS join the exact same Firebase path:
 * conv_1790417298221_1790427388748
 */
export function cleanUserIdKey(id: string): string {
  let s = String(id || '').trim().toLowerCase();
  s = s.replace(/^prof_user_/, '');
  s = s.replace(/^prof_/, '');
  s = s.replace(/^user_/, '');
  return s;
}

export function getDeterministicConvId(id1: string, id2: string): string {
  const clean1 = cleanUserIdKey(id1);
  const clean2 = cleanUserIdKey(id2);
  const sorted = [clean1, clean2].sort();
  return `conv_${sorted[0] || 'a'}_${sorted[1] || 'b'}`;
}

/**
 * Real-time live listener for a conversation's messages using Firebase Realtime Database SSE stream.
 * Instant sub-50ms message delivery between multiple devices.
 */
export function subscribeToFirebaseMessages(
  convId: string,
  onMessagesUpdate: (messages: ChatMessage[]) => void
): () => void {
  if (!isFirebaseConfigured() || !convId) {
    return () => {};
  }

  const endpoint = `${FIREBASE_DATABASE_URL}/conversations/${convId}/messages.json`;

  const parseMessages = (data: any): ChatMessage[] => {
    if (!data) return [];
    const rawList = Array.isArray(data)
      ? data
      : (Object.values(data) as ChatMessage[]);

    const valid = rawList.filter((m) => Boolean(m && m.content && m.timestamp));
    valid.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return valid;
  };

  // 1. Initial fast HTTP fetch
  fetch(endpoint)
    .then((r) => r.json())
    .then((data) => {
      if (data) {
        onMessagesUpdate(parseMessages(data));
      }
    })
    .catch((err) => {
      console.warn('[Firebase] Initial messages fetch warning:', err);
    });

  // 2. Real-time live streaming via native EventSource
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource(endpoint);

    eventSource.addEventListener('put', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.path === '/' && payload?.data) {
          onMessagesUpdate(parseMessages(payload.data));
        } else if (payload?.data) {
          fetch(endpoint)
            .then((r) => r.json())
            .then((fresh) => fresh && onMessagesUpdate(parseMessages(fresh)))
            .catch(() => {});
        }
      } catch {}
    });

    eventSource.addEventListener('patch', () => {
      fetch(endpoint)
        .then((r) => r.json())
        .then((fresh) => fresh && onMessagesUpdate(parseMessages(fresh)))
        .catch(() => {});
    });

    eventSource.onerror = () => {
      // Non-fatal: EventSource reconnects automatically
    };
  } catch (err) {
    console.warn('[Firebase] EventSource setup error:', err);
  }

  return () => {
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
  };
}

/**
 * Real-time listener for user's inbox conversations list from Firebase.
 * Ensures that conversations created or updated on one device appear instantly on other devices.
 */
export function subscribeToUserInbox(
  userId: string,
  onInboxUpdate: (conversations: any[]) => void
): () => void {
  const cleanId = cleanUserIdKey(userId);
  if (!isFirebaseConfigured() || !cleanId) return () => {};

  const endpoint = `${FIREBASE_DATABASE_URL}/user_inbox/${cleanId}.json`;

  const parseInbox = (data: any): any[] => {
    if (!data || typeof data !== 'object') return [];
    const list = Object.values(data) as any[];
    list.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
    return list;
  };

  fetch(endpoint)
    .then((r) => r.json())
    .then((data) => {
      if (data) onInboxUpdate(parseInbox(data));
    })
    .catch(() => {});

  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource(endpoint);

    eventSource.addEventListener('put', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.path === '/' && payload?.data) {
          onInboxUpdate(parseInbox(payload.data));
        } else {
          fetch(endpoint)
            .then((r) => r.json())
            .then((fresh) => fresh && onInboxUpdate(parseInbox(fresh)))
            .catch(() => {});
        }
      } catch {}
    });

    eventSource.addEventListener('patch', () => {
      fetch(endpoint)
        .then((r) => r.json())
        .then((fresh) => fresh && onInboxUpdate(parseInbox(fresh)))
        .catch(() => {});
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

    const checkTyping = (data: any) => {
      if (!data || typeof data !== 'object') {
        onTypingUpdate(false);
        return;
      }
      let someoneElseTyping = false;
      for (const [uid, isTyping] of Object.entries(data)) {
        if (cleanUserIdKey(uid) !== myClean && isTyping === true) {
          someoneElseTyping = true;
          break;
        }
      }
      onTypingUpdate(someoneElseTyping);
    };

    eventSource.addEventListener('put', (event) => {
      try {
        const payload = JSON.parse(event.data);
        checkTyping(payload.data);
      } catch {}
    });

    eventSource.addEventListener('patch', (event) => {
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
 * Send and push a new message to Firebase Realtime Database
 * Automatically syncs to conversation room AND both participants' inboxes for real-time WhatsApp experience.
 */
export async function sendFirebaseMessage(
  convId: string,
  message: ChatMessage,
  meta?: {
    senderUser?: { id: string; name: string; photo?: string };
    recipientUser?: { id: string; name: string; photo?: string; location?: string; denomination?: string; age?: number };
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

    // Update conversation metadata
    fetch(`${FIREBASE_DATABASE_URL}/conversations/${convId}/meta.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastMessageText: message.content,
        lastMessageAt: message.timestamp || new Date().toISOString(),
      }),
    }).catch(() => {});

    // Update both participants' inboxes in Firebase
    if (meta?.senderUser && meta?.recipientUser) {
      const senderKey = cleanUserIdKey(meta.senderUser.id);
      const recipientKey = cleanUserIdKey(meta.recipientUser.id);
      const now = message.timestamp || new Date().toISOString();

      // For sender's inbox
      fetch(`${FIREBASE_DATABASE_URL}/user_inbox/${senderKey}/${convId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: convId,
          participantId: meta.recipientUser.id,
          participantName: meta.recipientUser.name,
          participantPhoto: meta.recipientUser.photo || '',
          participantLocation: meta.recipientUser.location || '',
          participantDenomination: meta.recipientUser.denomination || '',
          participantAge: meta.recipientUser.age || 0,
          lastMessageText: message.content,
          lastMessageAt: now,
          unreadCount: 0,
        }),
      }).catch(() => {});

      // For recipient's inbox
      fetch(`${FIREBASE_DATABASE_URL}/user_inbox/${recipientKey}/${convId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: convId,
          participantId: meta.senderUser.id,
          participantName: meta.senderUser.name,
          participantPhoto: meta.senderUser.photo || '',
          lastMessageText: message.content,
          lastMessageAt: now,
          unreadCount: 1,
        }),
      }).catch(() => {});
    }

    return postRes.ok;
  } catch (err) {
    console.warn('[Firebase] Send message error:', err);
    return false;
  }
}
