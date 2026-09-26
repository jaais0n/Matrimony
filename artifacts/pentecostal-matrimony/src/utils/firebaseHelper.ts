import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  off,
  type Database,
} from 'firebase/database';
import type { ChatMessage, Conversation } from '../types';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// Read config from Vite env variables or fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | null = null;
let db: Database | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    (firebaseConfig.databaseURL || firebaseConfig.projectId)
  );
}

export function initFirebase(): Database | null {
  if (db) return db;
  if (!isFirebaseConfigured()) return null;

  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    db = getDatabase(app);
    return db;
  } catch (err) {
    console.warn('[Firebase] Initialization error (falling back to local engine):', err);
    return null;
  }
}

/**
 * Real-time listener for a conversation's messages via WebSocket
 */
export function subscribeToFirebaseMessages(
  convId: string,
  onMessagesUpdate: (messages: ChatMessage[]) => void
): () => void {
  const database = initFirebase();
  if (!database || !convId) {
    return () => {};
  }

  const messagesRef = ref(database, `conversations/${convId}/messages`);

  const unsubscribe = onValue(
    messagesRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onMessagesUpdate([]);
        return;
      }

      const now = Date.now();
      const rawList = Object.values(data) as ChatMessage[];

      // Filter messages strictly within 24-hour expiration window
      const validMessages = rawList.filter((m) => {
        if (!m || !m.timestamp) return false;
        if (m.senderId === 'system') return true;
        const msgTime = new Date(m.timestamp).getTime();
        return now - msgTime < TWENTY_FOUR_HOURS_MS;
      });

      // Sort by chronological timestamp
      validMessages.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      onMessagesUpdate(validMessages);
    },
    (err) => {
      console.warn('[Firebase] Messages subscription error:', err);
    }
  );

  return () => {
    try {
      off(messagesRef);
    } catch {}
  };
}

/**
 * Real-time listener for "typing..." indicator
 */
export function subscribeToFirebaseTyping(
  convId: string,
  currentUserId: string,
  onTypingUpdate: (isTyping: boolean) => void
): () => void {
  const database = initFirebase();
  if (!database || !convId) {
    return () => {};
  }

  const typingRef = ref(database, `conversations/${convId}/typing`);

  onValue(typingRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      onTypingUpdate(false);
      return;
    }
    // Check if any other participant is typing
    let someoneElseTyping = false;
    for (const [userId, val] of Object.entries(data)) {
      if (userId !== currentUserId && val === true) {
        someoneElseTyping = true;
        break;
      }
    }
    onTypingUpdate(someoneElseTyping);
  });

  return () => {
    try {
      off(typingRef);
    } catch {}
  };
}

/**
 * Set typing status in Firebase
 */
export async function sendFirebaseTyping(
  convId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  const database = initFirebase();
  if (!database || !convId || !userId) return;

  try {
    const userTypingRef = ref(database, `conversations/${convId}/typing/${userId}`);
    await set(userTypingRef, isTyping);
  } catch {}
}

/**
 * Send a message to Firebase Realtime Database
 */
export async function sendFirebaseMessage(
  convId: string,
  message: ChatMessage
): Promise<boolean> {
  const database = initFirebase();
  if (!database || !convId) return false;

  try {
    const messagesRef = ref(database, `conversations/${convId}/messages`);
    const newMsgRef = push(messagesRef);
    await set(newMsgRef, {
      ...message,
      id: newMsgRef.key || message.id,
      timestamp: message.timestamp || new Date().toISOString(),
    });

    // Also update conversation metadata
    const metaRef = ref(database, `conversations/${convId}/meta`);
    await set(metaRef, {
      lastMessageText: message.content,
      lastMessageAt: message.timestamp || new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.warn('[Firebase] Send message error:', err);
    return false;
  }
}
