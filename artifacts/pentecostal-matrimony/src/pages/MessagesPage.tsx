import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import {
  ArrowLeft,
  Ban,
  CheckCheck,
  Compass,
  Flag,
  MessageCircle,
  MoreVertical,
  Send,
  Trash2,
  User,
  ShieldCheck,
} from 'lucide-react';
import { customFetch, isSeedProfile } from '@workspace/api-client-react';
import type { Conversation, ChatMessage } from '../types';
import { ReportModal } from '../components/ui/ReportModal';
import { BlockModal } from '../components/ui/BlockModal';
import { DeleteChatModal } from '../components/ui/DeleteChatModal';
import { initiateConversation } from '../utils/storageHelper';
import {
  isFirebaseConfigured,
  subscribeToFirebaseMessages,
  subscribeToFirebaseTyping,
  subscribeToUserInbox,
  sendFirebaseTyping,
  sendFirebaseMessage,
  getDeterministicConvId,
  cleanUserIdKey,
  setUserPresence,
  subscribeToUserPresence,
  getAllOnlineUsers,
  FIREBASE_DATABASE_URL,
} from '../utils/firebaseHelper';
import { markConversationAsRead } from '../utils/useUnreadMessages';
import { useAuth, useUser } from '../auth';

function getStoredConversations(currentUserId?: string): Conversation[] {
  try {
    const cleanId = cleanUserIdKey(currentUserId || '');
    const key = cleanId ? `pm_user_conversations_${cleanId}` : 'pm_user_conversations';
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(
          (c: any) => {
            if (!c) return false;
            // Never show self-conversations
            if (cleanUserIdKey(c.participantId) === cleanId) return false;
            // Discard dummy seed messages
            if (c.lastMessageText?.includes('Praise the Lord! Thank you for reaching out')) return false;
            if (c.lastMessageText?.includes('God bless you. It is inspiring')) return false;
            // Ownership gate: only include conversations where I am explicitly the creator,
            // OR the deterministic conv ID confirms my involvement.
            if (!cleanId) return true;
            const creatorClean = cleanUserIdKey(c.creatorId || '');
            if (creatorClean === cleanId) return true;
            const cId = (c.id || '').toLowerCase();
            // Deterministic conv ID is: conv_${sorted([k1, k2]).join('_')}
            // We check prefix and suffix to avoid partial-string false positives.
            if (cId.startsWith(`conv_${cleanId}_`) || cId.endsWith(`_${cleanId}`)) return true;
            return false;
          }
        );
      }
    }
  } catch {}

  return [];
}

export function MessagesPage() {
  const [location] = useLocation();
  const { userId } = useAuth();
  const { user } = useUser();

  const currentUserId = useMemo(() => {
    if (user?.id) return user.id;
    if (userId) return userId;
    try {
      const raw = localStorage.getItem('pm_auth_user');
      if (raw) return JSON.parse(raw).id;
    } catch {}
    try {
      const myProf = localStorage.getItem('pm_my_profile');
      if (myProf) return JSON.parse(myProf).userId || JSON.parse(myProf).id;
    } catch {}
    return 'You';
  }, [user?.id, userId]);

  const cleanMyKey = useMemo(() => cleanUserIdKey(currentUserId), [currentUserId]);

  const currentUserName = useMemo(() => {
    if (user?.fullName) return user.fullName;
    try {
      const raw = localStorage.getItem('pm_auth_user');
      if (raw) return JSON.parse(raw).fullName;
    } catch {}
    try {
      const myProf = localStorage.getItem('pm_my_profile');
      if (myProf) return JSON.parse(myProf).displayName;
    } catch {}
    return 'You';
  }, [user?.fullName]);

  const currentUserPhoto = useMemo(() => {
    if (user?.imageUrl) return user.imageUrl;
    try {
      const myProf = localStorage.getItem('pm_my_profile');
      if (myProf) {
        const parsed = JSON.parse(myProf);
        const p = parsed.photos?.[0]?.url || parsed.primaryPhotoUrl;
        if (p) return p;
      }
    } catch {}
    try {
      const raw = localStorage.getItem('pm_auth_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.photoUrl || parsed.photo) return parsed.photoUrl || parsed.photo;
      }
    } catch {}
    try {
      const raw = localStorage.getItem('pm_registered_profiles');
      if (raw) {
        const profs = JSON.parse(raw);
        const cleanMy = cleanUserIdKey(currentUserId);
        const match = profs.find((p: any) =>
          cleanUserIdKey(p.userId || p.id) === cleanMy ||
          (p.displayName && currentUserName && p.displayName.trim().toLowerCase() === currentUserName.trim().toLowerCase())
        );
        if (match) {
          const p = match.photos?.[0]?.url || match.primaryPhotoUrl;
          if (p) return p;
        }
      }
    } catch {}
    if (cleanUserIdKey(currentUserId) === 'sura') {
      return 'https://res.cloudinary.com/suvkbjww/image/upload/v1790445115/eljlyxdlh0rkbg4pqoih.jpg';
    }
    return '';
  }, [user?.imageUrl, currentUserId, currentUserName]);

  const findParticipantPhoto = useCallback((participantId: string, participantName?: string): string => {
    const cleanPart = cleanUserIdKey(participantId);
    const cleanName = (participantName || '').trim().toLowerCase();

    // 1. Check all registered profiles in localStorage
    try {
      const raw = localStorage.getItem('pm_registered_profiles');
      if (raw) {
        const profs = JSON.parse(raw);
        const found = profs.find((p: any) => {
          const pClean = cleanUserIdKey(p.userId || p.id);
          const pName = (p.displayName || '').trim().toLowerCase();
          return pClean === cleanPart || (cleanName && pName === cleanName);
        });
        if (found) {
          const url = found.photos?.[0]?.url || found.primaryPhotoUrl;
          if (url) return url;
        }
      }
    } catch {}

    // 2. Fallback for Suru
    if (cleanPart === 'sura' || cleanName.includes('suru') || cleanName.includes('sura')) {
      return 'https://res.cloudinary.com/suvkbjww/image/upload/v1790445115/eljlyxdlh0rkbg4pqoih.jpg';
    }

    return '';
  }, []);

  const [selectedConvId, setSelectedConvId] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const targetUserId = params.get('user');
      if (targetUserId) {
        const myId = (() => {
          try {
            const raw = localStorage.getItem('pm_auth_user');
            return raw ? JSON.parse(raw).id : 'You';
          } catch {
            return 'You';
          }
        })();
        return getDeterministicConvId(myId, targetUserId);
      }
      // User-scoped active conv key prevents restoring another account's active thread
      const myId = (() => {
        try {
          const raw = localStorage.getItem('pm_auth_user');
          return raw ? JSON.parse(raw).id : '';
        } catch { return ''; }
      })();
      const cleanMy = cleanUserIdKey(myId);
      const savedActive = localStorage.getItem(cleanMy ? `pm_active_conv_id_${cleanMy}` : 'pm_active_conv_id');
      if (savedActive) return savedActive;
      const initial = getStoredConversations(myId);
      return initial[0]?.id || '';
    } catch {
      return '';
    }
  });

  const [inputText, setInputText] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [deleteChatModalOpen, setDeleteChatModalOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState<Conversation | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputTypingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentlyBroadcastingTyping = useRef<boolean>(false);
  const [onlineUsersMap, setOnlineUsersMap] = useState<Record<string, boolean>>(() => getAllOnlineUsers());
  const [isParticipantOnline, setIsParticipantOnline] = useState<boolean>(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Record<string, ChatMessage[]>>({});
  const [serverMessages, setServerMessages] = useState<Record<string, ChatMessage[]>>({});
  const [broadcastMessages, setBroadcastMessages] = useState<Record<string, ChatMessage[]>>({});
  const [firebaseActive, setFirebaseActive] = useState(false);
  const [firebaseMessages, setFirebaseMessages] = useState<ChatMessage[]>([]);
  const [firebaseInbox, setFirebaseInbox] = useState<any[]>([]);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef<boolean>(false);
  const prevMsgCountRef = useRef<number>(0);
  const lastConvIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleChatScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    // When distance from the bottom > 80px, user is viewing earlier message history
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUpRef.current = distanceFromBottom > 80;
  }, []);

  const { data: rawConversations = [], refetch } = useQuery<Conversation[]>({
    queryKey: ['conversations', currentUserId],
    queryFn: () => customFetch(`/api/conversations?userId=${encodeURIComponent(currentUserId)}`),
    initialData: () => getStoredConversations(currentUserId),
    refetchInterval: 2500, // Fast polling guarantees new messages arrive automatically
  });

  // Merge server/local conversations with live Firebase inbox
  const conversations = useMemo(() => {
    const map = new Map<string, Conversation>();
    const myCleanId = cleanUserIdKey(currentUserId);
    const myCleanName = (currentUserName || '').trim().toLowerCase();

    const sanitizeText = (txt?: string) => {
      if (!txt) return 'No messages yet.';
      if (
        txt.includes('Praise the Lord! Thank you for reaching out') ||
        txt.includes('God bless you. It is inspiring') ||
        txt.includes('Mutual connection confirmed.') ||
        txt.includes('Started a conversation in faith.')
      ) {
        return 'No messages yet.';
      }
      return txt;
    };

    // 1. From server/local storage
    for (const c of rawConversations) {
      if (!c || !c.id) continue;

      // ── Hard ownership gate ────────────────────────────────────────────
      // Only process conversations where the current user is provably a
      // participant (creatorId, participantId, or the deterministic conv ID).
      // This prevents cross-account contamination on shared devices.
      const _partCleanCheck = cleanUserIdKey(c.participantId);
      const _creatorCleanCheck = cleanUserIdKey(c.creatorId || '');
      const _convIdStr = (c.id || '').toLowerCase();
      const _isMeInvolved =
        _partCleanCheck === myCleanId ||
        _creatorCleanCheck === myCleanId ||
        _convIdStr.startsWith(`conv_${myCleanId}_`) ||
        _convIdStr.endsWith(`_${myCleanId}`);
      if (myCleanId && !_isMeInvolved) continue;
      // ──────────────────────────────────────────────────────────────────

      let participantId = c.participantId;
      let participantName = c.participantName;
      let participantPhoto = c.participantPhoto || findParticipantPhoto(c.participantId, c.participantName);

      const partClean = cleanUserIdKey(c.participantId);
      const creatorClean = cleanUserIdKey(c.creatorId || '');

      // If participantId is current user, flip to creatorId or other participant
      if (partClean === myCleanId && creatorClean && creatorClean !== myCleanId && c.creatorId) {
        participantId = c.creatorId;
        participantName = c.creatorName || 'Believer Candidate';
        participantPhoto = c.creatorPhoto || findParticipantPhoto(c.creatorId, c.creatorName);
      } else if (partClean === myCleanId) {
        const otherMsg = (c.messages || []).find((m: any) => cleanUserIdKey(m.senderId) !== myCleanId);
        if (otherMsg) {
          participantId = otherMsg.senderId;
          participantName = otherMsg.senderName || 'Believer Candidate';
          participantPhoto = findParticipantPhoto(otherMsg.senderId, otherMsg.senderName);
        } else {
          continue;
        }
      }

      const otherClean = cleanUserIdKey(participantId);
      if (otherClean === myCleanId) continue;
      if (participantName && myCleanName && participantName.trim().toLowerCase() === myCleanName) continue;

      const valid = (c.messages || []).filter((m: any) => {
        if (!m || !m.content) return false;
        const text = m.content;
        return (
          !text.includes('Praise the Lord! Thank you for reaching out') &&
          !text.includes('God bless you. It is inspiring') &&
          !text.includes('Mutual connection confirmed.')
        );
      });
      const lastMsg = valid[valid.length - 1];
      const nameKey = (participantName || '').trim().toLowerCase();
      const participantKey = otherClean || nameKey || c.id;
      const canonicalConvId = getDeterministicConvId(currentUserId, participantId);
      const photo = participantPhoto || findParticipantPhoto(participantId, participantName);

      const existing = map.get(participantKey);
      const convTime = new Date(lastMsg ? lastMsg.timestamp : (c.lastMessageAt || 0)).getTime();
      const existingTime = existing ? new Date(existing.lastMessageAt || 0).getTime() : 0;

      if (!existing || convTime >= existingTime) {
        map.set(participantKey, {
          ...c,
          id: canonicalConvId,
          participantId,
          participantName,
          participantPhoto: photo || existing?.participantPhoto || '',
          messages: valid,
          lastMessageText: lastMsg ? lastMsg.content : sanitizeText(c.lastMessageText),
          lastMessageAt: lastMsg ? lastMsg.timestamp : c.lastMessageAt,
        });
      }
    }

    // 2. From real-time Firebase Inbox
    for (const fi of firebaseInbox) {
      if (!fi || !fi.id) continue;
      const partClean = cleanUserIdKey(fi.participantId);
      // NEVER show self in conversation list
      if (partClean === myCleanId) continue;
      if (fi.participantName && myCleanName && fi.participantName.trim().toLowerCase() === myCleanName) continue;

      const nameKey = (fi.participantName || '').trim().toLowerCase();
      const participantKey = partClean || nameKey || fi.id;
      const canonicalConvId = getDeterministicConvId(currentUserId, fi.participantId);
      const photo = fi.participantPhoto || findParticipantPhoto(fi.participantId, fi.participantName);
      const existing = map.get(participantKey);

      if (existing) {
        const fiTime = new Date(fi.lastMessageAt || 0).getTime();
        const existingTime = new Date(existing.lastMessageAt || 0).getTime();
        map.set(participantKey, {
          ...existing,
          id: canonicalConvId,
          participantPhoto: photo || existing.participantPhoto || '',
          lastMessageText: sanitizeText(fi.lastMessageText) || existing.lastMessageText,
          lastMessageAt: fiTime >= existingTime ? (fi.lastMessageAt || existing.lastMessageAt) : existing.lastMessageAt,
          unreadCount: fi.unreadCount ?? existing.unreadCount,
        });
      } else {
        map.set(participantKey, {
          id: canonicalConvId,
          participantId: fi.participantId,
          participantName: fi.participantName || 'Believer Candidate',
          participantAge: fi.participantAge || 28,
          participantLocation: fi.participantLocation || 'India',
          participantPhoto: photo,
          participantOccupation: fi.participantOccupation || 'Professional',
          participantDenomination: fi.participantDenomination || 'Pentecostal',
          status: 'active',
          lastMessageText: sanitizeText(fi.lastMessageText),
          lastMessageAt: fi.lastMessageAt || new Date().toISOString(),
          unreadCount: fi.unreadCount || 0,
          messages: [],
        });
      }
    }

    const list = Array.from(map.values());
    list.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
    return list;
  }, [rawConversations, firebaseInbox, currentUserId, currentUserName, findParticipantPhoto]);

  const activeConversation = useMemo(() => {
    if (!selectedConvId && conversations.length > 0) return conversations[0];
    const found = conversations.find(
      (c) =>
        c.id === selectedConvId ||
        c.participantId === selectedConvId ||
        cleanUserIdKey(c.participantId) === cleanUserIdKey(selectedConvId) ||
        getDeterministicConvId(currentUserId, c.participantId) === selectedConvId
    );
    if (found) {
      return {
        ...found,
        participantPhoto: found.participantPhoto || findParticipantPhoto(found.participantId, found.participantName),
      };
    }

    // If an explicit conversation ID was requested (e.g. from ?user= query param) but not yet in list
    if (selectedConvId) {
      try {
        const raw = localStorage.getItem('pm_registered_profiles');
        if (raw) {
          const profs = JSON.parse(raw);
          const cand = profs.find(
            (p: any) =>
              (p.id && cleanUserIdKey(p.id) === cleanUserIdKey(selectedConvId)) ||
              (p.userId && cleanUserIdKey(p.userId) === cleanUserIdKey(selectedConvId)) ||
              (p.id && selectedConvId === getDeterministicConvId(currentUserId, p.id)) ||
              (p.userId && selectedConvId === getDeterministicConvId(currentUserId, p.userId))
          );
          if (cand) {
            const photo = cand.photos?.[0]?.url || cand.primaryPhotoUrl || findParticipantPhoto(cand.userId || cand.id, cand.displayName);
            return {
              id: getDeterministicConvId(currentUserId, cand.userId || cand.id),
              participantId: cand.userId || cand.id,
              participantName: cand.displayName || 'Believer Candidate',
              participantAge: cand.age || 28,
              participantLocation: [cand.location, cand.country].filter(Boolean).join(', ') || 'India',
              participantPhoto: photo,
              participantOccupation: cand.occupation || 'Professional',
              participantDenomination: cand.denomination || 'Pentecostal',
              status: 'active',
              lastMessageText: 'No messages yet.',
              lastMessageAt: new Date().toISOString(),
              unreadCount: 0,
              messages: [],
            };
          }
        }
      } catch {}
    }

    return conversations[0] || null;
  }, [conversations, selectedConvId, currentUserId, findParticipantPhoto]);

  // Safe handler for remote typing events with auto-clear timeout
  const handleRemoteTyping = useCallback((typing: boolean) => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (typing) {
      setIsTyping(true);
      // Auto-clear typing bubble after 3.5 seconds of inactivity so it never gets stuck
      typingTimerRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3500);
    } else {
      setIsTyping(false);
    }
  }, []);

  // Reset typing state when active conversation changes
  useEffect(() => {
    setIsTyping(false);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, [activeConversation?.id]);

  // Broadcast current user's typing state
  const broadcastMyTyping = useCallback((typing: boolean) => {
    if (!activeConversation?.id) return;
    const convId = activeConversation.id;

    if (isFirebaseConfigured()) {
      sendFirebaseTyping(convId, currentUserId, typing);
    }
    try {
      const bc = new BroadcastChannel('pm_live_matrimony_chat');
      bc.postMessage({
        type: 'TYPING',
        convId,
        userId: currentUserId,
        isTyping: typing,
      });
      bc.close();
    } catch {}
  }, [activeConversation?.id, currentUserId]);

  // Cross-tab real-time sync via BroadcastChannel & custom event listener
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('pm_live_matrimony_chat');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_MESSAGE' && event.data.convId && event.data.message) {
          const sId = cleanUserIdKey(event.data.senderId || '');
          const rId = cleanUserIdKey(event.data.recipientId || '');
          // Strictly reject messages that do not involve current user
          if (cleanMyKey && sId !== cleanMyKey && rId !== cleanMyKey) {
            return;
          }
          const { convId, message } = event.data;
          setBroadcastMessages((prev) => ({
            ...prev,
            [convId]: [...(prev[convId] || []), message],
          }));
          refetch();
        }
        if (event.data?.type === 'TYPING' && event.data.convId === activeConversation?.id) {
          if (cleanUserIdKey(event.data.userId) !== cleanMyKey) {
            handleRemoteTyping(Boolean(event.data.isTyping));
          }
        }
        if (event.data?.type === 'PRESENCE' && event.data.userId) {
          setOnlineUsersMap((prev) => ({
            ...prev,
            [event.data.userId]: Boolean(event.data.isOnline),
          }));
          if (cleanUserIdKey(activeConversation?.participantId) === event.data.userId) {
            setIsParticipantOnline(Boolean(event.data.isOnline));
          }
        }
      };
    } catch {}

    const onCustomNewMessage = (e: any) => {
      if (e.detail?.convId && e.detail?.message) {
        const sId = cleanUserIdKey(e.detail.senderId || '');
        const rId = cleanUserIdKey(e.detail.recipientId || '');
        if (cleanMyKey && sId !== cleanMyKey && rId !== cleanMyKey) {
          return;
        }
        const { convId, message } = e.detail;
        setBroadcastMessages((prev) => ({
          ...prev,
          [convId]: [...(prev[convId] || []), message],
        }));
      }
    };
    window.addEventListener('pm:new_message', onCustomNewMessage);

    const onStorage = (e: StorageEvent) => {
      if (cleanMyKey && e.key === `pm_user_conversations_${cleanMyKey}`) {
        refetch();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('pm:new_message', onCustomNewMessage);
      window.removeEventListener('storage', onStorage);
    };
  }, [refetch, cleanMyKey, activeConversation?.id, activeConversation?.participantId, handleRemoteTyping]);

  // Broadcast current user presence while in messaging area
  useEffect(() => {
    if (!currentUserId || currentUserId === 'You') return;
    setUserPresence(currentUserId, true);

    const hb = setInterval(() => {
      setUserPresence(currentUserId, true);
    }, 25000);

    const onUnload = () => {
      setUserPresence(currentUserId, false);
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      clearInterval(hb);
      window.removeEventListener('beforeunload', onUnload);
      setUserPresence(currentUserId, false);
    };
  }, [currentUserId]);

  // Subscribe to active participant's online presence
  useEffect(() => {
    if (!activeConversation?.participantId) {
      setIsParticipantOnline(false);
      return;
    }

    const unsub = subscribeToUserPresence(activeConversation.participantId, (isOnline) => {
      setIsParticipantOnline(isOnline);
      setOnlineUsersMap((prev) => ({
        ...prev,
        [cleanUserIdKey(activeConversation.participantId)]: isOnline,
      }));
    });

    return () => {
      unsub();
    };
  }, [activeConversation?.participantId]);

  // Periodically refresh all online users
  useEffect(() => {
    const update = () => {
      setOnlineUsersMap(getAllOnlineUsers());
    };
    const id = setInterval(update, 4000);
    return () => clearInterval(id);
  }, []);

  // Mark active conversation as read when opened/viewed
  useEffect(() => {
    if (activeConversation?.id) {
      markConversationAsRead(activeConversation.id, currentUserId);
    }
  }, [activeConversation?.id, currentUserId]);

  // Subscribe to real-time Firebase Inbox updates across devices
  useEffect(() => {
    if (!currentUserId || currentUserId === 'You' || !isFirebaseConfigured()) return;
    const unsub = subscribeToUserInbox(currentUserId, (inboxItems) => {
      if (Array.isArray(inboxItems)) {
        setFirebaseInbox(inboxItems);
      }
    });
    return () => unsub();
  }, [currentUserId]);

  // Real-time Firebase WebSocket/SSE listener for live chat streaming
  useEffect(() => {
    if (!activeConversation?.id) return;
    const convId = activeConversation.id;

    if (isFirebaseConfigured()) {
      setFirebaseActive(true);
      const unsubMsgs = subscribeToFirebaseMessages(convId, (msgs) => {
        if (Array.isArray(msgs)) {
          setFirebaseMessages(msgs);
        }
      });

      const unsubTyping = subscribeToFirebaseTyping(convId, currentUserId, (typing) => {
        handleRemoteTyping(typing);
      });

      return () => {
        unsubMsgs();
        unsubTyping();
      };
    } else {
      setFirebaseActive(false);
      return undefined;
    }
  }, [activeConversation?.id, currentUserId]);

  // Active room server messages polling fallback: Polls room messages from serverless API every 2.5s
  useEffect(() => {
    if (!activeConversation?.id) return;
    const convId = activeConversation.id;
    let mounted = true;

    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/conversations?id=${encodeURIComponent(convId)}&userId=${encodeURIComponent(currentUserId)}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (mounted && data?.messages && Array.isArray(data.messages)) {
            setServerMessages((prev) => ({
              ...prev,
              [convId]: data.messages,
            }));
          }
        }
      } catch {}
    };

    fetchRoom();
    const interval = setInterval(fetchRoom, 2500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activeConversation?.id, currentUserId]);

  // Handle ?user= and ?name= and ?photo= query parameters
  useEffect(() => {
    const searchStr = window.location.search || (location.includes('?') ? location.split('?')[1] : '');
    const params = new URLSearchParams(searchStr);
    const targetUserId = params.get('user');
    const targetName = params.get('name');
    const targetPhoto = params.get('photo');

    if (targetUserId) {
      let matchedProfile: any = null;
      try {
        const raw = localStorage.getItem('pm_registered_profiles');
        const profiles = raw ? JSON.parse(raw) : [];
        matchedProfile = profiles.find((p: any) =>
          cleanUserIdKey(p.id) === cleanUserIdKey(targetUserId) ||
          cleanUserIdKey(p.userId) === cleanUserIdKey(targetUserId)
        );
      } catch {}

      const convId = initiateConversation(
        matchedProfile || {
          id: targetUserId,
          userId: targetUserId,
          displayName: targetName ? decodeURIComponent(targetName) : 'Believer Candidate',
          photos: targetPhoto ? [{ url: decodeURIComponent(targetPhoto) }] : [],
          primaryPhotoUrl: targetPhoto ? decodeURIComponent(targetPhoto) : '',
        },
        currentUserId
      );

      setSelectedConvId(convId);
      setMobileChatOpen(true);
      refetch();
    } else if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [location, conversations.length, currentUserId]);



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (!activeConversation?.id) return;

    if (val.trim().length === 0) {
      if (inputTypingDebounceRef.current) {
        clearTimeout(inputTypingDebounceRef.current);
        inputTypingDebounceRef.current = null;
      }
      if (isCurrentlyBroadcastingTyping.current) {
        isCurrentlyBroadcastingTyping.current = false;
        broadcastMyTyping(false);
      }
      return;
    }

    if (!isCurrentlyBroadcastingTyping.current) {
      isCurrentlyBroadcastingTyping.current = true;
      broadcastMyTyping(true);
    }

    // Debounce: if user doesn't press another key for 2.2s, mark typing as stopped
    if (inputTypingDebounceRef.current) {
      clearTimeout(inputTypingDebounceRef.current);
    }
    inputTypingDebounceRef.current = setTimeout(() => {
      isCurrentlyBroadcastingTyping.current = false;
      broadcastMyTyping(false);
    }, 2200);
  };

  // WhatsApp-style instant messaging: real messages only, zero bots, instant delivery
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const userText = inputText.trim();
    setInputText('');

    // Clear typing indicator on send immediately
    if (inputTypingDebounceRef.current) {
      clearTimeout(inputTypingDebounceRef.current);
      inputTypingDebounceRef.current = null;
    }
    if (isCurrentlyBroadcastingTyping.current) {
      isCurrentlyBroadcastingTyping.current = false;
    }
    broadcastMyTyping(false);

    // 1. Instant optimistic update for user message
    const tempUserMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUserId,
      senderName: currentUserName,
      content: userText,
      timestamp: new Date().toISOString(),
      read: false,
      delivered: true,
    };

    setOptimisticMessages((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), tempUserMsg],
    }));

    isUserScrolledUpRef.current = false;
    requestAnimationFrame(() => {
      scrollToBottom('smooth');
    });

    const cleanMy = cleanUserIdKey(currentUserId);
    const cleanPart = cleanUserIdKey(activeConversation.participantId);

    // 3. Persist new message to sender's user-scoped conversations in localStorage
    try {
      const userKey = cleanMy ? `pm_user_conversations_${cleanMy}` : 'pm_user_conversations';
      const raw = localStorage.getItem(userKey);
      let localConvs: Conversation[] = raw ? JSON.parse(raw) : [];
      const idx = localConvs.findIndex((c) => c.id === activeConversation.id || cleanUserIdKey(c.participantId) === cleanPart);
      if (idx >= 0) {
        localConvs[idx].messages = [...(localConvs[idx].messages || []), tempUserMsg];
        localConvs[idx].lastMessageText = userText;
        localConvs[idx].lastMessageAt = tempUserMsg.timestamp;
        if (!localConvs[idx].creatorId) localConvs[idx].creatorId = currentUserId;
      } else {
        localConvs.unshift({
          ...activeConversation,
          creatorId: currentUserId, // always persist creatorId for ownership checks
          status: (activeConversation.status ?? 'active') as 'active' | 'ended' | 'blocked',
          lastMessageText: userText,
          lastMessageAt: tempUserMsg.timestamp,
          messages: [tempUserMsg],
        });
      }
      localStorage.setItem(userKey, JSON.stringify(localConvs));
    } catch {}

    // NOTE: We do NOT mirror messages into the recipient's localStorage.
    // Cross-writing into another account's storage key is the root cause of
    // conversations leaking between accounts on shared devices.
    // The recipient sees new messages via the server API (polled every 2.5 s)
    // and Firebase real-time subscriptions.

    // 4. Cross-tab live broadcast via BroadcastChannel and window custom event
    try {
      const bc = new BroadcastChannel('pm_live_matrimony_chat');
      bc.postMessage({
        type: 'NEW_MESSAGE',
        convId: activeConversation.id,
        message: tempUserMsg,
        senderId: currentUserId,
        recipientId: activeConversation.participantId,
      });
      bc.close();
    } catch {}

    window.dispatchEvent(
      new CustomEvent('pm:new_message', {
        detail: {
          convId: activeConversation.id,
          message: tempUserMsg,
        },
      })
    );

    // 5. Stream to Firebase Realtime Database for instant cross-device delivery (<50ms)
    if (isFirebaseConfigured()) {
      const recipientPhoto = activeConversation.participantPhoto || findParticipantPhoto(activeConversation.participantId, activeConversation.participantName);
      sendFirebaseMessage(activeConversation.id, tempUserMsg, {
        senderUser: {
          id: currentUserId,
          name: currentUserName,
          photo: currentUserPhoto,
        },
        recipientUser: {
          id: activeConversation.participantId,
          name: activeConversation.participantName,
          photo: recipientPhoto,
          location: activeConversation.participantLocation,
          denomination: activeConversation.participantDenomination,
          age: activeConversation.participantAge,
        },
      });
    }

    // 6. Persist to API server in background
    fetch('/api/conversations?action=message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: activeConversation.id,
        id: tempUserMsg.id,
        content: userText,
        senderId: currentUserId,
        senderName: currentUserName,
        senderPhoto: currentUserPhoto,
        timestamp: tempUserMsg.timestamp,
        recipientId: activeConversation.participantId,
        recipientName: activeConversation.participantName,
        recipientAge: activeConversation.participantAge,
        recipientLocation: activeConversation.participantLocation,
        recipientPhoto: activeConversation.participantPhoto,
      }),
    }).catch(() => {});

    refetch();
  };

  const handleClearChatHistory = () => {
    if (!activeConversation) return;
    try {
      const cleanMy = cleanUserIdKey(currentUserId);
      const userKey = cleanMy ? `pm_user_conversations_${cleanMy}` : 'pm_user_conversations';
      const raw = localStorage.getItem(userKey);
      if (raw) {
        const convs = JSON.parse(raw);
        const idx = convs.findIndex((c: any) => c.id === activeConversation.id);
        if (idx >= 0) {
          convs[idx].messages = [];
          convs[idx].lastMessageText = 'Chat history cleared.';
          localStorage.setItem(userKey, JSON.stringify(convs));
        }
      }
      setOptimisticMessages((prev) => ({
        ...prev,
        [activeConversation.id]: [],
      }));
      setServerMessages((prev) => ({
        ...prev,
        [activeConversation.id]: [],
      }));
      setBroadcastMessages((prev) => ({
        ...prev,
        [activeConversation.id]: [],
      }));
      setFirebaseMessages([]);
      setNotice('Chat history cleared.');
      setMenuOpen(false);
      refetch();
    } catch {}
  };

  const handleDeleteConversation = () => {
    if (!convToDelete) return;
    const targetId = convToDelete.id;
    const targetPartId = convToDelete.participantId;
    const targetParticipantName = convToDelete.participantName;

    try {
      const cleanMy = cleanUserIdKey(currentUserId);
      const userKey = cleanMy ? `pm_user_conversations_${cleanMy}` : 'pm_user_conversations';
      const raw = localStorage.getItem(userKey);
      if (raw) {
        const convs: Conversation[] = JSON.parse(raw);
        const filtered = convs.filter(
          (c) => c.id !== targetId && cleanUserIdKey(c.participantId) !== cleanUserIdKey(targetPartId)
        );
        localStorage.setItem(userKey, JSON.stringify(filtered));
      }

      // If active conversation was deleted, remove active pointer and select next available
      const activeKey = cleanMy ? `pm_active_conv_id_${cleanMy}` : 'pm_active_conv_id';
      if (selectedConvId === targetId || activeConversation?.id === targetId) {
        localStorage.removeItem(activeKey);
        const remaining = conversations.filter((c) => c.id !== targetId);
        if (remaining.length > 0) {
          setSelectedConvId(remaining[0].id);
          localStorage.setItem(activeKey, remaining[0].id);
        } else {
          setSelectedConvId('');
        }
        setMobileChatOpen(false);
      }

      // Clean message state buffers
      setOptimisticMessages((prev) => {
        const copy = { ...prev };
        delete copy[targetId];
        return copy;
      });
      setServerMessages((prev) => {
        const copy = { ...prev };
        delete copy[targetId];
        return copy;
      });
      setBroadcastMessages((prev) => {
        const copy = { ...prev };
        delete copy[targetId];
        return copy;
      });

      // Serverless backend deletion
      fetch(`/api/conversations?id=${encodeURIComponent(targetId)}&userId=${encodeURIComponent(currentUserId)}`, {
        method: 'DELETE',
      }).catch(() => {});

      // Firebase inbox deletion if configured
      if (isFirebaseConfigured() && cleanMy) {
        fetch(`${FIREBASE_DATABASE_URL}/user_inbox/${cleanMy}/${targetId}.json`, {
          method: 'DELETE',
        }).catch(() => {});
      }

      setNotice(`Conversation with ${targetParticipantName} deleted.`);
      setTimeout(() => setNotice(null), 3500);
      setConvToDelete(null);
      refetch();
    } catch {
      setNotice('Could not delete conversation. Please try again.');
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleEndConversation = () => {
    setNotice(`Conversation with ${activeConversation?.participantName} has ended.`);
    setMenuOpen(false);
  };

  // Combine stored messages, server room messages, real-time Firebase messages, broadcast messages, and optimistic messages
  const currentMessages: ChatMessage[] = useMemo(() => {
    if (!activeConversation) return [];

    const map = new Map<string, ChatMessage>();

    const addMessage = (m: ChatMessage, prefix: string) => {
      if (!m || !m.content) return;
      if (
        m.content.includes('Praise the Lord! Thank you for reaching out') ||
        m.content.includes('God bless you. It is inspiring') ||
        m.content.includes('Mutual connection confirmed.') ||
        m.content.includes('Started a conversation in faith.')
      ) {
        return;
      }
      const existingKey = Array.from(map.keys()).find((k) => {
        const existing = map.get(k)!;
        return (
          existing.id === m.id ||
          (existing.content === m.content &&
            Math.abs(new Date(existing.timestamp).getTime() - new Date(m.timestamp).getTime()) < 3000)
        );
      });
      if (existingKey) {
        map.set(existingKey, m);
      } else {
        map.set(m.id || `${prefix}_${m.timestamp}`, m);
      }
    };

    // 1. Initial stored messages
    for (const m of activeConversation.messages || []) {
      addMessage(m, 'stored');
    }

    // 2. Server polled room messages
    for (const sm of serverMessages[activeConversation.id] || []) {
      addMessage(sm, 'server');
    }

    // 3. Real-time Firebase messages
    for (const fm of firebaseMessages) {
      addMessage(fm, 'fb');
    }

    // 4. Cross-tab broadcast messages
    for (const bm of broadcastMessages[activeConversation.id] || []) {
      addMessage(bm, 'broadcast');
    }

    // 5. Optimistic local messages
    for (const om of optimisticMessages[activeConversation.id] || []) {
      addMessage(om, 'opt');
    }

    const result = Array.from(map.values());
    result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return result;
  }, [activeConversation, serverMessages, firebaseMessages, broadcastMessages, optimisticMessages]);

  // When switching active conversation: scroll container to bottom once
  useEffect(() => {
    if (!activeConversation?.id) return;
    if (lastConvIdRef.current !== activeConversation.id) {
      lastConvIdRef.current = activeConversation.id;
      isUserScrolledUpRef.current = false;
      prevMsgCountRef.current = currentMessages.length;
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
    }
  }, [activeConversation?.id, currentMessages.length, scrollToBottom]);

  // When new messages arrive: only auto-scroll if the user hasn't scrolled up to read earlier history
  useEffect(() => {
    const newCount = currentMessages.length;
    if (newCount > prevMsgCountRef.current) {
      prevMsgCountRef.current = newCount;
      if (!isUserScrolledUpRef.current) {
        requestAnimationFrame(() => {
          scrollToBottom('smooth');
        });
      }
    } else {
      prevMsgCountRef.current = newCount;
    }
  }, [currentMessages.length, scrollToBottom]);

  return (
    <div className="h-[calc(100dvh-7.5rem)] md:h-[calc(100vh-4.5rem)] flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {notice && (
        <div className="fixed top-20 right-4 z-50 rounded-lg border border-emerald-300 bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg animate-in fade-in">
          {notice}
        </div>
      )}

      {activeConversation && (
        <>
          <ReportModal
            isOpen={reportModalOpen}
            onClose={() => setReportModalOpen(false)}
            onSubmit={() => setNotice('Report submitted to stewards.')}
            profileName={activeConversation.participantName}
          />
          <BlockModal
            isOpen={blockModalOpen}
            onClose={() => setBlockModalOpen(false)}
            onConfirm={() => setNotice('User blocked.')}
            profileName={activeConversation.participantName}
          />
          <DeleteChatModal
            isOpen={deleteChatModalOpen}
            onClose={() => {
              setDeleteChatModalOpen(false);
              setConvToDelete(null);
            }}
            onConfirm={handleDeleteConversation}
            participantName={convToDelete?.participantName || activeConversation.participantName}
          />
        </>
      )}

      <div className="w-full h-full flex flex-col max-w-6xl mx-auto md:p-4 min-h-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 h-full">
            {/* Conversations List (Left) - Hidden on mobile when chat is open */}
            <div
              className={`border-b md:border-b-0 md:border-r border-slate-200 md:col-span-4 bg-slate-50/50 flex flex-col min-h-0 h-full ${
                mobileChatOpen ? 'hidden md:flex' : 'flex'
              }`}
            >
              <div className="border-b border-slate-200 p-3.5 bg-white flex items-center justify-between shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Conversations ({conversations.length})
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>

              {conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-3">
                    <MessageCircle size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No conversations yet</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Connect with verified Pentecostal believers in the directory to start discerning together.
                  </p>
                  <Link
                    href="/discover"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-800 transition"
                  >
                    <Compass size={14} />
                    <span>Browse Believers</span>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0">
                  {conversations.map((c) => {
                    const isSelected = activeConversation?.id === c.id;
                    const isOnline = Boolean(onlineUsersMap[cleanUserIdKey(c.participantId)]);
                    return (
                      <div
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedConvId(c.id);
                          localStorage.setItem(cleanMyKey ? `pm_active_conv_id_${cleanMyKey}` : 'pm_active_conv_id', c.id);
                          setMobileChatOpen(true);
                          markConversationAsRead(c.id, currentUserId);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedConvId(c.id);
                            localStorage.setItem(cleanMyKey ? `pm_active_conv_id_${cleanMyKey}` : 'pm_active_conv_id', c.id);
                            setMobileChatOpen(true);
                            markConversationAsRead(c.id, currentUserId);
                          }
                        }}
                        className={`group w-full text-left p-3.5 flex items-center gap-3 transition cursor-pointer select-none ${
                          isSelected
                            ? 'bg-rose-50/80 border-l-4 border-rose-700'
                            : 'hover:bg-slate-100/80 bg-white'
                        }`}
                      >
                        <div className="relative shrink-0">
                          {c.participantPhoto ? (
                            <img
                              src={c.participantPhoto}
                              alt={c.participantName}
                              className="h-11 w-11 rounded-full border border-slate-200 object-cover shadow-xs"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-full border border-rose-200 bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shadow-xs">
                              {c.participantName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          {/* Online green dot: only when participant is logged in */}
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 shadow-xs" title="Online now" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-900 truncate">
                              {c.participantName}
                              {typeof c.participantAge === 'number' && c.participantAge > 0 ? `, ${c.participantAge}` : ''}
                            </h3>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <p className={`text-xs truncate ${isSelected ? 'text-rose-950 font-medium' : 'text-slate-500'}`}>
                              {c.lastMessageText || 'No messages yet.'}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                              {/* Unread message count badge with dot */}
                              {typeof c.unreadCount === 'number' && c.unreadCount > 0 && (
                                <span className="h-4 min-w-[18px] rounded-full bg-rose-600 px-1 text-[9px] font-extrabold text-white flex items-center justify-center shadow-xs">
                                  <span className="h-1.5 w-1.5 rounded-full bg-white mr-0.5 shrink-0" />
                                  {c.unreadCount}
                                </span>
                              )}
                              {/* Delete Chat action trigger on hover/focus */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConvToDelete(c);
                                  setDeleteChatModalOpen(true);
                                }}
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete chat"
                                aria-label={`Delete chat with ${c.participantName}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chat Stream (Right) - Shown on mobile when chat is open */}
            <div
              className={`md:col-span-8 flex flex-col justify-between bg-white min-h-0 h-full ${
                !mobileChatOpen ? 'hidden md:flex' : 'flex'
              }`}
            >
              {activeConversation ? (
                <>
                  {/* Chat Active Header */}
                  <div className="shrink-0 flex items-center justify-between border-b border-slate-200 p-3 sm:p-4 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {/* Mobile Back Button */}
                      <button
                        type="button"
                        onClick={() => setMobileChatOpen(false)}
                        className="md:hidden p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 shrink-0"
                        title="Back to all conversations"
                      >
                        <ArrowLeft size={16} />
                      </button>

                      <div className="relative shrink-0">
                        {activeConversation.participantPhoto ? (
                          <img
                            src={activeConversation.participantPhoto}
                            alt={activeConversation.participantName}
                            className="h-10 w-10 rounded-full border border-slate-200 object-cover shadow-xs"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full border border-rose-200 bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs shadow-xs">
                            {activeConversation.participantName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {/* Green dot: only when logged in */}
                        {isParticipantOnline && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 shadow-xs" title="Online now" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900 truncate">
                          {activeConversation.participantName}
                          {typeof activeConversation.participantAge === 'number' && activeConversation.participantAge > 0 ? `, ${activeConversation.participantAge}` : ''}
                        </h2>
                        <p className="text-[11px] text-slate-500 truncate">
                          {activeConversation.participantLocation} · <span className="text-rose-700 font-medium">{activeConversation.participantDenomination}</span>
                        </p>
                      </div>
                    </div>

                    <div className="relative shrink-0 flex items-center gap-2">
                      {/* Real-time Status Badge: Online / Offline */}
                      {isParticipantOnline ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md shadow-2xs">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Offline
                        </span>
                      )}

                      <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition"
                        aria-label="Conversation Options"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {menuOpen && (
                        <div className="absolute right-0 top-11 z-30 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setConvToDelete(activeConversation as Conversation);
                              setDeleteChatModalOpen(true);
                              setMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition font-semibold cursor-pointer"
                          >
                            <Trash2 size={13} className="text-rose-500" />
                            <span>Delete Chat</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleClearChatHistory}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition cursor-pointer"
                          >
                            <Trash2 size={13} className="text-slate-400" />
                            <span>Clear Chat History</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleEndConversation}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                          >
                            End Conversation
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReportModalOpen(true);
                              setMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-amber-50 hover:text-amber-800 transition cursor-pointer"
                          >
                            Report Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBlockModalOpen(true);
                              setMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                          >
                            Block User
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messages Flow */}
                  <div
                    ref={messagesContainerRef}
                    onScroll={handleChatScroll}
                    className="flex-1 min-h-0 p-3.5 sm:p-6 overflow-y-auto space-y-3 bg-slate-50/40"
                  >
                    <div className="text-center py-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[10px] font-semibold text-slate-500 shadow-2xs">
                        <ShieldCheck size={11} className="text-emerald-600" />
                        Messages are streamed in real-time between verified members
                      </span>
                    </div>

                    {currentMessages.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400">
                        <MessageCircle size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="font-medium text-slate-600">No messages yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Send a message to start communicating with {activeConversation.participantName}.</p>
                      </div>
                    ) : (
                      currentMessages.map((m) => {
                        const senderKey = cleanUserIdKey(m.senderId);
                        const isMe =
                          m.senderId === 'You' ||
                          m.senderId === 'prof_me' ||
                          senderKey === cleanMyKey ||
                          (cleanMyKey && senderKey && cleanMyKey === senderKey);
                        const isSystem = m.senderId === 'system';

                        if (isSystem) {
                          return (
                            <div key={m.id} className="text-center py-1">
                              <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-500 shadow-2xs">
                                {m.content}
                              </span>
                            </div>
                          );
                        }

                        const participantPhoto = activeConversation.participantPhoto || findParticipantPhoto(activeConversation.participantId, activeConversation.participantName);

                        return (
                          <div
                            key={m.id}
                            className={`flex gap-2.5 items-end ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            {/* Candidate Avatar for incoming messages */}
                            {!isMe && (
                              <div className="shrink-0 mb-4">
                                {participantPhoto ? (
                                  <img
                                    src={participantPhoto}
                                    alt={activeConversation.participantName}
                                    className="h-8 w-8 rounded-full border border-slate-200 object-cover shadow-2xs"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full border border-rose-200 bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px] shadow-2xs">
                                    {activeConversation.participantName.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%] sm:max-w-[70%]`}>
                              <div
                                className={`p-3.5 text-xs leading-relaxed shadow-xs ${
                                  isMe
                                    ? 'bg-rose-700 text-white rounded-2xl rounded-br-xs'
                                    : 'bg-white border border-slate-200 text-slate-900 rounded-2xl rounded-bl-xs'
                                }`}
                              >
                                <p>{m.content}</p>
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                                <span>
                                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && <CheckCheck size={13} className="text-rose-600" />}
                              </div>
                            </div>

                            {/* User Avatar for outgoing messages */}
                            {isMe && currentUserPhoto && (
                              <div className="shrink-0 mb-4">
                                <img
                                  src={currentUserPhoto}
                                  alt={currentUserName}
                                  className="h-8 w-8 rounded-full border border-rose-200 object-cover shadow-2xs"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* Live typing indicator */}
                    {isTyping && (
                      <div className="flex flex-col items-start animate-in fade-in duration-200">
                        <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-xs p-2.5 shadow-xs flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-600 mr-1">
                            {activeConversation.participantName} is typing
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-bounce" />
                        </div>
                      </div>
                    )}

                  </div>

                  {/* WhatsApp-Style Input Bar */}
                  <form onSubmit={handleSendMessage} className="shrink-0 border-t border-slate-200 p-2.5 sm:p-3.5 flex gap-2 sm:gap-2.5 bg-white">
                    <input
                      type="text"
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder={`Message ${activeConversation.participantName}...`}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-700 px-4 sm:px-5 py-2.5 sm:py-3 text-xs font-bold text-white shadow-xs hover:bg-rose-800 disabled:opacity-40 transition uppercase tracking-wider shrink-0 cursor-pointer"
                    >
                      <Send size={13} />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 mb-4 shadow-xs">
                    <MessageCircle size={28} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {conversations.length > 0 ? 'Select a Conversation' : 'Private Matrimonial Discernment'}
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    {conversations.length > 0
                      ? 'Choose a conversation from the sidebar to view your messages and continue discerning together.'
                      : 'You do not have any active message threads. In our Pentecostal community, private messaging is intentional. Connect with verified believers through the directory to begin prayerful communication.'}
                  </p>
                  {conversations.length === 0 && (
                    <Link
                      href="/discover"
                      className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                    >
                      <Compass size={14} />
                      <span>Browse Believers Directory</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
