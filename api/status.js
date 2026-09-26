import { list } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let blobCount = 0;
  let blobError = null;

  try {
    const result = await list({ prefix: 'pm-profiles-store' });
    blobCount = (result && result.blobs) ? result.blobs.length : 0;
  } catch (e) {
    blobError = e.message || String(e);
  }

  res.status(200).json({
    status: 'ok',
    serverless: true,
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    storeBlobsCount: blobCount,
    blobError,
    timestamp: new Date().toISOString(),
  });
}


