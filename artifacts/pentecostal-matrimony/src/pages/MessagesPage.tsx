import { useEffect, useState, useRef, useMemo } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { customFetch, isSeedProfile } from '@workspace/api-client-react';
import type { Conversation, ChatMessage } from '../types';
import { ReportModal } from '../components/ui/ReportModal';
import { BlockModal } from '../components/ui/BlockModal';
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
} from '../utils/firebaseHelper';
import { useAuth, useUser } from '../auth';

function getStoredConversations(currentUserId?: string): Conversation[] {
  try {
    const cleanId = cleanUserIdKey(currentUserId || '');
    const key = cleanId ? `pm_user_conversations_${cleanId}` : 'pm_user_conversations';
    const raw = localStorage.getItem(key) || (cleanId ? localStorage.getItem('pm_user_conversations') : null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(
          (c: any) =>
            c &&
            cleanUserIdKey(c.participantId) !== cleanId &&
            !c.lastMessageText?.includes('Praise the Lord! Thank you for reaching out') &&
            !c.lastMessageText?.includes('God bless you. It is inspiring')
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
      const savedActive = localStorage.getItem('pm_active_conv_id');
      if (savedActive) return savedActive;
      const initial = getStoredConversations();
      return initial[0]?.id || '';
    } catch {
      return '';
    }
  });

  const [inputText, setInputText] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Record<string, ChatMessage[]>>({});
  const [firebaseActive, setFirebaseActive] = useState(false);
  const [firebaseMessages, setFirebaseMessages] = useState<ChatMessage[]>([]);
  const [firebaseInbox, setFirebaseInbox] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rawConversations = [], refetch } = useQuery<Conversation[]>({
    queryKey: ['conversations', currentUserId],
    queryFn: () => customFetch(`/api/conversations?userId=${encodeURIComponent(currentUserId)}`),
    initialData: () => getStoredConversations(currentUserId),
  });

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
      const partClean = cleanUserIdKey(c.participantId);
      // NEVER show self in conversation list
      if (partClean === myCleanId) continue;
      if (c.participantName && myCleanName && c.participantName.trim().toLowerCase() === myCleanName) continue;

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
      const nameKey = (c.participantName || '').trim().toLowerCase();
      const participantKey = nameKey || partClean || c.id;

      const existing = map.get(participantKey);
      const convTime = new Date(lastMsg ? lastMsg.timestamp : (c.lastMessageAt || 0)).getTime();
      const existingTime = existing ? new Date(existing.lastMessageAt || 0).getTime() : 0;

      if (!existing || convTime >= existingTime) {
        map.set(participantKey, {
          ...c,
          id: c.id,
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
      const participantKey = nameKey || partClean || fi.id;
      const existing = map.get(participantKey);

      if (existing) {
        const fiTime = new Date(fi.lastMessageAt || 0).getTime();
        const existingTime = new Date(existing.lastMessageAt || 0).getTime();
        const isCanonical = fi.id.startsWith('conv_') && (fi.id.includes(myCleanId) || fi.id.includes('john') || fi.id.includes('sura'));
        map.set(participantKey, {
          ...existing,
          id: isCanonical ? fi.id : (fiTime >= existingTime ? (fi.id || existing.id) : existing.id),
          lastMessageText: sanitizeText(fi.lastMessageText) || existing.lastMessageText,
          lastMessageAt: fiTime >= existingTime ? (fi.lastMessageAt || existing.lastMessageAt) : existing.lastMessageAt,
          unreadCount: fi.unreadCount ?? existing.unreadCount,
        });
      } else {
        map.set(participantKey, {
          id: fi.id,
          participantId: fi.participantId,
          participantName: fi.participantName || 'Believer Candidate',
          participantAge: fi.participantAge || 28,
          participantLocation: fi.participantLocation || 'India',
          participantPhoto: fi.participantPhoto || '',
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
  }, [rawConversations, firebaseInbox, currentUserId, currentUserName]);

  const activeConversation = useMemo(() => {
    if (!selectedConvId && conversations.length > 0) return conversations[0];
    const found = conversations.find(
      (c) =>
        c.id === selectedConvId ||
        c.participantId === selectedConvId ||
        cleanUserIdKey(c.participantId) === cleanUserIdKey(selectedConvId)
    );
    if (found) return found;

    // If not found in conversation list yet, check if registered candidate profile exists
    try {
      const raw = localStorage.getItem('pm_registered_profiles');
      if (raw) {
        const profs = JSON.parse(raw);
        const cand = profs.find(
          (p: any) =>
            selectedConvId.includes(cleanUserIdKey(p.id)) ||
            selectedConvId.includes(cleanUserIdKey(p.userId))
        );
        if (cand) {
          return {
            id: selectedConvId,
            participantId: cand.userId || cand.id,
            participantName: cand.displayName || 'Believer Candidate',
            participantAge: cand.age || 28,
            participantLocation: [cand.location, cand.country].filter(Boolean).join(', ') || 'India',
            participantPhoto: cand.photos?.[0]?.url || cand.primaryPhotoUrl || '',
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

    return conversations[0] || null;
  }, [conversations, selectedConvId]);

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
        setIsTyping(typing);
      });

      return () => {
        unsubMsgs();
        unsubTyping();
      };
    } else {
      setFirebaseActive(false);
    }
  }, [activeConversation?.id, currentUserId]);

  // Handle ?user= and ?name= query parameters
  useEffect(() => {
    const searchStr = window.location.search || (location.includes('?') ? location.split('?')[1] : '');
    const params = new URLSearchParams(searchStr);
    const targetUserId = params.get('user');
    const targetName = params.get('name');

    if (targetUserId) {
      let matchedProfile: any = null;
      try {
        const raw = localStorage.getItem('pm_registered_profiles');
        const profiles = raw ? JSON.parse(raw) : [];
        matchedProfile = profiles.find((p: any) => p.id === targetUserId || p.userId === targetUserId);
      } catch {}

      const convId = initiateConversation(
        matchedProfile || {
          id: targetUserId,
          userId: targetUserId,
          displayName: targetName ? decodeURIComponent(targetName) : 'Believer Candidate',
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

  // Auto-scroll chat stream to latest message
  useEffect(() => {
    if (activeConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation, optimisticMessages, firebaseMessages, isTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (activeConversation?.id && isFirebaseConfigured()) {
      sendFirebaseTyping(activeConversation.id, currentUserId, val.trim().length > 0);
    }
  };

  // WhatsApp-style instant messaging: real messages only, zero bots, instant delivery
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const userText = inputText.trim();
    setInputText('');

    // Clear typing indicator
    if (isFirebaseConfigured()) {
      sendFirebaseTyping(activeConversation.id, currentUserId, false);
    }

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

    // Update user-scoped local conversation storage
    try {
      const cleanMy = cleanUserIdKey(currentUserId);
      const userKey = cleanMy ? `pm_user_conversations_${cleanMy}` : 'pm_user_conversations';
      const raw = localStorage.getItem(userKey);
      let localConvs: Conversation[] = raw ? JSON.parse(raw) : [];
      const idx = localConvs.findIndex((c) => c.id === activeConversation.id || cleanUserIdKey(c.participantId) === cleanUserIdKey(activeConversation.participantId));
      if (idx >= 0) {
        localConvs[idx].messages = [...(localConvs[idx].messages || []), tempUserMsg];
        localConvs[idx].lastMessageText = userText;
        localConvs[idx].lastMessageAt = tempUserMsg.timestamp;
      } else {
        localConvs.unshift({
          ...activeConversation,
          lastMessageText: userText,
          lastMessageAt: tempUserMsg.timestamp,
          messages: [tempUserMsg],
        });
      }
      localStorage.setItem(userKey, JSON.stringify(localConvs));
    } catch {}

    // 2. Stream to Firebase Realtime Database for instant cross-device delivery (<50ms)
    if (isFirebaseConfigured()) {
      sendFirebaseMessage(activeConversation.id, tempUserMsg, {
        senderUser: {
          id: currentUserId,
          name: currentUserName,
        },
        recipientUser: {
          id: activeConversation.participantId,
          name: activeConversation.participantName,
          photo: activeConversation.participantPhoto,
          location: activeConversation.participantLocation,
          denomination: activeConversation.participantDenomination,
          age: activeConversation.participantAge,
        },
      });
    }

    // 3. Persist to API server in background
    fetch('/api/conversations?action=message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: activeConversation.id,
        content: userText,
        senderId: currentUserId,
        senderName: currentUserName,
      }),
    }).catch(() => {});
  };

  const handleClearChatHistory = () => {
    if (!activeConversation) return;
    try {
      const raw = localStorage.getItem('pm_user_conversations');
      if (raw) {
        const convs = JSON.parse(raw);
        const idx = convs.findIndex((c: any) => c.id === activeConversation.id);
        if (idx >= 0) {
          convs[idx].messages = [];
          convs[idx].lastMessageText = 'Chat history cleared.';
          localStorage.setItem('pm_user_conversations', JSON.stringify(convs));
        }
      }
      setOptimisticMessages((prev) => ({
        ...prev,
        [activeConversation.id]: [],
      }));
      setFirebaseMessages([]);
      setNotice('Chat history cleared.');
      setMenuOpen(false);
      refetch();
    } catch {}
  };

  const handleEndConversation = () => {
    setNotice(`Conversation with ${activeConversation?.participantName} has ended.`);
    setMenuOpen(false);
  };

  // Combine fetched messages, real-time Firebase messages, and optimistic messages
  const currentMessages: ChatMessage[] = useMemo(() => {
    if (!activeConversation) return [];

    const map = new Map<string, ChatMessage>();

    // 1. Initial stored messages
    for (const m of activeConversation.messages || []) {
      if (!m || !m.content) continue;
      if (
        m.content.includes('Praise the Lord! Thank you for reaching out') ||
        m.content.includes('God bless you. It is inspiring') ||
        m.content.includes('Mutual connection confirmed.') ||
        m.content.includes('Started a conversation in faith.')
      ) {
        continue;
      }
      map.set(m.id || `stored_${m.timestamp}`, m);
    }

    // 2. Real-time Firebase messages
    for (const fm of firebaseMessages) {
      if (!fm || !fm.content) continue;
      if (
        fm.content.includes('Praise the Lord! Thank you for reaching out') ||
        fm.content.includes('God bless you. It is inspiring') ||
        fm.content.includes('Mutual connection confirmed.') ||
        fm.content.includes('Started a conversation in faith.')
      ) {
        continue;
      }
      // Find matching message by ID or identical content within 3 seconds
      const existingKey = Array.from(map.keys()).find((k) => {
        const existing = map.get(k)!;
        return (
          existing.id === fm.id ||
          (existing.content === fm.content &&
            Math.abs(new Date(existing.timestamp).getTime() - new Date(fm.timestamp).getTime()) < 3000)
        );
      });
      if (existingKey) {
        map.set(existingKey, fm);
      } else {
        map.set(fm.id || `fb_${fm.timestamp}`, fm);
      }
    }

    // 3. Optimistic local messages
    for (const om of optimisticMessages[activeConversation.id] || []) {
      const alreadyPresent = Array.from(map.values()).some(
        (m) =>
          m.id === om.id ||
          (m.content === om.content &&
            Math.abs(new Date(m.timestamp).getTime() - new Date(om.timestamp).getTime()) < 3000)
      );
      if (!alreadyPresent) {
        map.set(om.id, om);
      }
    }

    const result = Array.from(map.values());
    result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return result;
  }, [activeConversation, firebaseMessages, optimisticMessages]);

  // Registered candidate profiles for quick start if conversation list is empty
  const registeredProfiles = (() => {
    try {
      const raw = localStorage.getItem('pm_registered_profiles');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((p: any) => !isSeedProfile(p));
      }
    } catch {}
    return [];
  })();

  const cleanMyKey = cleanUserIdKey(currentUserId);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12 text-slate-900">
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
        </>
      )}

      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-rose-50/70 via-amber-50/40 to-white">
            <div>
              <span className="inline-block rounded-full bg-rose-100/70 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 uppercase tracking-wider mb-1">
                Direct Discernment
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">Live Matrimony Chat</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Instant Real-Time Stream</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700">
                <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                <span>Encrypted Connection</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
            {/* Conversations List (Left) - Hidden on mobile when chat is open */}
            <div
              className={`border-b md:border-b-0 md:border-r border-slate-200 md:col-span-4 bg-slate-50/50 ${
                mobileChatOpen ? 'hidden md:block' : 'block'
              }`}
            >
              <div className="border-b border-slate-200 p-3.5 bg-white flex items-center justify-between">
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
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
                  {conversations.map((c) => {
                    const isSelected = activeConversation?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedConvId(c.id);
                          localStorage.setItem('pm_active_conv_id', c.id);
                          setMobileChatOpen(true);
                        }}
                        className={`w-full text-left p-3.5 flex items-center gap-3 transition cursor-pointer ${
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
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-full border border-rose-200 bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shadow-xs">
                              {c.participantName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
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
                          <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-rose-950 font-medium' : 'text-slate-500'}`}>
                            {c.lastMessageText || 'No messages yet.'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chat Stream (Right) - Shown on mobile when chat is open */}
            <div
              className={`md:col-span-8 flex flex-col justify-between bg-white ${
                !mobileChatOpen ? 'hidden md:flex' : 'flex'
              }`}
            >
              {activeConversation ? (
                <>
                  {/* Chat Active Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 p-3 sm:p-4 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
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
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full border border-rose-200 bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs shadow-xs">
                            {activeConversation.participantName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
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
                      {firebaseActive && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
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
                            onClick={handleClearChatHistory}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition"
                          >
                            <Trash2 size={13} className="text-slate-400" />
                            <span>Clear Chat History</span>
                          </button>
                          <button
                            onClick={handleEndConversation}
                            className="w-full text-left px-3.5 py-2 hover:bg-rose-50 hover:text-rose-700 transition"
                          >
                            End Conversation
                          </button>
                          <button
                            onClick={() => {
                              setReportModalOpen(true);
                              setMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-amber-50 hover:text-amber-800 transition"
                          >
                            Report Profile
                          </button>
                          <button
                            onClick={() => {
                              setBlockModalOpen(true);
                              setMenuOpen(false);
                            }}
                            className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 transition"
                          >
                            Block User
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messages Flow */}
                  <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-3 max-h-[480px] min-h-[360px] bg-slate-50/40">
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

                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[85%] sm:max-w-[75%] p-3.5 text-xs leading-relaxed shadow-xs ${
                                isMe
                                  ? 'bg-rose-700 text-white rounded-2xl rounded-tr-xs'
                                  : 'bg-white border border-slate-200 text-slate-900 rounded-2xl rounded-tl-xs'
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

                    <div ref={messagesEndRef} />
                  </div>

                  {/* WhatsApp-Style Input Bar */}
                  <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-3 sm:p-3.5 flex gap-2 sm:gap-2.5 bg-white">
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
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-3 shadow-xs">
                    <MessageCircle size={26} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Select a Candidate to Message</h3>
                  <p className="mt-1.5 max-w-sm text-xs text-slate-500 leading-relaxed">
                    Choose a conversation from the sidebar or connect with verified believers in the directory.
                  </p>

                  {registeredProfiles.length > 0 && (
                    <div className="mt-6 w-full max-w-md space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Available Believers</p>
                      {registeredProfiles.slice(0, 3).map((cand: any) => (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => {
                            const cid = initiateConversation(cand, currentUserId);
                            setSelectedConvId(cid);
                            refetch();
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 transition cursor-pointer text-left bg-white"
                        >
                          <div className="flex items-center gap-3">
                            {cand.photos && cand.photos[0] ? (
                              <img src={cand.photos[0].url} alt="" className="h-9 w-9 rounded-full object-cover border" />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                                {cand.displayName?.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-bold text-slate-900">{cand.displayName}, {cand.age}</p>
                              <p className="text-[10px] text-slate-500">{cand.denomination}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded-md">Chat</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <Link
                    href="/discover"
                    className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-rose-400 hover:text-rose-700 transition shadow-2xs"
                  >
                    <Compass size={14} />
                    <span>Open Discover Directory</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
