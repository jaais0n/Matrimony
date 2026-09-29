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
  // For deterministic IDs like conv_john_sura, check exact token match in split parts
  const cId = (conv.id || '').toLowerCase();
  const convParts = cId.replace(/^conv_/, '').split('_');
  if (convParts.includes(cleanUser)) return true;
  // If user sent any message in this conversation
  if (Array.isArray(conv.messages) && conv.messages.some((m) => cleanIdKey(m.senderId) === cleanUser)) {
    return true;
  }
  return false;
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
      if (conv) {
        // Enforce participant check on single conversation fetch if currentUserId is provided
        if (currentUserId && !userIsParticipant(conv, cleanIdKey(currentUserId))) {
          res.status(403).json({ error: 'Access denied: You are not a participant in this conversation.' });
          return;
        }
        res.status(200).json(conv);
      } else {
        res.status(404).json({ error: 'Not found' });
      }
      return;
    }
    if (currentUserId) {
      const cleanUser = cleanIdKey(currentUserId);
      const userConvs = store.conversations
        .filter((c) => userIsParticipant(c, cleanUser))
        .map((c) => {
          const pClean = cleanIdKey(c.participantId || '');
          const cClean = cleanIdKey(c.creatorId || '');
          // If the requester is participantId, invert so requester sees creator as participant
          if (pClean === cleanUser && cClean && cClean !== cleanUser) {
            const creatorProf = (store.profiles || []).find((p) => cleanIdKey(p.userId || p.id) === cClean);
            return {
              ...c,
              participantId: c.creatorId,
              participantName: c.creatorName || creatorProf?.displayName || 'Believer Candidate',
              participantPhoto: c.creatorPhoto || (creatorProf?.photos?.[0]?.url || creatorProf?.primaryPhotoUrl) || '',
              participantAge: creatorProf?.age || c.participantAge || 28,
              participantLocation: (creatorProf?.location ? [creatorProf.location, creatorProf.country].filter(Boolean).join(', ') : '') || c.participantLocation || 'India',
              participantOccupation: creatorProf?.occupation || c.participantOccupation || 'Professional',
              participantDenomination: creatorProf?.denomination || c.participantDenomination || 'Pentecostal',
            };
          }
          return c;
        });
      res.status(200).json(userConvs);
      return;
    }
    // Never expose all conversations when user context is absent
    res.status(200).json([]);
    return;
  }

  if (req.method === 'POST') {
    const body = req.body || {};

    if (action === 'clear' || action === 'clear_messages') {
      const convId = queryId || body.conversationId || body.id;
      const targetIndex = store.conversations.findIndex((c) => c.id === convId);
      if (targetIndex >= 0) {
        store.conversations[targetIndex].messages = [];
        store.conversations[targetIndex].lastMessageText = 'Chat history cleared.';
        await writeStore(store);
      }
      res.status(200).json({ success: true, clearedId: convId });
      return;
    }

    if (action === 'message' || queryId || body.conversationId) {
      const convId = queryId || body.conversationId;
      let targetIndex = store.conversations.findIndex((c) => c.id === convId);

      const newMsg = {
        id: body.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
          creatorName: body.senderName || '',
          creatorPhoto: body.senderPhoto || '',
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
        // Populate creator name/photo if missing
        if (body.senderId && cleanIdKey(body.senderId) === cleanIdKey(conv.creatorId)) {
          if (body.senderName && !conv.creatorName) conv.creatorName = body.senderName;
          if (body.senderPhoto && !conv.creatorPhoto) conv.creatorPhoto = body.senderPhoto;
        }
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

    const participantId = body.participantId || `user_${Date.now()}`;
    const convId = body.id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

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
      creatorName: body.creatorName || body.senderName || '',
      creatorPhoto: body.creatorPhoto || body.senderPhoto || '',
      participantId,
      participantName: body.participantName || 'Believer Candidate',
      participantAge: body.recipientAge || body.participantAge || 28,
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

  if (req.method === 'DELETE') {
    const { id: deleteId, all, participantId: queryPartId } = req.query || {};
    const convId = deleteId || queryId || (req.body && (req.body.id || req.body.conversationId));
    const targetPartId = queryPartId || (req.body && (req.body.participantId || req.body.targetUserId));
    const cleanUser = cleanIdKey(currentUserId);
    const cleanTarget = cleanIdKey(targetPartId);

    if (all === 'true' || all === true) {
      if (!currentUserId) {
        res.status(401).json({ error: 'User ID required to clear conversations' });
        return;
      }
      store.conversations = (store.conversations || []).filter((c) => !userIsParticipant(c, cleanUser));
      await writeStore(store);
      res.status(200).json({ success: true, count: 0, items: [] });
      return;
    }

    if (!convId && !cleanTarget) {
      res.status(400).json({ error: 'Conversation id or participantId is required for deletion' });
      return;
    }

    // Helper to check if a conversation involves this exact pair of users
    const involvesPair = (c, u1, u2) => {
      if (!u1 || !u2) return false;
      const cC = cleanIdKey(c.creatorId || '');
      const cP = cleanIdKey(c.participantId || '');
      if ((cC === u1 && cP === u2) || (cC === u2 && cP === u1)) return true;
      const cId = (c.id || '').toLowerCase();
      if (cId.includes(u1) && cId.includes(u2)) return true;
      return false;
    };

    // Extract deterministic tokens from convId if present (e.g. conv_userA_userB)
    let convTokens = [];
    if (convId && convId.startsWith('conv_')) {
      convTokens = convId.replace(/^conv_/, '').split('_').filter(Boolean);
    }

    const beforeCount = (store.conversations || []).length;
    store.conversations = (store.conversations || []).filter((c) => {
      // 1. Direct ID match
      if (convId && c.id === convId) return false;
      // 2. Both participants match requested deletion pair
      if (cleanUser && cleanTarget && involvesPair(c, cleanUser, cleanTarget)) return false;
      // 3. Tokens in deterministic ID match both participants
      if (convTokens.length >= 2) {
        const cId = (c.id || '').toLowerCase();
        if (convTokens.every((t) => cId.includes(t))) return false;
        const c1 = cleanIdKey(c.creatorId || '');
        const c2 = cleanIdKey(c.participantId || '');
        if (convTokens.includes(c1) && convTokens.includes(c2)) return false;
      }
      return true;
    });

    await writeStore(store);
    res.status(200).json({
      success: true,
      deletedId: convId,
      purgedCount: beforeCount - store.conversations.length,
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
