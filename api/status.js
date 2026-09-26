import { list, put } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let blobList = [];
  let blobError = null;
  let putTest = null;

  try {
    const result = await list();
    blobList = result.blobs.map(b => ({ pathname: b.pathname, url: b.url, size: b.size, uploadedAt: b.uploadedAt }));
  } catch (e) {
    blobError = e.message || String(e);
  }

  if (req.query && req.query.testPut === '1') {
    try {
      const putRes = await put('pm-test-blob.json', JSON.stringify({ test: true }), {
        access: 'public',
        addRandomSuffix: true
      });
      putTest = { success: true, url: putRes.url };
    } catch (e) {
      putTest = { success: false, error: e.message || String(e) };
    }
  }

  res.status(200).json({
    status: 'ok',
    serverless: true,
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    blobList,
    blobError,
    putTest,
    timestamp: new Date().toISOString(),
  });
}

