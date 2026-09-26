import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Ban, CheckCheck, Flag, MoreVertical, Send, ShieldAlert, User, X } from 'lucide-react';
import { customFetch } from '@workspace/api-client-react';
import type { Conversation, ChatMessage } from '../types';
import { ReportModal } from '../components/ui/ReportModal';
import { BlockModal } from '../components/ui/BlockModal';

export function MessagesPage() {
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Record<string, ChatMessage[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], refetch } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => customFetch('/api/conversations'),
  });

  // Handle ?user= and ?name= params from Profile Cards / Details
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('user');
    const targetName = params.get('name');

    if (targetUserId) {
      const existing = conversations.find(
        (c) => c.participantId === targetUserId || c.id === targetUserId || c.id === `conv_${targetUserId}`
      );
      if (existing) {
        setSelectedConvId(existing.id);
        setMobileChatOpen(true);
      } else {
        let photo = '';
        let occ = 'Professional';
        let denom = 'Pentecostal';
        let age = 28;
        let loc = 'India';
        try {
          const raw = localStorage.getItem('pm_registered_profiles');
          const profiles = raw ? JSON.parse(raw) : [];
          const matched = profiles.find((p: any) => p.id === targetUserId || p.userId === targetUserId);
          if (matched) {
            photo = matched.photos && matched.photos[0] ? matched.photos[0].url : '';
            occ = matched.occupation || 'Professional';
            denom = matched.denomination || 'Pentecostal';
            age = matched.age || 28;
            loc = [matched.location, matched.country].filter(Boolean).join(', ') || 'India';
          }
        } catch {}

        customFetch('/api/conversations', {
          method: 'POST',
          body: JSON.stringify({
            participantId: targetUserId,
            participantName: targetName ? decodeURIComponent(targetName) : 'Believer Candidate',
            participantPhoto: photo,
            participantOccupation: occ,
            participantDenomination: denom,
            participantAge: age,
            participantLocation: loc,
          }),
        }).then(() => {
          setSelectedConvId(`conv_${targetUserId}`);
          setMobileChatOpen(true);
          refetch();
        });
      }
    } else if (conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === selectedConvId) || conversations[0];

  // Auto-scroll chat stream to latest message
  useEffect(() => {
    if (activeConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation, optimisticMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const text = inputText.trim();
    setInputText('');

    // Instant optimistic update with zero lag
    const tempMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      senderId: 'You',
      senderName: 'You',
      content: text,
      timestamp: new Date().toISOString(),
      read: true,
      delivered: true,
    };

    setOptimisticMessages((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), tempMsg],
    }));

    // Trigger API call immediately in background
    customFetch(`/api/conversations/${activeConversation.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: text }),
    }).then(() => {
      refetch();
    }).catch(() => {
      // Local sync is already persisted via mock-handler
    });
  };

  const handleEndConversation = () => {
    setNotice(`Conversation with ${activeConversation?.participantName} has ended.`);
    setMenuOpen(false);
  };

  // Combine fetched messages with optimistic messages seamlessly
  const currentMessages: ChatMessage[] = activeConversation
    ? [
        ...(activeConversation.messages || []),
        ...(optimisticMessages[activeConversation.id] || []).filter(
          (om) => !(activeConversation.messages || []).some((m) => m.content === om.content && Math.abs(new Date(m.timestamp).getTime() - new Date(om.timestamp).getTime()) < 5000)
        ),
      ]
    : [];

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
          <div className="border-b border-slate-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-rose-50/60 via-amber-50/40 to-white">
            <div>
              <span className="inline-block rounded-full bg-rose-100/70 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 uppercase tracking-wider mb-1">
                Private Discernment
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">Mutual Connections Messaging</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> End-to-End Encrypted
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[540px]">
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
                <div className="p-8 text-center text-xs text-slate-500">
                  No active conversations yet. When interest is mutually accepted, private messaging begins here.
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
                  <div className="flex items-center justify-between border-b border-slate-200 p-3.5 sm:p-4 bg-white/90 backdrop-blur-sm">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {/* Mobile Back Button to conversation list */}
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

                    <div className="relative shrink-0">
                      <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition"
                        aria-label="Conversation Options"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {menuOpen && (
                        <div className="absolute right-0 top-11 z-30 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg text-xs">
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
                  <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-4 max-h-[460px] min-h-[350px] bg-slate-50/40">
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-center text-xs text-amber-900 shadow-xs">
                      <p className="font-bold text-amber-950">Mutual Connection Confirmed</p>
                      <p className="mt-0.5 text-[11px] text-amber-800/90">
                        Please communicate with Christian courtesy, prayerful discernment, and mutual respect.
                      </p>
                    </div>

                    {currentMessages.map((m) => {
                      const isMe = m.senderId === 'prof_me' || m.senderId === 'You';
                      const isSystem = m.senderId === 'system';

                      if (isSystem) {
                        return (
                          <div key={m.id} className="text-center py-2">
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
                            className={`max-w-[82%] sm:max-w-[75%] p-3 sm:p-3.5 text-xs leading-relaxed shadow-sm ${
                              isMe
                                ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-white rounded-2xl rounded-tr-xs'
                                : 'bg-white border border-slate-200 text-slate-900 rounded-2xl rounded-tl-xs'
                            }`}
                          >
                            <p>{m.content}</p>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span>
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && <CheckCheck size={13} className="text-rose-600" />}
                          </div>
                        </div>
                      );
                    })}
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
                <div className="flex h-full items-center justify-center p-8 text-center text-xs text-slate-400">
                  Select an active conversation to view messages.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
