import { useState, useEffect, useCallback } from 'react';
import { cleanUserIdKey, isFirebaseConfigured, FIREBASE_DATABASE_URL } from './firebaseHelper';

/**
 * Calculates total unread message count across all conversations for a user
 */
export function getStoredUnreadMessagesCount(userId?: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    let myId = userId;
    if (!myId) {
      const rawUser = localStorage.getItem('pm_auth_user');
      if (rawUser) myId = JSON.parse(rawUser).id;
    }
    const cleanMy = cleanUserIdKey(myId);
    const userKey = cleanMy ? `pm_user_conversations_${cleanMy}` : 'pm_user_conversations';
    const raw = localStorage.getItem(userKey);
    if (!raw) return 0;

    const convs = JSON.parse(raw);
    if (!Array.isArray(convs)) return 0;

    let total = 0;
    for (const c of convs) {
      if (typeof c.unreadCount === 'number' && c.unreadCount > 0) {
        total += c.unreadCount;
      } else if (Array.isArray(c.messages)) {
        const unread = c.messages.filter(
          (m: any) => m && !m.read && cleanUserIdKey(m.senderId) !== cleanMy
        );
        total += unread.length;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Marks a conversation as read and resets its unreadCount to 0
 */
export function markConversationAsRead(convId: string, currentUserId?: string): void {
  if (typeof window === 'undefined' || !convId) return;

  try {
    let myId = currentUserId;
    if (!myId) {
      const rawUser = localStorage.getItem('pm_auth_user');
      if (rawUser) myId = JSON.parse(rawUser).id;
    }
    const cleanMy = cleanUserIdKey(myId);
    const userKey = cleanMy ? `pm_user_conversations_${cleanMy}` : 'pm_user_conversations';
    const raw = localStorage.getItem(userKey);

    if (raw) {
      const convs = JSON.parse(raw);
      if (Array.isArray(convs)) {
        let changed = false;
        const updated = convs.map((c: any) => {
          if (c.id === convId || cleanUserIdKey(c.participantId) === cleanUserIdKey(convId)) {
            changed = true;
            return {
              ...c,
              unreadCount: 0,
              messages: (c.messages || []).map((m: any) => ({ ...m, read: true })),
            };
          }
          return c;
        });

        if (changed) {
          localStorage.setItem(userKey, JSON.stringify(updated));
        }
      }
    }

    // Reset unread count in Firebase inbox if configured
    if (isFirebaseConfigured() && cleanMy) {
      fetch(`${FIREBASE_DATABASE_URL}/user_inbox/${cleanMy}/${convId}/unreadCount.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(0),
      }).catch(() => {});
    }

    // Broadcast read event across tabs
    try {
      const bc = new BroadcastChannel('pm_live_matrimony_chat');
      bc.postMessage({ type: 'MESSAGES_READ', convId, userId: myId });
      bc.close();
    } catch {}

    window.dispatchEvent(
      new CustomEvent('pm:messages_read', { detail: { convId, userId: myId } })
    );
  } catch {}
}

/**
 * React hook that reacts in real-time to incoming messages and read events
 */
export function useUnreadMessagesCount(currentUserId?: string): number {
  const [unreadCount, setUnreadCount] = useState<number>(() =>
    getStoredUnreadMessagesCount(currentUserId)
  );

  const refreshCount = useCallback(() => {
    setUnreadCount(getStoredUnreadMessagesCount(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    refreshCount();

    // 1. Cross-tab BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('pm_live_matrimony_chat');
      bc.onmessage = (event) => {
        if (
          event.data?.type === 'NEW_MESSAGE' ||
          event.data?.type === 'MESSAGES_READ'
        ) {
          refreshCount();
        }
      };
    } catch {}

    // 2. Window custom events
    const onNewMsg = () => refreshCount();
    const onReadMsg = () => refreshCount();
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('pm_user_conversations')) {
        refreshCount();
      }
    };

    window.addEventListener('pm:new_message', onNewMsg);
    window.addEventListener('pm:messages_read', onReadMsg);
    window.addEventListener('storage', onStorage);

    // 3. Periodic light poll every 3 seconds for continuous accuracy
    const timer = setInterval(refreshCount, 3000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('pm:new_message', onNewMsg);
      window.removeEventListener('pm:messages_read', onReadMsg);
      window.removeEventListener('storage', onStorage);
      clearInterval(timer);
    };
  }, [refreshCount]);

  return unreadCount;
}
