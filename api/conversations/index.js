/**
 * Vercel Serverless Function: /api/conversations
 * Real-time messaging and conversation synchronization backed by Neon PostgreSQL.
 */

import { readStore, writeStore } from '../_lib/db-store.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const store = await readStore();
  if (!Array.isArray(store.conversations)) {
    store.conversations = [];
  }

  const { id: queryId, action } = req.query || {};

  // GET /api/conversations
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
    if (queryId) {
      const conv = store.conversations.find((c) => c.id === queryId);
      if (conv) {
        res.status(200).json(conv);
      } else {
        res.status(404).json({ error: 'Conversation not found' });
      }
      return;
    }
    res.status(200).json(store.conversations);
    return;
  }

  // POST /api/conversations or POST /api/conversations?action=message
  if (req.method === 'POST') {
    const body = req.body || {};

    // Message appending to an existing conversation
    if (action === 'message' || queryId || body.conversationId) {
      const convId = queryId || body.conversationId;
      const targetIndex = store.conversations.findIndex((c) => c.id === convId);
      const newMsg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderId: body.senderId || 'You',
        senderName: body.senderName || 'You',
        content: body.content || '',
        timestamp: new Date().toISOString(),
        read: true,
      };

      if (targetIndex >= 0) {
        const conv = store.conversations[targetIndex];
        conv.messages = Array.isArray(conv.messages) ? [...conv.messages, newMsg] : [newMsg];
        conv.lastMessageText = newMsg.content;
        conv.lastMessageAt = newMsg.timestamp;
        store.conversations[targetIndex] = conv;
      }
      await writeStore(store);
      res.status(200).json(newMsg);
      return;
    }

    // Creating or upserting a conversation
    const participantId = body.participantId || `user_${Date.now()}`;
    const convId = body.id || `conv_${participantId}`;
    const existingIndex = store.conversations.findIndex(
      (c) => c.id === convId || c.participantId === participantId
    );

    if (existingIndex >= 0) {
      res.status(200).json(store.conversations[existingIndex]);
      return;
    }

    const newConv = {
      id: convId,
      participantId,
      participantName: body.participantName || 'Believer Candidate',
      participantAge: body.participantAge || 28,
      participantLocation: body.participantLocation || 'India',
      participantPhoto: body.participantPhoto || '',
      participantOccupation: body.participantOccupation || 'Professional',
      participantDenomination: body.participantDenomination || 'Assemblies of God',
      status: 'active',
      lastMessageText: body.initialMessage || 'Started a conversation in faith.',
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      messages: [
        {
          id: `msg_${Date.now()}`,
          senderId: 'system',
          senderName: 'Platform Stewards',
          content: 'Mutual connection confirmed. Grace and peace to you both in Christ.',
          timestamp: new Date().toISOString(),
          read: true,
        },
      ],
    };

    store.conversations.unshift(newConv);
    await writeStore(store);
    res.status(200).json(newConv);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
