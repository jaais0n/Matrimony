/**
 * Vercel Serverless Function: /api/conversations
 * Real-time messaging and conversation synchronization backed by Neon PostgreSQL.
 * Persistent chat history like WhatsApp.
 */

import { readStore, writeStore } from '../_lib/db-store.js';

function cleanIdKey(id) {
  return String(id || '').trim().toLowerCase()
    .replace(/^prof_user_/, '')
    .replace(/^prof_/, '')
    .replace(/^user_/, '');
}

/**
 * Checks if a given user is a participant in a conversation.
 * Works for both legacy conv IDs and deterministic conv_user1_user2 IDs.
 */
function userIsParticipant(conv, cleanUser) {
  if (!cleanUser) return false;
  const pClean = cleanIdKey(conv.participantId || '');
  const creatorClean = cleanIdKey(conv.creatorId || '');
  if (pClean === cleanUser || creatorClean === cleanUser) return true;
  // For deterministic IDs like conv_john_sura, check parts
  const cId = (conv.id || '').toLowerCase();
  const convParts = cId.replace(/^conv_/, '').split('_');
  return convParts.includes(cleanUser);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const store = await readStore();
  if (!Array.isArray(store.conversations)) {
    store.conversations = [];
  }

  const { id: queryId, action, userId } = req.query || {};
  const currentUserId = userId || req.headers['x-user-id'] || '';

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    if (queryId) {
      const conv = store.conversations.find((c) => c.id === queryId);
      if (conv) { res.status(200).json(conv); } else { res.status(404).json({ error: 'Not found' }); }
      return;
    }
    if (currentUserId) {
      const cleanUser = cleanIdKey(currentUserId);
      const userConvs = store.conversations.filter((c) => userIsParticipant(c, cleanUser));
      res.status(200).json(userConvs);
      return;
    }
    res.status(200).json(store.conversations);
    return;
  }

  if (req.method === 'POST') {
    const body = req.body || {};

    if (action === 'message' || queryId || body.conversationId) {
      const convId = queryId || body.conversationId;
      let targetIndex = store.conversations.findIndex((c) => c.id === convId);

      const newMsg = {
        id: body.id || msg__,
        senderId: body.senderId || 'You',
        senderName: body.senderName || 'You',
        content: body.content || '',
        timestamp: body.timestamp || new Date().toISOString(),
        read: false,
        delivered: true,
      };

      if (!newMsg.content) { res.status(400).json({ error: 'Message content required' }); return; }

      // Auto-create conversation if it does not exist (prevents silent message loss)
      if (targetIndex < 0 && convId) {
        store.conversations.unshift({
          id: convId,
          creatorId: body.senderId || currentUserId || '',
          participantId: body.recipientId || '',
          participantName: body.recipientName || 'Believer Candidate',
          participantAge: body.recipientAge || 28,
          participantLocation: body.recipientLocation || 'India',
          participantPhoto: body.recipientPhoto || '',
          participantOccupation: 'Professional',
          participantDenomination: 'Pentecostal',
          status: 'active',
          lastMessageText: newMsg.content,
          lastMessageAt: newMsg.timestamp,
          unreadCount: 0,
          messages: [],
        });
        targetIndex = 0;
      }

      if (targetIndex >= 0) {
        const conv = store.conversations[targetIndex];
        const alreadyExists = (conv.messages || []).some((m) => m.id === newMsg.id);
        if (!alreadyExists) {
          conv.messages = Array.isArray(conv.messages) ? [...conv.messages, newMsg] : [newMsg];
          conv.lastMessageText = newMsg.content;
          conv.lastMessageAt = newMsg.timestamp;
          store.conversations[targetIndex] = conv;
          await writeStore(store);
        }
        res.status(200).json(newMsg);
      } else {
        res.status(404).json({ error: 'Conversation not found' });
      }
      return;
    }

    const participantId = body.participantId || user_;
    const convId = body.id || conv__;

    const existingIndex = store.conversations.findIndex((c) => {
      if (c.id === convId) return true;
      const cC = cleanIdKey(c.creatorId || ''); const cP = cleanIdKey(c.participantId || '');
      const bC = cleanIdKey(body.creatorId || currentUserId || ''); const bP = cleanIdKey(participantId);
      return (cC === bC && cP === bP) || (cC === bP && cP === bC);
    });

    if (existingIndex >= 0) { res.status(200).json(store.conversations[existingIndex]); return; }

    const newConv = {
      id: convId,
      creatorId: body.creatorId || currentUserId || '',
      participantId,
      participantName: body.participantName || 'Believer Candidate',
      participantAge: body.participantAge || 28,
      participantLocation: body.participantLocation || 'India',
      participantPhoto: body.participantPhoto || '',
      participantOccupation: body.participantOccupation || 'Professional',
      participantDenomination: body.participantDenomination || 'Pentecostal',
      status: 'active',
      lastMessageText: 'No messages yet.',
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      messages: [],
    };

    store.conversations.unshift(newConv);
    await writeStore(store);
    res.status(200).json(newConv);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
