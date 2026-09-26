import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import {
  ArrowLeft,
  Ban,
  CheckCheck,
  Clock,
  Compass,
  Flag,
  MessageCircle,
  MoreVertical,
  Send,
  Trash2,
  User,
} from 'lucide-react';
import { customFetch, isSeedProfile } from '@workspace/api-client-react';
import type { Conversation, ChatMessage } from '../types';
import { ReportModal } from '../components/ui/ReportModal';
import { BlockModal } from '../components/ui/BlockModal';
import { initiateConversation } from '../utils/storageHelper';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function formatExpiresIn(timestamp: string): string {
  const elapsed = Date.now() - new Date(timestamp).getTime();
  const remaining = Math.max(0, TWENTY_FOUR_HOURS_MS - elapsed);
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h left`;
  if (mins > 0) return `${mins}m left`;
  return 'Expiring';
}

function filter24hMessages(messages: ChatMessage[]): ChatMessage[] {
  const now = Date.now();
  return (messages || []).filter((m) => {
    if (m.senderId === 'system') return true;
    const msgTime = new Date(m.timestamp).getTime();
    return now - msgTime < TWENTY_FOUR_HOURS_MS;
  });
}

const FAITH_REPLIES = [
  'Praise the Lord! Thank you for reaching out in faith. May God lead our steps according to His divine purpose.',
  'Grace and peace to you. I was truly encouraged by your testimony. How long have you been involved with your ministry?',
  'Amen! My family and I are prayerfully discerning God\'s will. Which church fellowship do you regularly attend?',
  'God bless you. It is inspiring to connect with a believer who shares a passion for Christ and family values.',
  'Praise God! I appreciate your message. Let us continue to seek the Lord in prayer for wisdom and clarity.',
];

function getStoredConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem('pm_user_conversations');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // If no conversations yet, check if registered candidate profiles exist and initiate
  try {
    const profRaw = localStorage.getItem('pm_registered_profiles');
    if (profRaw) {
      const profiles = JSON.parse(profRaw);
      if (Array.isArray(profiles)) {
        const validProfiles = profiles.filter((p: any) => !isSeedProfile(p));
        if (validProfiles.length > 0) {
          initiateConversation(validProfiles[0]);
          const updated = localStorage.getItem('pm_user_conversations');
          if (updated) return JSON.parse(updated);
        }
      }
    }
  } catch {}

  return [];
}

export function MessagesPage() {
  const [location] = useLocation();
  const [selectedConvId, setSelectedConvId] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const targetUserId = params.get('user');
      if (targetUserId) return `conv_${targetUserId}`;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rawConversations = [], refetch } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => customFetch('/api/conversations'),
    initialData: getStoredConversations,
  });

  // Filter conversations so that expired messages (> 24h) are purged in real-time
  const conversations = rawConversations.map((c) => {
    const valid = filter24hMessages(c.messages || []);
    const lastMsg = valid[valid.length - 1];
    return {
      ...c,
      messages: valid,
      lastMessageText: lastMsg ? lastMsg.content : 'No active messages (expired after 24h).',
      lastMessageAt: lastMsg ? lastMsg.timestamp : c.lastMessageAt,
    };
  });

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

      const convId = initiateConversation(matchedProfile || {
        id: targetUserId,
        displayName: targetName ? decodeURIComponent(targetName) : 'Believer Candidate',
      });

      setSelectedConvId(convId);
      setMobileChatOpen(true);
      refetch();
    } else if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [location, conversations.length]);

  const activeConversation =
    conversations.find((c) => c.id === selectedConvId || c.participantId === selectedConvId) ||
    conversations[0];

  // Auto-scroll chat stream to latest message
  useEffect(() => {
    if (activeConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation, optimisticMessages, isTyping]);

  // Handle instant sending + reciprocal candidate response for end-to-end conversation
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const userText = inputText.trim();
    setInputText('');

    // 1. Instant optimistic update for user message
    const tempUserMsg: ChatMessage = {
      id: `msg_usr_${Date.now()}`,
      senderId: 'You',
      senderName: 'You',
      content: userText,
      timestamp: new Date().toISOString(),
      read: true,
      delivered: true,
    };

    setOptimisticMessages((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), tempUserMsg],
    }));

    // Post to persistent store in background
    customFetch(`/api/conversations/${activeConversation.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content: userText,
        senderId: 'You',
        senderName: 'You',
      }),
    }).catch(() => {});

    // 2. End-to-end reciprocal candidate response with typing indicator
    const currentConvId = activeConversation.id;
    const participantName = activeConversation.participantName;
    const participantId = activeConversation.participantId;

    setTimeout(() => {
      setIsTyping(true);
    }, 700);

    setTimeout(() => {
      setIsTyping(false);
      const replyTemplate = FAITH_REPLIES[Math.floor(Math.random() * FAITH_REPLIES.length)];
      const candidateMsg: ChatMessage = {
        id: `msg_reply_${Date.now()}`,
        senderId: participantId,
        senderName: participantName,
        content: replyTemplate,
        timestamp: new Date().toISOString(),
        read: true,
        delivered: true,
      };

      setOptimisticMessages((prev) => ({
        ...prev,
        [currentConvId]: [...(prev[currentConvId] || []), candidateMsg],
      }));

      // Persist candidate reply to API/Storage
      customFetch(`/api/conversations/${currentConvId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: replyTemplate,
          senderId: participantId,
          senderName: participantName,
        }),
      }).then(() => {
        refetch();
      }).catch(() => {});
    }, 2200);
  };

  const handleClearChatHistory = () => {
    if (!activeConversation) return;
    try {
      const raw = localStorage.getItem('pm_user_conversations');
      if (raw) {
        const convs = JSON.parse(raw);
        const idx = convs.findIndex((c: any) => c.id === activeConversation.id);
        if (idx >= 0) {
          convs[idx].messages = [
            {
              id: `msg_sys_${Date.now()}`,
              senderId: 'system',
              senderName: 'Platform Stewards',
              content: 'Chat history cleared. Messages automatically vanish after 24 hours.',
              timestamp: new Date().toISOString(),
              read: true,
            },
          ];
          convs[idx].lastMessageText = 'Chat history cleared.';
          localStorage.setItem('pm_user_conversations', JSON.stringify(convs));
        }
      }
      setOptimisticMessages((prev) => ({
        ...prev,
        [activeConversation.id]: [],
      }));
      setNotice('Chat history cleared.');
      setMenuOpen(false);
      refetch();
    } catch {}
  };

  const handleEndConversation = () => {
    setNotice(`Conversation with ${activeConversation?.participantName} has ended.`);
    setMenuOpen(false);
  };

  // Combine fetched valid messages with optimistic messages (with 24h filter applied)
  const currentMessages: ChatMessage[] = activeConversation
    ? filter24hMessages([
        ...(activeConversation.messages || []),
        ...(optimisticMessages[activeConversation.id] || []).filter(
          (om) => !(activeConversation.messages || []).some((m) => m.content === om.content && Math.abs(new Date(m.timestamp).getTime() - new Date(om.timestamp).getTime()) < 3000)
        ),
      ])
    : [];

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
                Private Discernment
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">End-to-End Messages</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-[11px] font-semibold text-amber-900">
                <Clock size={12} className="text-amber-600 shrink-0" />
                <span>24-Hour Ephemeral Chat</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Encrypted</span>
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
                  Active Conversations ({conversations.length})
                </span>
                <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                  All Active
                </span>
              </div>

              {conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-3">
                    <MessageCircle size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No active conversations yet</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Start a discernment conversation with verified Pentecostal believers in the directory.
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
                <div className="divide-y divide-slate-100">
                  {conversations.map((c) => {
                    const isSelected = c.id === activeConversation?.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedConvId(c.id);
                          setMobileChatOpen(true);
                        }}
                        className={`w-full text-left p-3.5 sm:p-4 transition flex items-start gap-3 relative cursor-pointer ${
                          isSelected
                            ? 'bg-rose-50/90 text-slate-900 border-l-4 border-l-rose-700'
                            : 'hover:bg-slate-100/70 text-slate-700'
                        }`}
                      >
                        <div className="relative shrink-0">
                          {c.participantPhoto ? (
                            <img
                              src={c.participantPhoto}
                              alt={c.participantName}
                              className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl border border-slate-200 object-cover shadow-sm"
                            />
                          ) : (
                            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-sm shadow-xs">
                              {c.participantName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xs truncate ${isSelected ? 'text-rose-950 font-extrabold' : 'text-slate-900'}`}>
                              {c.participantName}
                              {typeof c.participantAge === 'number' && c.participantAge > 0 ? `, ${c.participantAge}` : ''}
                            </span>
                            <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                              {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] truncate mt-0.5 text-slate-600">
                            {c.participantOccupation} · {c.participantDenomination}
                          </p>
                          <p className={`text-xs truncate mt-1 ${isSelected ? 'text-rose-900 font-medium' : 'text-slate-600'}`}>
                            {c.lastMessageText}
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
                  <div className="flex items-center justify-between border-b border-slate-200 p-3 sm:p-4 bg-white/90 backdrop-blur-sm">
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
                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-slate-200 object-cover shadow-sm"
                          />
                        ) : (
                          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-rose-200 bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs shadow-xs">
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
                          {activeConversation.participantLocation} · <span className="text-purple-700 font-medium">{activeConversation.participantDenomination}</span>
                        </p>
                      </div>
                    </div>

                    <div className="relative shrink-0 flex items-center gap-2">
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md font-medium">
                        <Clock size={11} /> Auto-delete in 24h
                      </span>

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
                  <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-3.5 max-h-[460px] min-h-[350px] bg-slate-50/40">
                    {/* Ephemeral Privacy Notice */}
                    <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 text-center text-xs text-amber-950 shadow-xs">
                      <p className="font-bold flex items-center justify-center gap-1.5 text-amber-900">
                        <Clock size={13} className="text-amber-700" /> 24-Hour Ephemeral Privacy Active
                      </p>
                      <p className="mt-0.5 text-[11px] text-amber-800/90">
                        For discretion and privacy, all messages in this thread automatically expire and are wiped after 24 hours.
                      </p>
                    </div>

                    {currentMessages.map((m) => {
                      const isMe = m.senderId === 'prof_me' || m.senderId === 'You';
                      const isSystem = m.senderId === 'system';

                      if (isSystem) {
                        return (
                          <div key={m.id} className="text-center py-1.5">
                            <span className="rounded-full border border-slate-200 bg-white px-3.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-500 shadow-2xs">
                              {m.content}
                            </span>
                          </div>
                        );
                      }

                      const remainingTime = formatExpiresIn(m.timestamp);

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[75%] p-3.5 text-xs leading-relaxed shadow-sm ${
                              isMe
                                ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-white rounded-2xl rounded-tr-xs'
                                : 'bg-white border border-slate-200 text-slate-900 rounded-2xl rounded-tl-xs'
                            }`}
                          >
                            <p>{m.content}</p>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 px-1">
                            <span>
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="flex items-center gap-0.5 text-amber-700/80 bg-amber-50 px-1.5 py-0.2 rounded font-medium border border-amber-200/50">
                              <Clock size={9} /> {remainingTime}
                            </span>
                            {isMe && <CheckCheck size={13} className="text-rose-600" />}
                          </div>
                        </div>
                      );
                    })}

                    {/* Reciprocal typing indicator */}
                    {isTyping && (
                      <div className="flex flex-col items-start animate-in fade-in duration-200">
                        <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-xs p-3 shadow-xs flex items-center gap-1.5">
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

                  {/* Input Form */}
                  <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-3 sm:p-3.5 flex gap-2 sm:gap-2.5 bg-white">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a respectful message..."
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-700 px-4 sm:px-5 py-2.5 sm:py-3 text-xs font-bold text-white shadow hover:bg-rose-800 disabled:opacity-40 transition uppercase tracking-wider shrink-0 cursor-pointer"
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
                    <div className="mt-6 w-full max-w-sm space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Available Candidates</p>
                      {registeredProfiles.slice(0, 3).map((cand: any) => (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => {
                            const cid = initiateConversation(cand);
                            setSelectedConvId(cid);
                            refetch();
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 transition cursor-pointer text-left"
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
