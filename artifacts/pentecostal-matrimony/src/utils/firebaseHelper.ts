import type { ChatMessage } from '../types';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const FIREBASE_DATABASE_URL =
  import.meta.env.VITE_FIREBASE_DATABASE_URL ||
  'https://pentecostal-matrimony-default-rtdb.asia-southeast1.firebasedatabase.app';

export function isFirebaseConfigured(): boolean {
  return Boolean(FIREBASE_DATABASE_URL && FIREBASE_DATABASE_URL.includes('firebasedatabase.app'));
}

/**
 * Real-time live listener for a conversation's messages using Firebase Realtime Database
 * Provides true live WebSocket/SSE streaming in <50ms with zero extra authentication overhead.
 */
export function subscribeToFirebaseMessages(
  convId: string,
  onMessagesUpdate: (messages: ChatMessage[]) => void
): () => void {
  if (!isFirebaseConfigured() || !convId) {
    return () => {};
  }

  const endpoint = `${FIREBASE_DATABASE_URL}/conversations/${convId}/messages.json`;

  const parseAndFilter = (data: any): ChatMessage[] => {
    if (!data) return [];
    const now = Date.now();
    const rawList = Array.isArray(data)
      ? data
      : (Object.values(data) as ChatMessage[]);

    const valid = rawList.filter((m) => {
      if (!m || !m.timestamp) return false;
      if (m.senderId === 'system') return true;
      const msgTime = new Date(m.timestamp).getTime();
      return now - msgTime < TWENTY_FOUR_HOURS_MS;
    });

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
        onMessagesUpdate(parseAndFilter(data));
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
          onMessagesUpdate(parseAndFilter(payload.data));
        } else if (payload?.data) {
          // New individual message appended
          fetch(endpoint)
            .then((r) => r.json())
            .then((fresh) => fresh && onMessagesUpdate(parseAndFilter(fresh)))
            .catch(() => {});
        }
      } catch {}
    });

    eventSource.addEventListener('patch', () => {
      fetch(endpoint)
        .then((r) => r.json())
        .then((fresh) => fresh && onMessagesUpdate(parseAndFilter(fresh)))
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

  try {
    eventSource = new EventSource(endpoint);

    const checkTyping = (data: any) => {
      if (!data || typeof data !== 'object') {
        onTypingUpdate(false);
        return;
      }
      let someoneElseTyping = false;
      for (const [userId, isTyping] of Object.entries(data)) {
        if (userId !== currentUserId && isTyping === true) {
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

  try {
    await fetch(`${FIREBASE_DATABASE_URL}/conversations/${convId}/typing/${userId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isTyping),
    });
  } catch {}
}

/**
 * Send and push a new message to Firebase Realtime Database
 */
export async function sendFirebaseMessage(
  convId: string,
  message: ChatMessage
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

    // Also update conversation metadata
    fetch(`${FIREBASE_DATABASE_URL}/conversations/${convId}/meta.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastMessageText: message.content,
        lastMessageAt: message.timestamp || new Date().toISOString(),
      }),
    }).catch(() => {});

    return postRes.ok;
  } catch (err) {
    console.warn('[Firebase] Send message error:', err);
    return false;
  }
}
