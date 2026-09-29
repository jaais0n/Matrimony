/**
 * Vercel Serverless Function: /api/reports
 * Authentic user-generated moderation reports stored in Neon PostgreSQL.
 * ZERO dummy reports. Real member reports only.
 */

import { readStore, writeStore } from '../_lib/db-store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const store = await readStore();
  if (!Array.isArray(store.reports)) {
    store.reports = [];
  }

  // GET /api/reports — return all real reports (never dummy)
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const cleanReports = (store.reports || []).filter(
      (r) => r && r.reporterName !== 'Pastor Thomas' && r.id !== 'rep_1' && r.reporterName !== 'Pastor Council'
    );
    res.status(200).json(cleanReports);
    return;
  }

  // POST /api/reports — submit a real report or update an existing report action
  if (req.method === 'POST') {
    const body = req.body || {};
    const { action, reportId: actionReportId, id: actionId } = body;
    const targetId = actionReportId || actionId || req.query?.id;

    // Action handling (dismiss or resolve)
    if (action && targetId) {
      store.reports = (store.reports || []).map((r) =>
        r.id === targetId ? { ...r, status: action === 'dismissed' ? 'dismissed' : 'resolved' } : r
      );
      await writeStore(store);
      res.status(200).json({ success: true, id: targetId, status: action });
      return;
    }

    // New report submission
    const reportedProfileName = body.reportedProfileName || body.targetProfileName || 'Reported Profile';
    const reason = body.reason || 'General Concern';
    const details = body.details || '';
    const reporterName = body.reporterName || 'Concerned Believer';

    // Disallow synthetic dummy reports
    if (reporterName === 'Pastor Thomas' || body.id === 'rep_1') {
      res.status(200).json({ ignored: true });
      return;
    }

    const reportId = body.id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newReport = {
      id: reportId,
      reportedProfileId: body.reportedProfileId || body.profileId || '',
      reportedProfileName: reportedProfileName.trim(),
      reporterId: body.reporterId || '',
      reporterName: reporterName.trim(),
      reporterEmail: body.reporterEmail || '',
      reason: reason.trim(),
      details: details.trim(),
      createdAt: body.createdAt || new Date().toISOString(),
      status: body.status || 'open',
    };

    const cleanExisting = (store.reports || []).filter((r) => r && r.reporterName !== 'Pastor Thomas' && r.id !== 'rep_1');
    const repProf = newReport.reportedProfileName.toLowerCase();
    const repUser = newReport.reporterName.toLowerCase();
    const repReason = newReport.reason.toLowerCase();

    const existingIdx = cleanExisting.findIndex(
      (r) =>
        r.id === reportId ||
        (String(r.reportedProfileName || '').trim().toLowerCase() === repProf &&
          String(r.reporterName || '').trim().toLowerCase() === repUser &&
          String(r.reason || '').trim().toLowerCase() === repReason)
    );

    if (existingIdx >= 0) {
      cleanExisting[existingIdx] = { ...cleanExisting[existingIdx], ...newReport };
      store.reports = cleanExisting;
      await writeStore(store);
      res.status(200).json(cleanExisting[existingIdx]);
      return;
    }

    store.reports = [newReport, ...cleanExisting];
    await writeStore(store);

    res.status(201).json(newReport);
    return;
  }

  // PATCH /api/reports — update report status
  if (req.method === 'PATCH') {
    const { id, status } = req.body || {};
    if (!id) {
      res.status(400).json({ error: 'Missing report id' });
      return;
    }
    store.reports = (store.reports || []).map((r) =>
      r.id === id ? { ...r, status: status || 'resolved' } : r
    );
    await writeStore(store);
    res.status(200).json({ success: true, id, status });
    return;
  }

  // DELETE /api/reports — admin delete single report by ?id= or wipe all
  if (req.method === 'DELETE') {
    const { id, all } = req.query || {};
    if (all === 'true') {
      store.reports = [];
    } else if (id) {
      store.reports = (store.reports || []).filter((r) => r.id !== id);
    } else {
      store.reports = [];
    }
    await writeStore(store);
    res.status(200).json({ success: true, message: 'Report deleted.' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
